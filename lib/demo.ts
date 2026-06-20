/**
 * lib/demo — demo-mode environment flag + reset utilities.
 *
 * Phase 20 — design partner activation. Centralizes the "is this a
 * demo environment?" check and the reset semantics that go with it.
 *
 * Demo mode (DEMO_MODE=true):
 *   - Indicates the deployment is for demos / pilot evaluation / sales calls.
 *   - Unlocks /api/admin/demo-reset (otherwise hard-disabled).
 *   - May surface "demo banner" UX hints to the user.
 *   - MUST NOT change RBAC, tenant isolation, or any security primitive.
 *
 * Production deployments MUST NOT set DEMO_MODE=true. This is an
 * environment flag intended for ephemeral demo deployments only.
 *
 * The reset semantics deliberately operate ONLY on Redis-backed
 * surfaces (notifications, incidents, webhooks history, telemetry,
 * feedback) — NEVER on Postgres-backed surfaces. A demo reset should
 * be safe to run repeatedly without losing the user accounts or audit
 * chain that anchor the demo tenant.
 */

import { Redis } from "@upstash/redis";

/**
 * isDemoMode — true when DEMO_MODE env var is explicitly set to "true".
 * Defaults to false. Any other value (including "1", "yes", typos) is
 * treated as not-in-demo-mode to avoid accidental enablement.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/**
 * assertDemoMode — throws if demo mode is not active. Used by
 * destructive demo-only routes as a safety gate.
 */
export function assertDemoMode(): void {
  if (!isDemoMode()) {
    throw new Error("operation requires DEMO_MODE=true");
  }
}

/**
 * Redis key namespaces that demoReset clears. Keep this list narrow
 * and explicit — adding a new key family here should be a deliberate
 * decision, not an oversight.
 */
const DEMO_RESET_PATTERNS = [
  // Per-tenant notification feed
  (tenantId: string) => `tricognita:notifications:tenant:${tenantId}`,
  // Per-tenant telemetry stream
  (tenantId: string) => `tricognita:telemetry:tenant:${tenantId}`,
  // Per-tenant feedback list
  (tenantId: string) => `tricognita:feedback:tenant:${tenantId}`,
];

const DEMO_RESET_GLOBAL_KEYS = [
  // Active incidents are platform-level by design (per WORKFLOW_ENGINE);
  // clearing them is the desired demo behavior so the dashboard starts clean.
  "tricognita:incidents:active",
  "tricognita:incidents:resolved",
];

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

export interface DemoResetResult {
  tenant_id: string;
  cleared_keys: string[];
  /** Keys that were not deleted (didn't exist, or Redis unavailable). */
  skipped_keys: string[];
  redis_available: boolean;
}

/**
 * demoReset — clears demo-scoped Redis state for a single tenant.
 *
 * Idempotent. Returns the exact list of keys cleared so an admin can
 * verify nothing unexpected happened. NEVER touches Postgres.
 *
 * Caller MUST verify isDemoMode() first; this function will refuse
 * to operate if DEMO_MODE is not active.
 */
export async function demoReset(tenantId: string): Promise<DemoResetResult> {
  assertDemoMode();
  const redis = getRedis();
  if (!redis) {
    return {
      tenant_id: tenantId,
      cleared_keys: [],
      skipped_keys: ["redis_unavailable"],
      redis_available: false,
    };
  }

  const cleared: string[] = [];
  const skipped: string[] = [];

  const allKeys = [
    ...DEMO_RESET_PATTERNS.map((p) => p(tenantId)),
    ...DEMO_RESET_GLOBAL_KEYS,
  ];

  for (const key of allKeys) {
    try {
      const deleted = await redis.del(key);
      if (deleted > 0) cleared.push(key);
      else skipped.push(`${key} (not present)`);
    } catch (err) {
      skipped.push(
        `${key} (error: ${err instanceof Error ? err.message : "unknown"})`,
      );
    }
  }

  return {
    tenant_id: tenantId,
    cleared_keys: cleared,
    skipped_keys: skipped,
    redis_available: true,
  };
}

/**
 * demoBootstrap — placeholder for future demo-seeding logic.
 *
 * Today the synthetic demo data lives in lib/demo-data.ts as exported
 * constants (DEMO_FINDINGS, DEMO_INCIDENTS, etc.) and is rendered
 * client-side without server-side seeding. If a future phase needs to
 * pre-populate Redis with demo events (for SOC dashboard freshness,
 * for example), this is where that logic lands.
 *
 * Returns a no-op result today so callers can wire the contract in
 * advance.
 */
export async function demoBootstrap(_tenantId: string): Promise<{
  seeded: false;
  reason: string;
}> {
  assertDemoMode();
  return {
    seeded: false,
    reason: "demo data is rendered client-side from lib/demo-data.ts; no server-side seeding required today",
  };
}
