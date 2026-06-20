/**
 * lib/rate-limit.ts — Production-grade sliding window rate limiter
 *
 * Storage hierarchy:
 *   1. Upstash Redis (atomic sorted-set sliding window — works across Vercel instances)
 *   2. In-memory (single-instance fallback — good for dev, partial protection in prod)
 *
 * Login endpoint: 10 attempts per 60-second window, then 5-min lockout.
 * IP + email are checked independently (both must pass).
 * On lockout: exponential backoff applied to Retry-After header (1.5x, capped 1h).
 */

import { Redis } from "@upstash/redis";

// ─── Redis client ─────────────────────────────────────────────────────────────
const redisUrl   = process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL   ?? "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// ─── Config ───────────────────────────────────────────────────────────────────
const WINDOW_MS   = 60 * 1000;        // 60s sliding window
const MAX_HITS    = 10;               // ≥10 req/min before lockout
const COOLDOWN_MS = 5 * 60 * 1000;    // 5 min lockout
const COOLDOWN_CAP_MS = 60 * 60 * 1000; // hard cap 1h regardless of backoff
const REDIS_PREFIX = "rl:v3:";        // bump prefix → invalidates legacy v2 lockouts

// ─── In-memory fallback ───────────────────────────────────────────────────────
type Bucket = { hits: number[]; blockedUntil: number };
const buckets = new Map<string, Bucket>();

export interface LimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  backend: "redis" | "memory";
}

// ─── Redis sliding window (atomic pipeline) ────────────────────────────────────
// Uses sorted set: score=timestamp, member=timestamp+random (unique per hit).
// ZREMRANGEBYSCORE prunes old hits atomically before counting.
async function redisCheckAndRecord(
  key: string,
  record: boolean,
  now: number
): Promise<LimitResult> {
  const rKey   = `${REDIS_PREFIX}${key}`;
  const lockKey = `${REDIS_PREFIX}lock:${key}`;
  const windowStart = now - WINDOW_MS;
  const ttlSeconds  = Math.ceil(WINDOW_MS / 1000);

  // Check lockout first (fast path)
  const lockedUntil = await redis!.get<number>(lockKey);
  if (lockedUntil && lockedUntil > now) {
    const retryAfter = Math.ceil((lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter, remaining: 0, backend: "redis" };
  }

  if (record) {
    // Atomic: prune old, add current hit, count all
    const member = `${now}-${Math.random().toString(36).slice(2)}`;
    const [, , countRaw] = await redis!.pipeline()
      .zremrangebyscore(rKey, "-inf", windowStart)
      .zadd(rKey, { score: now, member })
      .zcard(rKey)
      .exec() as [unknown, unknown, number];

    await redis!.expire(rKey, ttlSeconds);
    const count = countRaw ?? 0;

    if (count > MAX_HITS) {
      // Exponential backoff: lockout doubles each time (capped at 24h)
      const violations = Math.min(count - MAX_HITS, 10);
      const backoffMs  = COOLDOWN_MS * Math.pow(1.5, violations - 1);
      const cappedMs   = Math.min(backoffMs, COOLDOWN_CAP_MS);
      await redis!.set(lockKey, now + cappedMs, { px: Math.ceil(cappedMs) });
      return { allowed: false, retryAfterSeconds: Math.ceil(cappedMs / 1000), remaining: 0, backend: "redis" };
    }
    return { allowed: true, retryAfterSeconds: 0, remaining: MAX_HITS - count, backend: "redis" };
  } else {
    // Read-only check
    await redis!.zremrangebyscore(rKey, "-inf", windowStart);
    const count = (await redis!.zcard(rKey)) ?? 0;
    if (count >= MAX_HITS) {
      return { allowed: false, retryAfterSeconds: Math.ceil(COOLDOWN_MS / 1000), remaining: 0, backend: "redis" };
    }
    return { allowed: true, retryAfterSeconds: 0, remaining: MAX_HITS - count, backend: "redis" };
  }
}

// ─── Memory sliding window (fallback) ─────────────────────────────────────────
function memoryCheck(key: string, now: number): LimitResult {
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [], blockedUntil: 0 };
    buckets.set(key, b);
  }
  if (b.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((b.blockedUntil - now) / 1000), remaining: 0, backend: "memory" };
  }
  b.hits = b.hits.filter(t => now - t < WINDOW_MS);
  if (b.hits.length >= MAX_HITS) {
    b.blockedUntil = now + COOLDOWN_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(COOLDOWN_MS / 1000), remaining: 0, backend: "memory" };
  }
  return { allowed: true, retryAfterSeconds: 0, remaining: MAX_HITS - b.hits.length, backend: "memory" };
}

function memoryRecord(key: string, now: number): void {
  const b = buckets.get(key);
  if (b) b.hits.push(now);
}

function memoryClear(key: string): void {
  buckets.delete(key);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Check if key is allowed. Does NOT record a hit — call recordFailure on failed auth. */
export async function checkLimit(key: string, now = Date.now()): Promise<LimitResult> {
  if (redis) {
    try { return await redisCheckAndRecord(key, false, now); } catch { /* fall through */ }
  }
  return memoryCheck(key, now);
}

/** Record a failed attempt for this key. Triggers lockout at MAX_HITS. */
export async function recordFailure(key: string, now = Date.now()): Promise<void> {
  if (redis) {
    try { await redisCheckAndRecord(key, true, now); return; } catch { /* fall through */ }
  }
  // Memory fallback
  if (!buckets.has(key)) buckets.set(key, { hits: [], blockedUntil: 0 });
  memoryRecord(key, now);
  memoryCheck(key, now); // re-check to trigger lockout if threshold hit
}

/** Clear rate limit on successful auth (reward honest users). */
export async function clearOnSuccess(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.pipeline()
        .del(`${REDIS_PREFIX}${key}`)
        .del(`${REDIS_PREFIX}lock:${key}`)
        .exec();
      return;
    } catch { /* fall through */ }
  }
  memoryClear(key);
}

/** Extract the most-specific client IP from Cloudflare/Vercel headers. */
export function clientIpFromHeaders(req: Request): string {
  const h = req.headers;
  // CF-Connecting-IP is set by Cloudflare and can't be spoofed when proxied.
  // X-Forwarded-For is the fallback for direct/Vercel connections.
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    ((h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown")
  );
}
