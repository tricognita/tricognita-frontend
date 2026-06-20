import { authedRoute, logRoute } from "@/lib/bff-log";
import { findByEmail } from "@/lib/users";
import { planFor, NUMERIC_QUOTA_KEYS, type QuotaKey } from "@/lib/plans";
import {
  tenantUsage,
  tenantUsageHistory,
} from "@/lib/usage-accounting";
import { deriveLifecycle } from "@/lib/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/usage
 *
 * Tenant-scoped current-period usage + plan + quota status +
 * derived lifecycle stage. Any authenticated role.
 *
 * Drives /dashboard/plan customer-visible plan & usage page.
 *
 * Returns:
 *   {
 *     plan: PlanDefinition,
 *     period: "yyyy-mm",
 *     usage: { dimension -> count },
 *     active_users: number,
 *     quotas: [{ key, limit, used, pct, overage_allowed }, ...],
 *     lifecycle: LifecycleAssessment,
 *     history: TenantUsageSummary[] (last 6 months)
 *   }
 */

// Map usage dimensions onto quota dimensions. Many quotas don't have
// a counterpart counter today (team_members, cloud_accounts come from
// Postgres-backed inventories — Phase 18+). Returning -1 here signals
// "no usage data yet" to the consumer rather than fake-zeroing.
const QUOTA_TO_USAGE: Record<QuotaKey, string | null> = {
  scans_per_month: "scans",
  exports_per_month: "exports",
  webhook_subscriptions: null, // count of subscriptions, not counter
  team_members: null,
  cloud_accounts: null,
  overage_allowed: null,
};

export const GET = authedRoute(async ({ ctx, session }) => {
  const [user, current, history] = await Promise.all([
    findByEmail(session.email),
    tenantUsage(session.tenantId),
    tenantUsageHistory(session.tenantId, 6),
  ]);

  const planId = user?.plan ?? "free";
  const plan = planFor(planId);
  const lifecycle = deriveLifecycle(history);

  // Build quota status rows for the dimensions we can actually measure
  // from counters; unmeasurable dimensions are returned with used=null
  // so the UI can render them as "limit only" without showing a fake
  // 0% bar.
  const quotas = NUMERIC_QUOTA_KEYS.map((key) => {
    const usageKey = QUOTA_TO_USAGE[key];
    const limit = plan.quotas[key] as number;
    const used =
      usageKey && usageKey in current.counters
        ? (current.counters as Record<string, number>)[usageKey]
        : null;
    const pct = used !== null && limit > 0 ? Math.min(100, (used / limit) * 100) : null;
    return {
      key,
      limit,
      used,
      pct,
      overage_allowed: plan.quotas.overage_allowed,
    };
  });

  logRoute(ctx, "info", "usage.tenant.read", {
    plan: planId,
    period: current.period,
    lifecycle: lifecycle.stage,
  });

  return Response.json({
    plan,
    period: current.period,
    usage: current.counters,
    active_users: current.active_users,
    quotas,
    lifecycle,
    history,
  });
});
