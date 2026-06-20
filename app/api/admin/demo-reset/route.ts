import { authedRoute, logRoute } from "@/lib/bff-log";
import { demoReset, isDemoMode } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/demo-reset
 *
 * Wipes demo-scoped Redis state for the caller's tenant. Idempotent.
 *
 * Hard-gated:
 *   - ADMIN role required (middleware + per-handler check).
 *   - DEMO_MODE=true required — returns 404 in production so the
 *     route's existence isn't even disclosed.
 *
 * Clears: per-tenant notifications + telemetry + feedback feeds,
 * plus the platform-level active and resolved incident sets.
 * Never touches Postgres (user accounts, audit_log, etc.).
 */

export const POST = authedRoute(async ({ ctx, session }) => {
  // Pretend the route doesn't exist when not in demo mode. This avoids
  // disclosing the existence of the reset endpoint to anyone probing
  // production deployments.
  if (!isDemoMode()) {
    return ctx.errorJson({ error: "not_found" }, 404);
  }

  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.demo_reset.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  const result = await demoReset(session.tenantId);

  logRoute(ctx, "warn", "admin.demo_reset.completed", {
    tenant_id: session.tenantId,
    cleared_count: result.cleared_keys.length,
    redis_available: result.redis_available,
  });

  return Response.json(result);
});
