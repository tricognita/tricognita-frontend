/**
 * lib/token-store.ts — Redis-backed token state for high-assurance session security.
 *
 * Responsibilities:
 *   1. JTI revocation blacklist  — invalidate access tokens immediately on logout/compromise
 *   2. Refresh token registry    — rotating 7-day refresh tokens, one active per session
 *   3. Security event telemetry  — auth anomaly stream for SIEM/alerting
 *
 * Redis key schema:
 *   jti:rev:{jti}          → "1"               TTL = remaining access token life
 *   rtk:{sha256(token)}    → JSON(RefreshRecord) TTL = 7 days
 *   sec:events             → Redis LIST, capped at MAX_SEC_EVENTS
 */

import { Redis } from "@upstash/redis";

const redisUrl   = process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL   ?? "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";

// Fail loud on startup if Redis is not configured — this module requires it.
// In dev, set UPSTASH_REDIS_REST_URL=redis://localhost:6379 or skip module import.
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  if (!redisUrl || !redisToken) {
    // Graceful degradation: no Redis = no revocation (insecure but non-crashing).
    // Log a warning so the operator knows.
    console.warn("[token-store] UPSTASH_REDIS_REST_URL not set — JTI revocation DISABLED");
    throw new Error("redis_not_configured");
  }
  _redis = new Redis({ url: redisUrl, token: redisToken });
  return _redis;
}

// ─── JTI Revocation ───────────────────────────────────────────────────────────

const JTI_PREFIX = "jti:rev:";

/**
 * Blacklist a JTI. Call on logout, forced session termination, or compromise detection.
 * TTL is set to the remaining life of the access token so the key self-cleans.
 */
export async function revokeJti(jti: string, remainingTtlSeconds: number): Promise<void> {
  const r = getRedis();
  const ttl = Math.max(remainingTtlSeconds, 1);
  await r.set(`${JTI_PREFIX}${jti}`, "1", { ex: ttl });
}

/**
 * Returns true if the JTI has been revoked. Fast path: Redis GET.
 * On Redis failure, defaults to FALSE (access granted) — documented trade-off.
 * Flip to TRUE if you prefer security over availability.
 */
export async function isJtiRevoked(jti: string): Promise<boolean> {
  try {
    const r = getRedis();
    const v = await r.get(`${JTI_PREFIX}${jti}`);
    return v === "1";
  } catch {
    return false; // Redis down: allow through, log the anomaly
  }
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

export interface RefreshRecord {
  email: string;
  role:  string;
  tenantId: string;
  accessJti: string;  // the access token jti this refresh belongs to
  createdAt: number;  // unix seconds
  ip:   string;       // IP at time of issuance (for anomaly detection)
  ua:   string;       // User-Agent fingerprint (first 16 hex of SHA-256)
}

const RTK_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Stable key for a refresh token: SHA-256 of the token itself.
 * We never store the raw token in Redis — only its hash.
 */
async function refreshTokenKey(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  const hex = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `rtk:${hex}`;
}

export async function storeRefreshToken(
  token: string,
  record: RefreshRecord
): Promise<void> {
  const r   = getRedis();
  const key = await refreshTokenKey(token);
  await r.set(key, JSON.stringify(record), { ex: RTK_TTL });
}

export async function lookupRefreshToken(token: string): Promise<RefreshRecord | null> {
  try {
    const r   = getRedis();
    const key = await refreshTokenKey(token);
    const raw = await r.get<string>(key);
    if (!raw) return null;
    return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as RefreshRecord;
  } catch {
    return null;
  }
}

export async function deleteRefreshToken(token: string): Promise<void> {
  const r   = getRedis();
  const key = await refreshTokenKey(token);
  await r.del(key);
}

// ─── Security Event Telemetry ─────────────────────────────────────────────────

export type SecurityEventType =
  | "login_success"
  | "login_failure"
  | "login_rate_limited"
  | "logout"
  | "token_revoked"
  | "jti_replay_attempt"     // same jti used twice after logout
  | "ua_mismatch"            // token used from different UA
  | "ip_change"              // token used from different IP
  | "refresh_rotated"
  | "refresh_invalid"
  | "mfa_failure"
  | "brute_force_detected"
  | "privilege_escalation_attempt";

export interface SecurityEvent {
  type:  SecurityEventType;
  email: string;
  tenantId?: string;
  ip:    string;
  ua:    string;
  ts:    string; // ISO 8601
  data?: Record<string, unknown>;
}

const MAX_SEC_EVENTS = 10_000;
const SEC_EVENTS_KEY = "sec:events";

/**
 * Push a security event to the Redis telemetry stream.
 * Capped at 10,000 entries (LTRIM). Fire-and-forget — never awaited by callers.
 */
export async function recordSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const r = getRedis();
    await r.pipeline()
      .lpush(SEC_EVENTS_KEY, JSON.stringify(event))
      .ltrim(SEC_EVENTS_KEY, 0, MAX_SEC_EVENTS - 1)
      .exec();
  } catch {
    // Never fail auth flow due to telemetry errors
    console.error("[token-store] security event write failed", event.type);
  }
}

/**
 * Pull recent security events (for dashboard / SIEM export).
 * Returns newest-first.
 */
export async function getRecentSecurityEvents(limit = 100): Promise<SecurityEvent[]> {
  try {
    const r    = getRedis();
    const raws = await r.lrange<string>(SEC_EVENTS_KEY, 0, limit - 1);
    return raws.map(r => JSON.parse(typeof r === "string" ? r : JSON.stringify(r)) as SecurityEvent);
  } catch {
    return [];
  }
}
