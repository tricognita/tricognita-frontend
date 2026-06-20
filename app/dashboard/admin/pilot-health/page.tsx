"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Activity, RefreshCw, AlertTriangle } from "lucide-react";
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
import { STAGE_INTENT, STAGE_LABELS, type LifecycleAssessment, type LifecycleStage } from "@/lib/lifecycle";

type RiskLevel = "none" | "low" | "medium" | "high";

interface ActivationMilestones {
  has_scanned: boolean;
  has_first_integration: boolean;
  has_first_remediation: boolean;
  has_first_incident: boolean;
  has_first_export: boolean;
  count: number;
}
interface FeedbackSummary {
  total: number;
  open: number;
  latest_age_days: number | null;
  top_categories: Array<{ category: string; count: number }>;
}
interface PilotHealthRow {
  tenant_id: string;
  plan_id: string;
  plan_name: string;
  lifecycle: LifecycleAssessment;
  activation: ActivationMilestones;
  current_period: string;
  current_usage: Record<string, number>;
  active_users: number;
  feedback: FeedbackSummary;
  risk: RiskLevel;
  risk_reasoning: string;
}
interface PilotHealthResponse {
  tenant_count: number;
  generated_at: string;
  rows: PilotHealthRow[];
  risk_breakdown: Array<{ risk: RiskLevel; count: number }>;
  stage_breakdown: Array<{ stage: LifecycleStage; label: string; count: number }>;
}

const RISK_INTENT: Record<RiskLevel, "danger" | "warning" | "info" | "success"> = {
  high: "danger",
  medium: "warning",
  low: "info",
  none: "success",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
  none: "On track",
};

export default function AdminPilotHealthPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Pilot Health"
      description="Per-tenant pilot risk + activation milestones + feedback signals. Highest-attention pilots at the top."
      subtitle="Commercial"
    >
      <PilotHealthView />
    </PageRestrictedGuard>
  );
}

function PilotHealthView(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useSWR<PilotHealthResponse>(
    "/api/admin/pilot-health",
    fetcher,
    { refreshInterval: 60_000 },
  );
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [stageFilter, setStageFilter] = useState<LifecycleStage | "all">("all");

  const filtered = useMemo(() => {
    if (!data) return [] as PilotHealthRow[];
    return data.rows.filter((r) => {
      if (riskFilter !== "all" && r.risk !== riskFilter) return false;
      if (stageFilter !== "all" && r.lifecycle.stage !== stageFilter) return false;
      return true;
    });
  }, [data, riskFilter, stageFilter]);

  if (error) {
    return (
      <PageShell title="Pilot Health">
        <ErrorState
          title="Could not load pilot health"
          description="The aggregation store may be offline. Try again."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Pilot Health"
      description="Per-tenant risk + activation + feedback signals — sorted highest-attention first"
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
          icon={<Activity />}
          title="No tenants yet"
          description="Tenants appear here once they record usage or sign up users."
        />
      ) : (
        <VStack gap="lg">
          <HStack gap="md" className="flex-wrap">
            <KPI label="Tenants" value={data.tenant_count} />
            {data.risk_breakdown.map((r) => (
              <KPI
                key={r.risk}
                label={RISK_LABEL[r.risk]}
                value={r.count}
                intent={RISK_INTENT[r.risk] === "danger" ? "danger" : RISK_INTENT[r.risk] === "warning" ? "warning" : undefined}
              />
            ))}
          </HStack>

          <FilterBar>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel | "all")}
              className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
            >
              <option value="all">All risk levels</option>
              <option value="high">High risk</option>
              <option value="medium">Medium risk</option>
              <option value="low">Low risk</option>
              <option value="none">On track</option>
            </select>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as LifecycleStage | "all")}
              className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
            >
              <option value="all">All stages</option>
              {data.stage_breakdown.map((s) => (
                <option key={s.stage} value={s.stage}>
                  {s.label} ({s.count})
                </option>
              ))}
            </select>
          </FilterBar>

          <Card>
            <CardHeader title={`Tenants (${filtered.length}${filtered.length !== data.tenant_count ? ` of ${data.tenant_count}` : ""})`} />
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase opacity-60">
                    <th className="pb-1">Tenant</th>
                    <th className="pb-1">Risk</th>
                    <th className="pb-1">Stage</th>
                    <th className="pb-1">Activation</th>
                    <th className="pb-1 text-right">Users</th>
                    <th className="pb-1 text-right">Feedback (open / total)</th>
                    <th className="pb-1">Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.tenant_id} className="border-t border-[var(--mist)] align-top">
                      <td className="py-2 font-mono text-[11px]">
                        {r.tenant_id.slice(0, 16)}
                        <div className="mt-0.5 text-[10px] opacity-60">{r.plan_name}</div>
                      </td>
                      <td className="py-2">
                        <Badge intent={RISK_INTENT[r.risk]} size="sm">
                          {r.risk === "high" && (
                            <AlertTriangle size={10} className="mr-1 inline" />
                          )}
                          {RISK_LABEL[r.risk]}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge intent={STAGE_INTENT[r.lifecycle.stage]} size="sm">
                          {STAGE_LABELS[r.lifecycle.stage]}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <ActivationDots activation={r.activation} />
                      </td>
                      <td className="py-2 text-right font-mono">{r.active_users}</td>
                      <td className="py-2 text-right font-mono">
                        {r.feedback.open} / {r.feedback.total}
                        {r.feedback.latest_age_days !== null && (
                          <div className="text-[10px] opacity-60">
                            latest {r.feedback.latest_age_days}d ago
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-[11px] opacity-70">{r.risk_reasoning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="text-[10px] opacity-50">
            Generated {data.generated_at}. Risk derivation: high = churning;
            medium = dormant or activating beyond week 2; low = activated
            but &lt;3 of 5 activation milestones; none = engaged or new.
            All signals derived from real usage + feedback — no synthetic scoring.
          </div>
        </VStack>
      )}
    </PageShell>
  );
}

function ActivationDots({ activation }: { activation: ActivationMilestones }): React.JSX.Element {
  const items: { label: string; on: boolean }[] = [
    { label: "Scan", on: activation.has_scanned },
    { label: "Integr.", on: activation.has_first_integration },
    { label: "Remed.", on: activation.has_first_remediation },
    { label: "Incid.", on: activation.has_first_incident },
    { label: "Export", on: activation.has_first_export },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map((it) => (
        <span
          key={it.label}
          title={`${it.label}: ${it.on ? "yes" : "no"}`}
          className={`inline-block h-2 w-2 rounded-full ${it.on ? "bg-[var(--matcha-500)]" : "bg-[var(--mist)]"}`}
        />
      ))}
      <span className="ml-1 text-[10px] opacity-60">{activation.count}/5</span>
    </div>
  );
}
