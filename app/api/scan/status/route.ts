/**
 * GET /api/scan/status
 *
 * Returns the current scan status for the authenticated tenant.
 * Backed by Redis key: trico:scan:status:{tenantId}
 * Graceful degradation: if Redis is unavailable, returns { status: "idle" }.
 *
 * Response: { status: "idle"|"scanning"|"complete"|"error",
 *             elapsed_s, service, progress_pct, findings_count? }
 *
 * Demo mode: always returns idle (demo scan is driven client-side).
 */

import { authedRoute, logRoute } from "@/lib/bff-log";
import { isDemoMode } from "@/lib/demo";

const IDLE_RESPONSE = {
  status: "idle",
  elapsed_s: 0,
  service: null,
  progress_pct: 0,
} as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = authedRoute(async ({ ctx, session }) => {
  // Demo mode: scan is driven client-side; always idle from the BFF's perspective.
  if (isDemoMode()) {
    return Response.json(IDLE_RESPONSE);
  }

  // Try to read Redis scan status
  try {
    const { Redis } = await import("@upstash/redis");
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      // Redis not configured — fail open
      logRoute(ctx, "warn", "scan.status.redis_unconfigured", {
        tenant_id: session.tenantId,
      });
      return Response.json(IDLE_RESPONSE);
    }

    const redis = new Redis({ url, token });
    const key = `trico:scan:status:${session.tenantId}`;
    const raw = await redis.get<Record<string, unknown>>(key);

    if (!raw) return Response.json(IDLE_RESPONSE);

    return Response.json({
      status: raw.status ?? "idle",
      elapsed_s: raw.elapsed_s ?? 0,
      service: raw.service ?? null,
      progress_pct: raw.progress_pct ?? 0,
      findings_count: raw.findings_count,
    });
  } catch (err) {
    // Fail open — scan status is non-critical; a missing status is just "idle"
    logRoute(ctx, "warn", "scan.status.redis_error", {
      tenant_id: session.tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    return Response.json(IDLE_RESPONSE);
  }
});
