import { authedRoute, logRoute } from "@/lib/bff-log";
import { listUsers } from "@/lib/users";
import { planFor } from "@/lib/plans";
import {
  listActiveTenants,
  tenantUsageHistory,
  type TenantUsageSummary,
} from "@/lib/usage-accounting";
import {
  deriveLifecycle,
  STAGE_LABELS,
  type LifecycleAssessment,
  type LifecycleStage,
} from "@/lib/lifecycle";
import { readAdminFeedback } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/pilot-health
 *
 * ADMIN-only per-tenant rollup focused on pilot health rather than
 * commercial state. Distinct from /api/admin/commercial: that endpoint
 * is "who's on what plan with what usage"; this endpoint is "of the
 * tenants I'm trying to convert to paid, which ones need attention."
 *
 * For each tenant:
 *   - lifecycle stage (signed_up / activating / activated / engaged /
 *     dormant / churning)
 *   - 6-month usage history rolled up to activation milestones
 *   - feedback signals from this tenant (count, categories, latest age)
 *   - derived risk score (none / low / medium / high) based on the
 *     pattern of signals
 *
 * Risk scoring rules (deliberately simple, fully documented):
 *   high      = (churning) OR (dormant for 30+ days)
 *   medium    = (dormant) OR (activating beyond week 2)
 *   low       = (activated but no integration / no remediation yet)
 *   none      = (engaged) OR (signed_up new this week)
 *
 * No customer asset data returned — only aggregate counters,
 * lifecycle stage, and feedback category counts.
 */

interface ActivationMilestones {
  has_scanned: boolean;
  has_first_integration: boolean;
  has_first_remediation: boolean;
  has_first_incident: boolean;
  has_first_export: boolean;
  /** Count of milestones hit, out of 5. */
  count: number;
}

interface FeedbackSummary {
  total: number;
  open: number;
  /** Most recent submission age in days, or null if none. */
  latest_age_days: number | null;
  /** Top categories by count this tenant has submitted. */
  top_categories: Array<{ category: string; count: number }>;
}

type RiskLevel = "none" | "low" | "medium" | "high";

interface PilotHealthRow {
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  lifecycle: LifecycleAssessment;
  activation: ActivationMilestones;
  current_period: string;
  current_usage: TenantUsageSummary["counters"];
  active_users: number;
  feedback: FeedbackSummary;
  risk: RiskLevel;
  risk_reasoning: string;
}

function activationFrom(history: TenantUsageSummary[]): ActivationMilestones {
  const hasAny = (key: keyof TenantUsageSummary["counters"]) =>
    history.some((m) => (m.counters[key] ?? 0) > 0);
  const m: ActivationMilestones = {
    has_scanned: hasAny("scans"),
    has_first_integration: hasAny("webhooks_delivered"),
    has_first_remediation: hasAny("remediations_approved"),
    has_first_incident: hasAny("incidents_declared"),
    has_first_export: hasAny("exports"),
    count: 0,
  };
  m.count =
    (m.has_scanned ? 1 : 0) +
    (m.has_first_integration ? 1 : 0) +
    (m.has_first_remediation ? 1 : 0) +
    (m.has_first_incident ? 1 : 0) +
    (m.has_first_export ? 1 : 0);
  return m;
}

interface RiskAssessment {
  risk: RiskLevel;
  reasoning: string;
}

function deriveRisk(
  lifecycle: LifecycleAssessment,
  activation: ActivationMilestones,
): RiskAssessment {
  if (lifecycle.stage === "churning") {
    return {
      risk: "high",
      reasoning: "Churning — multiple consecutive months of zero usage after prior activity.",
    };
  }
  if (lifecycle.stage === "dormant") {
    return {
      risk: "medium",
      reasoning: "Dormant — current month zero usage; previous months had activity.",
    };
  }
  if (lifecycle.stage === "activating" && lifecycle.signals.months_with_usage > 1) {
    return {
      risk: "medium",
      reasoning: "Activating but not graduating — using scans but no other workflow surface after week 2.",
    };
  }
  if (lifecycle.stage === "activated" && activation.count < 3) {
    return {
      risk: "low",
      reasoning: "Activated but narrow — fewer than 3 of 5 activation milestones hit.",
    };
  }
  if (lifecycle.stage === "engaged") {
    return {
      risk: "none",
      reasoning: "Engaged — recurring usage across multiple workflow surfaces.",
    };
  }
  return {
    risk: "none",
    reasoning: "On track for this lifecycle stage.",
  };
}

function feedbackSummaryFor(
  tenantId: string,
  allFeedback: Array<{
    tenant_id: string;
    status: string;
    category: string;
    submitted_at: string;
  }>,
  now: number,
): FeedbackSummary {
  const mine = allFeedback.filter((f) => f.tenant_id === tenantId);
  const open = mine.filter((f) => f.status !== "resolved").length;
  const categories = new Map<string, number>();
  for (const f of mine) {
    categories.set(f.category, (categories.get(f.category) ?? 0) + 1);
  }
  const top_categories = Array.from(categories.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  let latest_age_days: number | null = null;
  if (mine.length > 0) {
    const latest = mine
      .map((f) => new Date(f.submitted_at).getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    latest_age_days = Math.floor((now - latest) / (24 * 60 * 60 * 1000));
  }
  return { total: mine.length, open, latest_age_days, top_categories };
}

const RISK_SORT: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2, none: 3 };

interface PilotHealthResponse {
  tenant_count: number;
  generated_at: string;
  rows: PilotHealthRow[];
  risk_breakdown: Array<{ risk: RiskLevel; count: number }>;
  stage_breakdown: Array<{ stage: LifecycleStage; label: string; count: number }>;
}

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.pilot_health.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  const [activeTenants, users, allFeedback] = await Promise.all([
    listActiveTenants(),
    listUsers(),
    readAdminFeedback(500),
  ]);

  // Union tenants from active-usage set + user list (catches signed_up tenants).
  const tenantIds = new Set<string>(activeTenants);
  const tenantToPlan = new Map<string, string>();
  for (const u of users) {
    if (u.tenantId) tenantIds.add(u.tenantId);
    if (u.tenantId && u.plan && !tenantToPlan.has(u.tenantId)) {
      tenantToPlan.set(u.tenantId, u.plan);
    }
  }

  const now = Date.now();
  const rows: PilotHealthRow[] = [];

  for (const tenantId of tenantIds) {
    const history = await tenantUsageHistory(tenantId, 6);
    const lifecycle = deriveLifecycle(history);
    const activation = activationFrom(history);
    const riskAssessment = deriveRisk(lifecycle, activation);
    const planId = tenantToPlan.get(tenantId) ?? "free";
    const plan = planFor(planId);
    const current = history[0];
    rows.push({
      tenant_id: tenantId,
      plan_id: planId,
      plan_name: plan.name,
      lifecycle,
      activation,
      current_period: current.period,
      current_usage: current.counters,
      active_users: current.active_users,
      feedback: feedbackSummaryFor(tenantId, allFeedback, now),
      risk: riskAssessment.risk,
      risk_reasoning: riskAssessment.reasoning,
    });
  }

  // Sort: highest risk first; among same risk, oldest dormancy / newest feedback first.
  rows.sort((a, b) => {
    const r = RISK_SORT[a.risk] - RISK_SORT[b.risk];
    if (r !== 0) return r;
    // Within same risk, more open feedback bubbles up.
    return b.feedback.open - a.feedback.open;
  });

  const riskCounts = new Map<RiskLevel, number>([
    ["high", 0],
    ["medium", 0],
    ["low", 0],
    ["none", 0],
  ]);
  for (const r of rows) riskCounts.set(r.risk, (riskCounts.get(r.risk) ?? 0) + 1);

  const stageCounts = new Map<LifecycleStage, number>();
  for (const s of Object.keys(STAGE_LABELS) as LifecycleStage[]) {
    stageCounts.set(s, 0);
  }
  for (const r of rows) {
    stageCounts.set(r.lifecycle.stage, (stageCounts.get(r.lifecycle.stage) ?? 0) + 1);
  }

  const response: PilotHealthResponse = {
    tenant_count: rows.length,
    generated_at: new Date().toISOString(),
    rows,
    risk_breakdown: Array.from(riskCounts.entries())
      .map(([risk, count]) => ({ risk, count }))
      .filter((b) => b.count > 0),
    stage_breakdown: Array.from(stageCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([stage, count]) => ({ stage, label: STAGE_LABELS[stage], count })),
  };

  logRoute(ctx, "info", "admin.pilot_health.read", {
    tenant_count: rows.length,
    high_risk_count: riskCounts.get("high") ?? 0,
  });

  return Response.json(response);
});
