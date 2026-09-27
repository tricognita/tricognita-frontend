"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { ArrowUpRight, CheckCircle2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  PageShell,
  Skeleton,
  VStack,
} from "@/lib/ui";
import { fetcher } from "@/lib/swr-fetcher";
import {
  PLANS,
  PLAN_ORDER,
  type PlanDefinition,
  type FeatureKey,
} from "@/lib/plans";
import {
  STAGE_INTENT,
  STAGE_LABELS,
  type LifecycleAssessment,
} from "@/lib/lifecycle";

interface QuotaRow {
  key: string;
  limit: number;
  used: number | null;
  pct: number | null;
  overage_allowed: boolean;
}
interface UsageHistory {
  period: string;
  counters: Record<string, number>;
  active_users: number;
}
interface UsageResponse {
  plan: PlanDefinition;
  period: string;
  usage: Record<string, number>;
  active_users: number;
  quotas: QuotaRow[];
  lifecycle: LifecycleAssessment;
  history: UsageHistory[];
}

const QUOTA_LABELS: Record<string, string> = {
  scans_per_month: "Scans / month",
  exports_per_month: "Exports / month",
  webhook_subscriptions: "Webhook subscriptions",
  team_members: "Team members",
  cloud_accounts: "Cloud accounts",
};

const FEATURE_LABELS: Record<FeatureKey, string> = {
  autonomous_remediation: "Autonomous remediation",
  ai_remediation: "AI-assisted remediation",
  multi_account: "Multi-account scanning",
  webhooks: "Webhook integrations",
  slack_integration: "Slack integration",
  siem_export: "SIEM NDJSON export",
  soc2_evidence_pack: "SOC 2 evidence pack",
  executive_reporting: "Executive reporting",
  attack_graph: "Attack graph",
  zero_trust: "Zero trust dashboards",
  policy_management: "Policy management",
  priority_support: "Priority support",
  customer_managed_kms: "Customer-managed KMS",
};

const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as FeatureKey[];

export default function PlanPage() {
  return <PlanView />;
}

function PlanView(): React.JSX.Element {
  const { data, error, isLoading } = useSWR<UsageResponse>(
    "/api/usage",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const upgradeTarget = useMemo<PlanDefinition | null>(() => {
    if (!data) return null;
    const idx = PLAN_ORDER.indexOf(data.plan.id);
    if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
    return PLANS[PLAN_ORDER[idx + 1]];
  }, [data]);

  if (error) {
    return (
      <PageShell title="Plan">
        <ErrorState
          title="Could not load plan"
          description="The usage store may be offline. Try again in a moment."
        />
      </PageShell>
    );
  }

  if (isLoading || !data) {
    return (
      <PageShell title="Plan" description="Plan, usage, and quota status">
        <Skeleton className="h-48 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Plan & usage"
      description={`Current period: ${data.period} · ${data.active_users} active user(s)`}
    >
      <VStack gap="lg">
        <Card>
          <CardHeader title={`${data.plan.name} — ${data.plan.tagline}`} />
          <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">
                Pricing
              </div>
              <div className="text-xs">{data.plan.pricing_summary}</div>
              <div className="mt-3 text-[10px] uppercase tracking-wider opacity-60">
                Good fit for
              </div>
              <div className="text-xs">{data.plan.good_fit_for}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-60">
                Lifecycle stage
              </div>
              <div className="mt-1">
                <Badge intent={STAGE_INTENT[data.lifecycle.stage]} size="md">
                  {STAGE_LABELS[data.lifecycle.stage]}
                </Badge>
              </div>
              <div className="mt-2 text-xs opacity-80">{data.lifecycle.reasoning}</div>
              <div className="mt-3 text-[10px] uppercase tracking-wider opacity-60">
                Engagement signals
              </div>
              <SignalGrid signals={data.lifecycle.signals} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Quota status" />
          <div className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase opacity-60">
                  <th className="pb-1">Dimension</th>
                  <th className="pb-1 text-right">Used</th>
                  <th className="pb-1 text-right">Limit</th>
                  <th className="pb-1">Usage</th>
                </tr>
              </thead>
              <tbody>
                {data.quotas.map((q) => (
                  <tr key={q.key} className="border-t border-[var(--mist)]">
                    <td className="py-2">{QUOTA_LABELS[q.key] ?? q.key}</td>
                    <td className="py-2 text-right font-mono">
                      {q.used === null ? <span className="opacity-50">—</span> : q.used}
                    </td>
                    <td className="py-2 text-right font-mono">{q.limit}</td>
                    <td className="py-2">
                      {q.pct === null ? (
                        <span className="text-[10px] opacity-50">
                          not measured this period
                        </span>
                      ) : (
                        <UsageBar pct={q.pct} overage={q.overage_allowed} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-[10px] opacity-60">
              {data.quotas.some((q) => q.overage_allowed)
                ? "Overage is allowed — usage above limit is supported, may trigger pricing review."
                : "Hard cap — usage above limit is blocked."}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Feature availability" />
          <div className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase opacity-60">
                  <th className="pb-1">Feature</th>
                  <th className="pb-1 text-center">On your plan</th>
                  {upgradeTarget && (
                    <th className="pb-1 text-center">On {upgradeTarget.name}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {FEATURE_KEYS.map((k) => {
                  const hasOnCurrent = data.plan.features[k];
                  const hasOnNext = upgradeTarget?.features[k] ?? false;
                  return (
                    <tr key={k} className="border-t border-[var(--mist)]">
                      <td className="py-1.5">{FEATURE_LABELS[k]}</td>
                      <td className="py-1.5 text-center">
                        {hasOnCurrent ? (
                          <CheckCircle2
                            size={14}
                            className="inline text-[var(--matcha-500)]"
                          />
                        ) : (
                          <X size={14} className="inline opacity-40" />
                        )}
                      </td>
                      {upgradeTarget && (
                        <td className="py-1.5 text-center">
                          {hasOnNext ? (
                            <CheckCircle2
                              size={14}
                              className="inline text-[var(--matcha-500)]"
                            />
                          ) : (
                            <X size={14} className="inline opacity-40" />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {upgradeTarget ? (
          <Card>
            <CardHeader title={`Consider upgrading to ${upgradeTarget.name}`} />
            <div className="p-3 text-xs">
              <p className="mb-2">{upgradeTarget.tagline}</p>
              <p className="mb-3 opacity-80">{upgradeTarget.good_fit_for}</p>
              <p className="mb-3 opacity-60">
                Pricing during pilot phase is bespoke. Contact{" "}
                <a
                  className="text-[var(--matcha-500)] underline"
                  href="mailto:sales@tricognita.com"
                >
                  sales@tricognita.com
                </a>{" "}
                to discuss.
              </p>
              <a
                href={`mailto:sales@tricognita.com?subject=Upgrade%20to%20Tricognita%20${encodeURIComponent(upgradeTarget.name)}`}
                className="inline-flex items-center gap-1.5 rounded bg-[var(--matcha-500)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:opacity-90"
              >
                <ArrowUpRight size={14} /> Talk to us about {upgradeTarget.name}
              </a>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader title="You're on the top tier" />
            <div className="p-3 text-xs opacity-80">
              Enterprise is the current top tier. Feature requests or custom
              terms? Email{" "}
              <a
                className="text-[var(--matcha-500)] underline"
                href="mailto:sales@tricognita.com"
              >
                sales@tricognita.com
              </a>
              .
            </div>
          </Card>
        )}

        <Card>
          <CardHeader title="6-month history" />
          <div className="overflow-x-auto p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase opacity-60">
                  <th className="pb-1">Period</th>
                  <th className="pb-1 text-right">Scans</th>
                  <th className="pb-1 text-right">Exports</th>
                  <th className="pb-1 text-right">Webhooks ok</th>
                  <th className="pb-1 text-right">Webhooks failed</th>
                  <th className="pb-1 text-right">Incidents</th>
                  <th className="pb-1 text-right">Active users</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((m) => (
                  <tr key={m.period} className="border-t border-[var(--mist)]">
                    <td className="py-1.5 font-mono">{m.period}</td>
                    <td className="py-1.5 text-right font-mono">
                      {m.counters.scans ?? 0}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {m.counters.exports ?? 0}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {m.counters.webhooks_delivered ?? 0}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {m.counters.webhooks_failed ?? 0}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {m.counters.incidents_declared ?? 0}
                    </td>
                    <td className="py-1.5 text-right font-mono">{m.active_users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="text-[10px] opacity-50">
          Usage data is monthly with ~13 months trailing retention. Lifecycle
          stage is derived from 6-month usage signals; thresholds documented
          in /docs/PRICING_MODEL.md.
        </div>
      </VStack>
    </PageShell>
  );
}

function UsageBar({
  pct,
  overage,
}: {
  pct: number;
  overage: boolean;
}): React.JSX.Element {
  const color =
    pct >= 100
      ? overage
        ? "bg-[var(--amber-clay)]"
        : "bg-[var(--ember)]"
      : pct >= 80
        ? "bg-[var(--amber-clay)]"
        : "bg-[var(--matcha-500)]";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-[var(--mist)]">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="font-mono text-[10px] opacity-70">{pct.toFixed(0)}%</span>
    </div>
  );
}

function SignalGrid({
  signals,
}: {
  signals: LifecycleAssessment["signals"];
}): React.JSX.Element {
  const rows: { label: string; on: boolean }[] = [
    { label: "Scanned", on: signals.has_scanned },
    { label: "Exported", on: signals.has_exported },
    { label: "Webhook", on: signals.has_webhook },
    { label: "Incident", on: signals.has_incident },
    { label: "Remediation", on: signals.has_remediation },
  ];
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {rows.map((r) => (
        <Badge key={r.label} intent={r.on ? "success" : "neutral"} size="sm">
          {r.label}
        </Badge>
      ))}
      <Badge intent="neutral" size="sm">
        {signals.months_with_usage}mo active
      </Badge>
    </div>
  );
}
