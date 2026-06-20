import { authedRoute, logRoute } from "@/lib/bff-log";
import { listUsers } from "@/lib/users";
import { planFor } from "@/lib/plans";
import {
  listActiveTenants,
  tenantUsage,
  tenantUsageHistory,
  type TenantUsageSummary,
} from "@/lib/usage-accounting";
import {
  deriveLifecycle,
  STAGE_LABELS,
  type LifecycleAssessment,
  type LifecycleStage,
} from "@/lib/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/commercial
 *
 * ADMIN-only cross-tenant commercial overview. Returns one row per
 * known tenant with plan + current-period usage + lifecycle stage.
 *
 * Why this is admin-platform (cross-tenant by design):
 *   This is the founder's "who do I focus on this week?" view —
 *   filtering by tenant defeats the purpose. Same model as the
 *   existing /api/admin/incidents and /api/admin/feedback inboxes;
 *   documented in BOUNDARY_VERIFICATION.md §2.2.
 *
 * No customer asset data returned — only plan + usage counters +
 * derived lifecycle stage. Audit-logged.
 */

interface TenantRow {
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  period: string;
  usage: TenantUsageSummary["counters"];
  active_users: number;
  lifecycle: LifecycleAssessment;
}

interface StageBucket {
  stage: LifecycleStage;
  label: string;
  count: number;
}

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.commercial.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  // Discover tenants from two sources and union them:
  //   - the active-tenants set for the current month (caught any tenant
  //     with usage)
  //   - the user list (catches signed_up tenants with no usage yet)
  // The union ensures the "signed up but never used" case isn't invisible.
  const [activeTenants, users] = await Promise.all([
    listActiveTenants(),
    listUsers(),
  ]);

  const tenantIds = new Set<string>(activeTenants);
  const tenantToPlan = new Map<string, string>();
  for (const u of users) {
    if (u.tenantId) tenantIds.add(u.tenantId);
    if (u.tenantId && u.plan) {
      // First user encountered defines the tenant's plan. In a multi-user
      // tenant, plans are tenant-scoped (lib/users.ts manages this) so
      // any user should give the same answer.
      if (!tenantToPlan.has(u.tenantId)) tenantToPlan.set(u.tenantId, u.plan);
    }
  }

  // Per-tenant rollup. Sequenced rather than fully parallel because the
  // expected tenant count for Phase 17 is small (<100); we trade
  // optimization for Redis-load predictability.
  const rows: TenantRow[] = [];
  for (const tenantId of tenantIds) {
    const history = await tenantUsageHistory(tenantId, 6);
    const lifecycle = deriveLifecycle(history);
    const planId = tenantToPlan.get(tenantId) ?? "free";
    const plan = planFor(planId);
    const current = history[0];
    rows.push({
      tenant_id: tenantId,
      plan_id: planId,
      plan_name: plan.name,
      period: current.period,
      usage: current.counters,
      active_users: current.active_users,
      lifecycle,
    });
  }

  // Sort: dormant + churning first (need attention), then engaged
  // descending by activity. The founder reading this wants the
  // attention-needed cohort at the top.
  const STAGE_ORDER: Record<LifecycleStage, number> = {
    churning: 0,
    dormant: 1,
    signed_up: 2,
    activating: 3,
    activated: 4,
    engaged: 5,
  };
  rows.sort((a, b) => {
    const so = STAGE_ORDER[a.lifecycle.stage] - STAGE_ORDER[b.lifecycle.stage];
    if (so !== 0) return so;
    return b.active_users - a.active_users;
  });

  // Stage breakdown for the headline KPIs.
  const stageBuckets = new Map<LifecycleStage, StageBucket>();
  for (const s of Object.keys(STAGE_LABELS) as LifecycleStage[]) {
    stageBuckets.set(s, { stage: s, label: STAGE_LABELS[s], count: 0 });
  }
  for (const row of rows) {
    const b = stageBuckets.get(row.lifecycle.stage);
    if (b) b.count += 1;
  }

  // Plan breakdown.
  const planBuckets = new Map<string, { plan_id: string; plan_name: string; count: number }>();
  for (const row of rows) {
    const k = row.plan_id;
    if (!planBuckets.has(k)) {
      planBuckets.set(k, { plan_id: k, plan_name: row.plan_name, count: 0 });
    }
    planBuckets.get(k)!.count += 1;
  }

  logRoute(ctx, "info", "admin.commercial.read", {
    tenant_count: rows.length,
  });

  return Response.json({
    tenant_count: rows.length,
    rows,
    stage_breakdown: Array.from(stageBuckets.values()),
    plan_breakdown: Array.from(planBuckets.values()),
    generated_at: new Date().toISOString(),
  });
});
