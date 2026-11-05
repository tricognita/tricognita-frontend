"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Activity, RefreshCw, TrendingDown, MessageSquare } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  HStack,
  KPI,
  PageShell,
  Skeleton,
  VStack,
} from "@/lib/ui";
import { PageRestrictedGuard } from "../../components/PageRestrictedGuard";
import { fetcher } from "@/lib/swr-fetcher";

interface DailyAggregate {
  date: string;
  total_events: number;
  active_tenants: number;
  active_users: number;
  by_type: Record<string, number>;
}
interface FeatureLastSeen {
  type: string;
  last_seen: string | null;
  days_since: number | null;
}
interface FeedbackCategoryCount {
  category: string;
  total: number;
  new: number;
  triaged: number;
  resolved: number;
}
interface InsightsResponse {
  range_days: number;
  totals: {
    events: number;
    daily_active_tenants_sum: number;
    daily_active_users_sum: number;
  };
  daily: DailyAggregate[];
  features: FeatureLastSeen[];
  dormant: FeatureLastSeen[];
  feedback_by_category: FeedbackCategoryCount[];
  generated_at: string;
}

// Group event types into categories so 37-row tables read at a glance.
function eventCategory(type: string): string {
  if (type === "page_view") return "Navigation";
  if (type.startsWith("onboarding.")) return "Onboarding";
  if (type.startsWith("scan.")) return "Scan";
  if (type.startsWith("finding.")) return "Findings";
  if (type.startsWith("remediation.")) return "Remediation";
  if (type.startsWith("incident.")) return "Incidents";
  if (type.startsWith("export.")) return "Exports";
  if (type.startsWith("integration.")) return "Integrations";
  if (type.startsWith("notification.")) return "Notifications";
  if (type.startsWith("feedback.")) return "Feedback";
  if (type.startsWith("admin.")) return "Admin";
  return "Other";
}

export default function AdminInsightsPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Product Insights"
      description="Trailing-14-day adoption, feature usage, dormancy, and feedback correlation."
      subtitle="Intelligence"
    >
      <InsightsView />
    </PageRestrictedGuard>
  );
}

function InsightsView(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useSWR<InsightsResponse>(
    "/api/admin/insights",
    fetcher,
    { refreshInterval: 60_000 },
  );

  // Aggregate by event-category for the headline table.
  const byCategory = useMemo(() => {
    if (!data) return [];
    const totals = new Map<string, number>();
    for (const day of data.daily) {
      for (const [type, count] of Object.entries(day.by_type)) {
        const cat = eventCategory(type);
        totals.set(cat, (totals.get(cat) ?? 0) + count);
      }
    }
    return Array.from(totals.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // Top-N most-used event types across the window.
  const topTypes = useMemo(() => {
    if (!data) return [];
    const totals = new Map<string, number>();
    for (const day of data.daily) {
      for (const [type, count] of Object.entries(day.by_type)) {
        totals.set(type, (totals.get(type) ?? 0) + count);
      }
    }
    return Array.from(totals.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  if (error) {
    return (
      <PageShell title="Product Insights">
        <ErrorState
          title="Could not load insights"
          description="The telemetry store may be offline. Try again."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Product Insights"
      description="Trailing-14-day adoption + feature usage + feedback correlation"
      actions={
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={12} />}
          onClick={() => mutate()}
        >
          Refresh
        </Button>
      }
    >
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data ? (
        <EmptyState
          icon={<Activity />}
          title="No data yet"
          description="Telemetry will populate as users interact with the platform."
        />
      ) : (
        <VStack gap="lg">
          {/* Headline KPIs */}
          <HStack gap="md" className="flex-wrap">
            <KPI label={`Events (${data.range_days}d)`} value={data.totals.events} />
            <KPI
              label="Daily active tenants (sum)"
              value={data.totals.daily_active_tenants_sum}
              hint="naive day-sum, not unique"
            />
            <KPI
              label="Daily active users (sum)"
              value={data.totals.daily_active_users_sum}
              hint="naive day-sum, not unique"
            />
            <KPI label="Dormant features" value={data.dormant.length} intent="warning" />
          </HStack>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Events by category (14d)" />
              <div className="p-3">
                {byCategory.length === 0 ? (
                  <EmptyState title="No events yet" description="" />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase opacity-60">
                        <th className="pb-1">Category</th>
                        <th className="pb-1 text-right">Events</th>
                        <th className="pb-1 text-right">% of total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCategory.map((row) => {
                        const pct = data.totals.events
                          ? (row.count / data.totals.events) * 100
                          : 0;
                        return (
                          <tr
                            key={row.category}
                            className="border-t border-[var(--mist)]"
                          >
                            <td className="py-1.5">{row.category}</td>
                            <td className="py-1.5 text-right font-mono">{row.count}</td>
                            <td className="py-1.5 text-right opacity-70">
                              {pct.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Top event types (14d)" />
              <div className="p-3">
                {topTypes.length === 0 ? (
                  <EmptyState title="No events yet" description="" />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase opacity-60">
                        <th className="pb-1">Type</th>
                        <th className="pb-1 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTypes.map((row) => (
                        <tr key={row.type} className="border-t border-[var(--mist)]">
                          <td className="py-1.5 font-mono text-[11px]">{row.type}</td>
                          <td className="py-1.5 text-right font-mono">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingDown size={14} /> Dormant features (≥14d)
                  </span>
                }
              />
              <div className="p-3">
                {data.dormant.length === 0 ? (
                  <EmptyState
                    title="No dormant features"
                    description="Every taxonomy entry has been used recently."
                  />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase opacity-60">
                        <th className="pb-1">Type</th>
                        <th className="pb-1 text-right">Days since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.dormant.map((f) => (
                        <tr key={f.type} className="border-t border-[var(--mist)]">
                          <td className="py-1.5 font-mono text-[11px]">{f.type}</td>
                          <td className="py-1.5 text-right">
                            {f.days_since === null ? (
                              <Badge intent="warning" size="sm">
                                never seen
                              </Badge>
                            ) : (
                              <span className="font-mono">{f.days_since}d</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare size={14} /> Feedback by category
                  </span>
                }
              />
              <div className="p-3">
                {data.feedback_by_category.length === 0 ? (
                  <EmptyState
                    title="No feedback yet"
                    description="The widget is mounted on every dashboard page."
                  />
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase opacity-60">
                        <th className="pb-1">Category</th>
                        <th className="pb-1 text-right">New</th>
                        <th className="pb-1 text-right">Triaged</th>
                        <th className="pb-1 text-right">Resolved</th>
                        <th className="pb-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.feedback_by_category.map((row) => (
                        <tr
                          key={row.category}
                          className="border-t border-[var(--mist)]"
                        >
                          <td className="py-1.5">{row.category}</td>
                          <td className="py-1.5 text-right font-mono">{row.new}</td>
                          <td className="py-1.5 text-right font-mono">{row.triaged}</td>
                          <td className="py-1.5 text-right font-mono">{row.resolved}</td>
                          <td className="py-1.5 text-right font-mono font-semibold">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Daily breakdown (14d)" />
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase opacity-60">
                    <th className="pb-1">Date</th>
                    <th className="pb-1 text-right">Events</th>
                    <th className="pb-1 text-right">Tenants</th>
                    <th className="pb-1 text-right">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((d) => (
                    <tr key={d.date} className="border-t border-[var(--mist)]">
                      <td className="py-1.5 font-mono">{d.date}</td>
                      <td className="py-1.5 text-right font-mono">{d.total_events}</td>
                      <td className="py-1.5 text-right font-mono">{d.active_tenants}</td>
                      <td className="py-1.5 text-right font-mono">{d.active_users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="text-[10px] opacity-50">
            Generated {data.generated_at} · 90-day retention on daily
            aggregates · LTRIM 5000 on raw event stream · per-tenant
            isolation enforced server-side.
          </div>
        </VStack>
      )}
    </PageShell>
  );
}
