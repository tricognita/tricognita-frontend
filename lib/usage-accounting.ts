/**
 * lib/usage-accounting — tenant-scoped monthly usage counters.
 *
 * Phase 17 — revenue infrastructure. Counts user-visible billable
 * dimensions per tenant per month: scans, exports, webhooks delivered,
 * notifications fanned out, API calls. Separate from telemetry —
 * telemetry counts events for product analytics; usage accounting
 * counts the things a customer would see on an invoice.
 *
 * Why a separate module from lib/telemetry?
 *   - Different retention (telemetry rolls daily; usage is monthly).
 *   - Different consumers (telemetry feeds product decisions; usage
 *     feeds billing + plan-cap enforcement).
 *   - Different governance (usage is read by both customer and
 *     platform admin; telemetry is admin-only).
 *
 * Storage layout (Redis):
 *   tricognita:usage:{tenantId}:{yyyy-mm}:{dimension}    string counter
 *   tricognita:usage:{tenantId}:{yyyy-mm}:active_users   set, user_hash
 *   tricognita:usage:{tenantId}:storage_estimate         hash, set on derive
 *
 * Counters auto-expire after 13 months so we always have one month
 * of trailing history beyond the prior year. No long-lived state.
 *
 * Fail-open by construction: usage increments NEVER block a request.
 */

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

export type UsageDimension =
  | "scans"
  | "exports"
  | "webhooks_delivered"
  | "webhooks_failed"
  | "notifications"
  | "api_calls"
  | "incidents_declared"
  | "remediations_approved";

export const USAGE_DIMENSIONS: readonly UsageDimension[] = [
  "scans",
  "exports",
  "webhooks_delivered",
  "webhooks_failed",
  "notifications",
  "api_calls",
  "incidents_declared",
  "remediations_approved",
] as const;

const KEY_TTL_SECONDS = 13 * 30 * 24 * 60 * 60; // ~13 months

function ymKey(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function counterKey(tenantId: string, ym: string, dim: UsageDimension): string {
  return `tricognita:usage:${tenantId}:${ym}:${dim}`;
}

function usersKey(tenantId: string, ym: string): string {
  return `tricognita:usage:${tenantId}:${ym}:active_users`;
}

function tenantsKey(ym: string): string {
  return `tricognita:usage:active_tenants:${ym}`;
}

function emailHash(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ─── Increment ───────────────────────────────────────────────────────────────

export interface RecordUsageArgs {
  tenantId: string;
  dimension: UsageDimension;
  /** Optional user email so we can compute active-users count. */
  userEmail?: string;
  /** Amount to increment by. Defaults to 1. */
  amount?: number;
}

/**
 * recordUsage — atomic increment of a per-tenant per-month counter.
 * Also updates the active-tenants set for the month + (optionally)
 * the per-tenant active-users set.
 *
 * Returns the new counter value, or null when Redis unavailable.
 */
export async function recordUsage(args: RecordUsageArgs): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;
  const ym = ymKey();
  const amount = args.amount ?? 1;
  try {
    const [count] = await Promise.all([
      redis.incrby(counterKey(args.tenantId, ym, args.dimension), amount),
      redis.expire(counterKey(args.tenantId, ym, args.dimension), KEY_TTL_SECONDS),
      redis.sadd(tenantsKey(ym), args.tenantId),
      redis.expire(tenantsKey(ym), KEY_TTL_SECONDS),
      args.userEmail
        ? redis
            .sadd(usersKey(args.tenantId, ym), emailHash(args.userEmail))
            .then(() => redis.expire(usersKey(args.tenantId, ym), KEY_TTL_SECONDS))
        : Promise.resolve(),
    ]);
    return typeof count === "number" ? count : Number(count);
  } catch {
    return null;
  }
}

// ─── Read ────────────────────────────────────────────────────────────────────

export interface TenantUsageSummary {
  tenant_id: string;
  period: string; // yyyy-mm
  counters: Record<UsageDimension, number>;
  active_users: number;
}

/**
 * tenantUsage — returns the current-period usage summary for a tenant.
 * Missing counters are returned as zero so the consumer gets a complete
 * shape regardless of which dimensions have been touched.
 */
export async function tenantUsage(
  tenantId: string,
  period?: string,
): Promise<TenantUsageSummary> {
  const ym = period ?? ymKey();
  const empty: Record<UsageDimension, number> = {
    scans: 0,
    exports: 0,
    webhooks_delivered: 0,
    webhooks_failed: 0,
    notifications: 0,
    api_calls: 0,
    incidents_declared: 0,
    remediations_approved: 0,
  };
  const redis = getRedis();
  if (!redis) {
    return { tenant_id: tenantId, period: ym, counters: empty, active_users: 0 };
  }
  try {
    const keys = USAGE_DIMENSIONS.map((d) => counterKey(tenantId, ym, d));
    const [values, users] = await Promise.all([
      redis.mget<(string | number | null)[]>(...keys),
      redis.scard(usersKey(tenantId, ym)),
    ]);
    const counters = { ...empty };
    USAGE_DIMENSIONS.forEach((d, i) => {
      const v = values[i];
      const n = v === null || v === undefined ? 0 : typeof v === "number" ? v : parseInt(String(v), 10);
      counters[d] = Number.isNaN(n) ? 0 : n;
    });
    return {
      tenant_id: tenantId,
      period: ym,
      counters,
      active_users: typeof users === "number" ? users : 0,
    };
  } catch {
    return { tenant_id: tenantId, period: ym, counters: empty, active_users: 0 };
  }
}

/**
 * tenantUsageHistory — N-month trailing usage for a single tenant.
 */
export async function tenantUsageHistory(
  tenantId: string,
  months: number,
): Promise<TenantUsageSummary[]> {
  const out: TenantUsageSummary[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i);
    out.push(await tenantUsage(tenantId, ymKey(d)));
  }
  return out;
}

/**
 * listActiveTenants — returns the set of tenant ids that recorded usage
 * during a given month. Used by the commercial admin console.
 */
export async function listActiveTenants(period?: string): Promise<string[]> {
  const ym = period ?? ymKey();
  const redis = getRedis();
  if (!redis) return [];
  try {
    const members = await redis.smembers(tenantsKey(ym));
    return members ?? [];
  } catch {
    return [];
  }
}
