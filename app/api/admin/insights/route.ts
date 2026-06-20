import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  dormantFeatures,
  readDailyRange,
  readFeatureLastSeen,
} from "@/lib/telemetry";
import { readAdminFeedback } from "@/lib/feedback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/insights
 *
 * ADMIN-only product intelligence rollup. Returns:
 *   - daily aggregates for the trailing 14 days (events, tenants,
 *     users, type breakdown)
 *   - feature last-seen across the full taxonomy
 *   - features dormant ≥14 days
 *   - feedback signals correlated by category
 *
 * NEVER returns raw events — only summarized aggregates. Per-tenant
 * drill-in is a separate endpoint (Phase 17+) so this stays cheap.
 */

const RANGE_DAYS = 14;

interface FeedbackCategoryCount {
  category: string;
  total: number;
  new: number;
  triaged: number;
  resolved: number;
}

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.insights.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  const [range, features, dormant, feedback] = await Promise.all([
    readDailyRange(RANGE_DAYS),
    readFeatureLastSeen(),
    dormantFeatures(14),
    readAdminFeedback(200),
  ]);

  // Feedback category breakdown — sums per category across statuses
  // so admins can see "users keep complaining about onboarding" without
  // reading every entry.
  const byCategory = new Map<string, FeedbackCategoryCount>();
  for (const fb of feedback) {
    const row = byCategory.get(fb.category) ?? {
      category: fb.category,
      total: 0,
      new: 0,
      triaged: 0,
      resolved: 0,
    };
    row.total += 1;
    row[fb.status] += 1;
    byCategory.set(fb.category, row);
  }
  const feedback_by_category = Array.from(byCategory.values()).sort(
    (a, b) => b.total - a.total,
  );

  // Roll up totals across the range.
  const totals = range.reduce(
    (acc, d) => {
      acc.events += d.total_events;
      // active_tenants and active_users are SET sizes per day — naive sum
      // double-counts users active multiple days. We surface daily sums as
      // a "volume" signal, NOT a unique count. The trailing-14d unique
      // counts require a separate cross-day SUNIONSTORE (Phase 17+).
      acc.daily_active_tenants_sum += d.active_tenants;
      acc.daily_active_users_sum += d.active_users;
      return acc;
    },
    { events: 0, daily_active_tenants_sum: 0, daily_active_users_sum: 0 },
  );

  logRoute(ctx, "info", "admin.insights.read", {
    range_days: RANGE_DAYS,
    feedback_count: feedback.length,
    dormant_count: dormant.length,
  });

  return Response.json({
    range_days: RANGE_DAYS,
    totals,
    daily: range,
    features,
    dormant,
    feedback_by_category,
    generated_at: new Date().toISOString(),
  });
});
