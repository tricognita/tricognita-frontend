import "server-only";
/**
 * lib/env.ts — Secure Environment Validation
 * Ensures required secrets exist without ever logging or returning their values.
 */

const REQUIRED_SERVER_ENV = [
  "SENTINEL_JIT_SECRET",
  "SESSION_SECRET",
  "BOOTSTRAP_RESET_TOKEN",
  "SENTINEL_API_URL",
  "DEMO_ADMIN_PASSWORD",
];

// Min length for HMAC-class secrets. Anything below this is unsafe for
// HMAC-SHA256 signing (RFC 2104 §3 — key should be at least as long as
// the hash output, i.e. 32 bytes for SHA-256).
const SECRET_MIN_LENGTHS: Record<string, number> = {
  SENTINEL_JIT_SECRET: 32,
  SESSION_SECRET: 32,
  BOOTSTRAP_RESET_TOKEN: 24,
  DEMO_ADMIN_PASSWORD: 12,
};

// Recommended-but-not-required vars. Their absence is logged at warn
// level rather than failing startup; the platform still runs without
// them but loses specific capabilities.
const RECOMMENDED_SERVER_ENV = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "CRON_SECRET",
  "DATABASE_URL",
];

let validated = false;

/**
 * validateEnv: checks presence of required vars.
 * Should only be called in runtime paths, never at module top-level.
 * Throws sanitized errors to avoid leaking info.
 */
export function validateEnv() {
  if (validated) return;

  // Skip validation during Next.js build phase
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }

  const missing = REQUIRED_SERVER_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const errorMsg = `[CRITICAL] Missing required environment variables. System cannot start safely.`;
    // We log the KEYS that are missing, but never the values.
    console.error(`${errorMsg} Missing keys: ${missing.join(", ")}`);
    throw new Error(errorMsg);
  }

  // Length validation — HMAC secrets below the SHA-256 block size are unsafe.
  for (const [key, min] of Object.entries(SECRET_MIN_LENGTHS)) {
    const val = process.env[key];
    if (val && val.length < min) {
      throw new Error(`[CRITICAL] ${key} length below minimum (${val.length} < ${min} bytes)`);
    }
  }

  validated = true;
}

/**
 * getSecret: Safely retrieves a secret, ensuring validation has occurred.
 */
export function getRequiredEnv(key: string): string {
  validateEnv();
  const val = process.env[key];
  if (!val) {
    throw new Error(`[CRITICAL] Required environment variable ${key} is unset.`);
  }
  return val;
}

/**
 * Result type for the deployment-verify endpoint. Never includes
 * secret values — only presence and capability impact.
 */
export interface EnvCheckResult {
  ok: boolean;
  required: { key: string; present: boolean; meets_min_length: boolean }[];
  recommended: { key: string; present: boolean; capability_impact: string }[];
  warnings: string[];
}

const CAPABILITY_IMPACT: Record<string, string> = {
  UPSTASH_REDIS_REST_URL: "session revocation, notifications, incidents, webhooks unavailable",
  UPSTASH_REDIS_REST_TOKEN: "session revocation, notifications, incidents, webhooks unavailable",
  CRON_SECRET: "webhook retry queue cannot drain",
  DATABASE_URL: "Postgres-backed reads/writes unavailable",
};

/**
 * checkEnv — read-only inspection of env presence + length.
 * Safe to expose to ADMIN-only routes; returns no secret values.
 */
export function checkEnv(): EnvCheckResult {
  const warnings: string[] = [];
  const required = REQUIRED_SERVER_ENV.map((key) => {
    const val = process.env[key];
    const present = !!val;
    const min = SECRET_MIN_LENGTHS[key] ?? 0;
    const meets_min_length = present && (min === 0 || (val as string).length >= min);
    if (!present) warnings.push(`required env ${key} missing`);
    else if (!meets_min_length) warnings.push(`required env ${key} too short (< ${min} bytes)`);
    return { key, present, meets_min_length };
  });
  const recommended = RECOMMENDED_SERVER_ENV.map((key) => {
    const present = !!process.env[key];
    if (!present) warnings.push(`recommended env ${key} missing — ${CAPABILITY_IMPACT[key]}`);
    return { key, present, capability_impact: CAPABILITY_IMPACT[key] ?? "" };
  });
  const ok = required.every((r) => r.present && r.meets_min_length);
  return { ok, required, recommended, warnings };
}
