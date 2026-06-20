/**
 * lib/tenant-quota — per-tenant action quotas via Redis counters.
 *
 * Phase 8 — multi-tenant operational controls. The platform previously had
 * no server-side guard against a single noisy tenant flooding scan / action
 * endpoints. Even with idempotency keys, an attacker (or a buggy
 * integration) firing 100 distinct scan requests in parallel would burn
 * upstream capacity that other tenants share.
 *
 * Design:
 *   - Each action class has a quota config: `{ key, limit, windowSec }`.
 *   - acquireQuota() does an atomic INCR + EXPIRE on a per-tenant key
 *     (`tricognita:quota:{action}:{tenantId}`). If the resulting counter
 *     exceeds `limit`, the call returns { ok: false, retryAfter }.
 *   - releaseQuota() decrements the counter (used by long-running actions
 *     to free a slot when complete; short actions can let the TTL expire
 *     naturally).
 *   - When Redis is unavailable, the quota guard FAILS OPEN. This is
 *     deliberate: a Redis outage shouldn't take the platform down. The
 *     trade-off is acceptable because (a) Redis outages are rare and
 *     bounded, (b) the JIT-token TTL and Go backend's own rate limit
 *     (50k limiter cap in api/main.go) catch the abuse window.
 *
 * Future:
 *   - Add a soft-warning threshold (80% of quota) for proactive UI notice.
 *   - Wire metrics to the Operations admin surface for ADMIN visibility.
 */

import { Redis } from "@upstash/redis";

export interface QuotaConfig {
  /** Short slug — used in the Redis key and log lines. */
  action: string;
  /** Maximum concurrent / in-window requests per tenant. */
  limit: number;
  /** Counter expiry in seconds — after this, the counter is reset. */
  windowSec: number;
}

export interface QuotaResult {
  ok: boolean;
  /** Current counter value AFTER the attempted increment. */
  current: number;
  /** When ok=false, hint at how long to wait before retrying. */
  retryAfter?: number;
}

// Canonical configs. Tune per action class.
export const SCAN_QUOTA: QuotaConfig = {
  action: "scan",
  limit: 3,        // 3 concurrent scans per tenant
  windowSec: 60,   // 1-minute window — assumes scan takes <60s
};

export const REMEDIATE_QUOTA: QuotaConfig = {
  action: "remediate",
  limit: 10,       // 10 concurrent remediations per tenant
  windowSec: 60,
};

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

function keyFor(action: string, tenantId: string): string {
  return `tricognita:quota:${action}:${tenantId}`;
}

/**
 * acquireQuota — attempts to take a slot for the given tenant. Returns
 * ok=true and the post-increment counter value when within limit. Returns
 * ok=false with retryAfter when exceeded. Fails OPEN if Redis is down.
 *
 * The counter is set to expire after `windowSec`, so an orphaned counter
 * (caller crashed before releaseQuota) self-heals within one window.
 */
export async function acquireQuota(
  cfg: QuotaConfig,
  tenantId: string,
): Promise<QuotaResult> {
  const redis = getRedis();
  if (!redis) {
    // Fail open — Redis outage shouldn't take the platform down.
    return { ok: true, current: 0 };
  }
  try {
    const key = keyFor(cfg.action, tenantId);
    const current = await redis.incr(key);
    if (current === 1) {
      // First entry — set TTL.
      await redis.expire(key, cfg.windowSec);
    }
    if (current > cfg.limit) {
      // Over limit — back off the counter and report quota exceeded.
      // (We could leave it incremented and rely on TTL, but decrementing
      // lets a slot free up immediately when a parallel call completes.)
      await redis.decr(key);
      // Re-read the TTL for the retry hint.
      const ttl = await redis.ttl(key).catch(() => cfg.windowSec);
      return {
        ok: false,
        current: cfg.limit,
        retryAfter: typeof ttl === "number" && ttl > 0 ? ttl : cfg.windowSec,
      };
    }
    return { ok: true, current };
  } catch {
    // Fail open on Redis error.
    return { ok: true, current: 0 };
  }
}

/**
 * releaseQuota — frees a slot for the tenant. Called after a long-running
 * action completes (success or failure). Safe to call even if Redis is
 * down (no-op).
 */
export async function releaseQuota(
  cfg: QuotaConfig,
  tenantId: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const key = keyFor(cfg.action, tenantId);
    const next = await redis.decr(key);
    // Never let the counter go negative (defensive — shouldn't happen).
    if (typeof next === "number" && next < 0) {
      await redis.set(key, 0);
    }
  } catch {
    /* silent — quota release is best-effort */
  }
}

/**
 * peekQuota — read-only view of a tenant's current counter. Used by the
 * Operations admin surface to surface quota state without modifying it.
 */
export async function peekQuota(
  cfg: QuotaConfig,
  tenantId: string,
): Promise<{ current: number; limit: number; ttl: number | null }> {
  const redis = getRedis();
  if (!redis) return { current: 0, limit: cfg.limit, ttl: null };
  try {
    const key = keyFor(cfg.action, tenantId);
    const raw = await redis.get<string | number>(key);
    const current =
      typeof raw === "number" ? raw : raw ? parseInt(raw, 10) : 0;
    const ttl = await redis.ttl(key).catch(() => null);
    return {
      current: Number.isNaN(current) ? 0 : current,
      limit: cfg.limit,
      ttl: typeof ttl === "number" ? ttl : null,
    };
  } catch {
    return { current: 0, limit: cfg.limit, ttl: null };
  }
}

export interface TenantQuotaSnapshot {
  tenantId: string;
  current: number;
  limit: number;
  ttl: number | null;
}

/**
 * peekAllTenantsQuota — SCAN the Redis keyspace for every tenant's quota
 * counter under `tricognita:quota:{action}:*` and return the snapshots.
 *
 * Used by the platform-operator cross-tenant ops console (Phase 10) to
 * answer "which tenants are saturating their quota right now?" without a
 * Go API admin endpoint.
 *
 * Cost: SCAN is O(N) over the keyspace but Upstash REST SCAN caps at
 * 1000 keys per call. Tenants × actions is well under that ceiling at
 * any realistic scale (we're sizing for ~100 tenants × 4 action types).
 *
 * Returns sorted by `current` descending so the noisy tenants surface
 * at the top of the list.
 */
export async function peekAllTenantsQuota(
  cfg: QuotaConfig,
): Promise<TenantQuotaSnapshot[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const pattern = `tricognita:quota:${cfg.action}:*`;
    // Upstash REST SCAN returns [cursor, keys[]]. We iterate until cursor
    // returns "0" — typically one round-trip at our scale.
    const keys: string[] = [];
    let cursor = "0";
    do {
      const res = (await redis.scan(cursor, {
        match: pattern,
        count: 1000,
      })) as [string, string[]];
      cursor = res[0];
      keys.push(...res[1]);
      // Defensive cap — prevent runaway loop if upstream is misbehaving.
      if (keys.length > 5000) break;
    } while (cursor !== "0");

    if (keys.length === 0) return [];

    // Fetch values + TTLs in parallel. mget would be ideal but Upstash
    // doesn't guarantee atomicity across the TTL read anyway, so a
    // pipelined fetch is acceptable.
    const snaps = await Promise.all(
      keys.map(async (key) => {
        const tenantId = key.replace(`tricognita:quota:${cfg.action}:`, "");
        const [rawVal, ttl] = await Promise.all([
          redis.get<string | number>(key),
          redis.ttl(key).catch(() => null),
        ]);
        const current =
          typeof rawVal === "number" ? rawVal : rawVal ? parseInt(rawVal, 10) : 0;
        return {
          tenantId,
          current: Number.isNaN(current) ? 0 : current,
          limit: cfg.limit,
          ttl: typeof ttl === "number" ? ttl : null,
        };
      }),
    );
    snaps.sort((a, b) => b.current - a.current);
    return snaps;
  } catch {
    return [];
  }
}
