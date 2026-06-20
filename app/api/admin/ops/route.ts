import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  peekQuota,
  SCAN_QUOTA,
  REMEDIATE_QUOTA,
} from "@/lib/tenant-quota";
import { RELEASE } from "@/lib/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ops
 *
 * ADMIN-only operational snapshot. Returns:
 *   - Current quota state for the requesting tenant (scan + remediate).
 *   - Go backend health (best-effort; reports "unreachable" on failure).
 *   - Recent BFF telemetry summary if Redis is configured (placeholder
 *     for a future log-aggregated metric — today returns nulls).
 *
 * Cross-tenant data (other tenants' quotas, organization-wide queue
 * depth) requires the Go backend's admin endpoints which are out of
 * scope here. The platform-ADMIN view of THIS tenant is a useful first
 * operational tool — it answers "is my tenant currently throttled?",
 * "is the Go backend reachable from the BFF?", "what scan capacity do
 * I have right now?".
 *
 * Future expansion (tracked in docs/PRODUCTION_READINESS.md):
 *   - cross-tenant quota matrix (requires a Go API supporting peek)
 *   - SWR cache key inventory (requires opt-in client telemetry)
 *   - request-id → log line lookup (requires log-aggregator integration)
 */
export const GET = authedRoute(async ({ ctx, session, token }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.ops.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  // Per-tenant quota snapshots (read-only — peekQuota doesn't modify).
  const [scanQ, remediateQ] = await Promise.all([
    peekQuota(SCAN_QUOTA, session.tenantId),
    peekQuota(REMEDIATE_QUOTA, session.tenantId),
  ]);

  // Go backend reachability + uptime (best-effort).
  let backend: {
    reachable: boolean;
    status?: string;
    uptime_hours?: number;
    error?: string;
  };
  try {
    const res = await fetch(`${GO_API}/healthz`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        status?: string;
        uptime_seconds?: number;
      };
      backend = {
        reachable: true,
        status: body.status ?? "unknown",
        uptime_hours: body.uptime_seconds
          ? Math.round(body.uptime_seconds / 3600)
          : undefined,
      };
    } else {
      backend = { reachable: false, error: `HTTP ${res.status}` };
    }
  } catch (err) {
    backend = {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Forward the JIT token for future admin-only Go API calls. Not used
  // today, but documents the contract for downstream expansion.
  void token;

  logRoute(ctx, "info", "admin.ops.snapshot", {
    tenant_id: session.tenantId,
    scan_current: scanQ.current,
    backend_reachable: backend.reachable,
  });

  return Response.json({
    tenant_id: session.tenantId,
    timestamp: new Date().toISOString(),
    release: RELEASE,
    quotas: {
      scan: scanQ,
      remediate: remediateQ,
    },
    backend,
  });
});
