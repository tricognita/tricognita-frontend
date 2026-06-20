"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Briefcase, RefreshCw, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  FilterBar,
  HStack,
  KPI,
  PageShell,
  Skeleton,
  VStack,
} from "@/lib/ui";
import { PageRestrictedGuard } from "../../components/PageRestrictedGuard";
import { fetcher } from "@/lib/swr-fetcher";
import {
  STAGE_INTENT,
  STAGE_LABELS,
  type LifecycleAssessment,
  type LifecycleStage,
} from "@/lib/lifecycle";

interface TenantRow {
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  period: string;
  usage: Record<string, number>;
  active_users: number;
  lifecycle: LifecycleAssessment;
}
interface StageBucket {
  stage: LifecycleStage;
  label: string;
  count: number;
}
interface PlanBucket {
  plan_id: string;
  plan_name: string;
  count: number;
}
interface CommercialResponse {
  tenant_count: number;
  rows: TenantRow[];
  stage_breakdown: StageBucket[];
  plan_breakdown: PlanBucket[];
  generated_at: string;
}

export default function AdminCommercialPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Commercial Overview"
      description="Per-tenant plan, current-month usage, and lifecycle stage."
      subtitle="Commercial"
    >
      <CommercialView />
    </PageRestrictedGuard>
  );
}

function CommercialView(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useSWR<CommercialResponse>(
    "/api/admin/commercial",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!data) return [] as TenantRow[];
    return data.rows.filter((r) => {
      if (stageFilter !== "all" && r.lifecycle.stage !== stageFilter) return false;
      if (planFilter !== "all" && r.plan_id !== planFilter) return false;
      return true;
    });
  }, [data, stageFilter, planFilter]);

  const attentionNeeded = useMemo(() => {
    if (!data) return 0;
    return data.rows.filter(
      (r) => r.lifecycle.stage === "churning" || r.lifecycle.stage === "dormant",
    ).length;
  }, [data]);

  if (error) {
    return (
      <PageShell title="Commercial Overview">
        <ErrorState
          title="Could not load commercial overview"
          description="Try again in a moment."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Commercial overview"
      description="Per-tenant plan + usage + lifecycle stage. Attention-needed cohort at the top."
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
      {isLoading || !data ? (
        <Skeleton className="h-48 w-full" />
      ) : data.tenant_count === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="No tenants yet"
          description="Tenants appear here once they record usage or sign up users."
        />
      ) : (
        <VStack gap="lg">
          <HStack gap="md" className="flex-wrap">
            <KPI label="Tenants" value={data.tenant_count} />
            <KPI
              label="Attention needed"
              value={attentionNeeded}
              intent={attentionNeeded > 0 ? "warning" : "success"}
            />
            {data.stage_breakdown
              .filter((s) => s.count > 0)
              .map((s) => (
                <KPI key={s.stage} label={s.label} value={s.count} />
              ))}
          </HStack>

          <Card>
            <CardHeader title="Plan distribution" />
            <div className="p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase opacity-60">
                    <th className="pb-1">Plan</th>
                    <th className="pb-1 text-right">Tenants</th>
                  </tr>
                </thead>
                <tbody>
                  {data.plan_breakdown.map((p) => (
                    <tr key={p.plan_id} className="border-t border-[var(--mist)]">
                      <td className="py-1.5">{p.plan_name}</td>
                      <td className="py-1.5 text-right font-mono">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <FilterBar>
            <select
              value={stageFilter}
              onChange={(e) =>
                setStageFilter(e.target.value as LifecycleStage | "all")
              }
              className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
            >
              <option value="all">All stages</option>
              {data.stage_breakdown.map((s) => (
                <option key={s.stage} value={s.stage}>
                  {s.label} ({s.count})
                </option>
              ))}
            </select>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
            >
              <option value="all">All plans</option>
              {data.plan_breakdown.map((p) => (
                <option key={p.plan_id} value={p.plan_id}>
                  {p.plan_name}
                </option>
              ))}
            </select>
          </FilterBar>

          <Card>
            <CardHeader
              title={`Tenants (${filtered.length}${filtered.length !== data.tenant_count ? ` of ${data.tenant_count}` : ""})`}
            />
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase opacity-60">
                    <th className="pb-1">Tenant</th>
                    <th className="pb-1">Plan</th>
                    <th className="pb-1">Stage</th>
                    <th className="pb-1 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Users size={10} /> Active
                      </span>
                    </th>
                    <th className="pb-1 text-right">Scans</th>
                    <th className="pb-1 text-right">Exports</th>
                    <th className="pb-1 text-right">Webhooks ok</th>
                    <th className="pb-1 text-right">Failed</th>
                    <th className="pb-1 text-right">Incidents</th>
                    <th className="pb-1">Why this stage</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.tenant_id}
                      className="border-t border-[var(--mist)] align-top"
                    >
                      <td className="py-1.5 font-mono text-[11px]">
                        {r.tenant_id.slice(0, 16)}
                      </td>
                      <td className="py-1.5">{r.plan_name}</td>
                      <td className="py-1.5">
                        <Badge intent={STAGE_INTENT[r.lifecycle.stage]} size="sm">
                          {STAGE_LABELS[r.lifecycle.stage]}
                        </Badge>
                      </td>
                      <td className="py-1.5 text-right font-mono">{r.active_users}</td>
                      <td className="py-1.5 text-right font-mono">
                        {r.usage.scans ?? 0}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {r.usage.exports ?? 0}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {r.usage.webhooks_delivered ?? 0}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {r.usage.webhooks_failed ?? 0}
                      </td>
                      <td className="py-1.5 text-right font-mono">
                        {r.usage.incidents_declared ?? 0}
                      </td>
                      <td className="py-1.5 text-[11px] opacity-70">
                        {r.lifecycle.reasoning}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="text-[10px] opacity-50">
            Generated {data.generated_at}. Sorted by attention-needed cohort
            (churning → dormant → signed_up → activating → activated →
            engaged), then active users descending. No customer asset data
            returned — only usage counters + derived lifecycle.
          </div>
        </VStack>
      )}
    </PageShell>
  );
}
