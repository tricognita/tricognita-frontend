"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Activity, GitBranch, RefreshCw, Server, Zap } from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
  ErrorState,
  HStack,
  KPI,
  PageShell,
  Skeleton,
  StatusDot,
  VStack,
} from "@/lib/ui";
import { PageRestrictedGuard } from "../../components/PageRestrictedGuard";
import { fetcher, statusOf } from "@/lib/swr-fetcher";

interface QuotaSnap {
  current: number;
  limit: number;
  ttl: number | null;
}

interface BackendSnap {
  reachable: boolean;
  status?: string;
  uptime_hours?: number;
  error?: string;
}

interface ReleaseSnap {
  version: string;
  sha: string;
  branch: string;
  env: "production" | "preview" | "development" | "dev";
  deployedAt: string | null;
  label: string;
}

interface OpsSnapshot {
  tenant_id: string;
  timestamp: string;
  release?: ReleaseSnap;
  quotas: {
    scan: QuotaSnap;
    remediate: QuotaSnap;
  };
  backend: BackendSnap;
}

/**
 * /dashboard/admin/operations
 *
 * ADMIN-only operational surface — first internal "ops console" for
 * production debugging. Surfaces per-tenant quota state, Go backend
 * health, and (in the future) cross-tenant aggregates.
 *
 * Refreshes every 15s (vs the 5-min dashboard default) so it can be
 * left open during incident triage.
 */
export default function AdminOperationsPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Platform Operations"
      description="Internal operational surface: tenant quotas, backend health, queue diagnostics."
      subtitle="Operations"
    >
      <OperationsView />
    </PageRestrictedGuard>
  );
}

function OperationsView() {
  const { data, error, isLoading, mutate } = useSWR<OpsSnapshot>(
    "/api/admin/ops",
    fetcher,
    {
      refreshInterval: 15_000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    },
  );

  // Format the "last refreshed" tick locally so the time always reflects
  // wall-clock (avoids SSR/hydration mismatch).
  const [lastTick, setLastTick] = useState<string | null>(null);
  useEffect(() => {
    if (data?.timestamp) {
      const d = new Date(data.timestamp);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastTick(d.toLocaleTimeString());
    }
  }, [data?.timestamp]);

  const backendIntent: BadgeIntent = data?.backend.reachable
    ? data.backend.status === "healthy"
      ? "success"
      : "warning"
    : "danger";

  return (
    <PageShell
      eyebrow="Administration · Ops console"
      title="Platform Operations"
      description="Tenant quotas, backend reachability, and operational diagnostics. Refreshes every 15 seconds; use the manual refresh during incident triage."
      meta={
        <HStack gap="sm" align="center" wrap>
          <StatusDot
            intent={isLoading ? "info" : error ? "danger" : "success"}
            pulse={isLoading}
            size="sm"
            label={
              isLoading
                ? "Loading…"
                : error
                  ? `HTTP ${statusOf(error) ?? "?"}`
                  : lastTick
                    ? `Updated ${lastTick}`
                    : "Live"
            }
          />
          {data?.tenant_id && (
            <Badge intent="neutral" variant="subtle" size="xs" mono>
              tenant {data.tenant_id}
            </Badge>
          )}
        </HStack>
      }
      actions={
        <Button
          variant="ghost"
          size="md"
          icon={<RefreshCw size={12} />}
          onClick={() => mutate()}
          loading={isLoading}
        >
          Refresh
        </Button>
      }
      width="default"
      density="tight"
    >
      {/* Release / version */}
      {data?.release && (
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Release"
            title="Deployed version"
            description="The exact build serving this dashboard. Share the sha + env when filing an incident — it pins the deploy on the BFF + Go log timelines."
            actions={
              <Badge
                intent={
                  data.release.env === "production"
                    ? "success"
                    : data.release.env === "preview"
                      ? "info"
                      : "warning"
                }
                variant="subtle"
                size="sm"
                mono
              >
                {data.release.env}
              </Badge>
            }
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Version</p>
              <p className="text-lg font-bold tabular-nums text-[var(--stone-100)]">
                v{data.release.version}
              </p>
            </div>
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">SHA</p>
              <p className="text-sm font-mono text-[var(--stone-200)] flex items-center gap-1.5">
                <GitBranch size={11} className="text-[var(--matcha-300)]" />
                {data.release.sha}
              </p>
            </div>
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Branch</p>
              <p className="text-sm font-mono text-[var(--stone-300)]">
                {data.release.branch}
              </p>
            </div>
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Deployed</p>
              <p className="text-xs text-[var(--stone-400)]">
                {data.release.deployedAt
                  ? new Date(data.release.deployedAt).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Backend health */}
      <Card variant="elevated" density="comfortable">
        <CardHeader
          eyebrow="Infrastructure"
          title="Go backend"
          description="Liveness probe to the Go control plane. A reachable backend with status=healthy is the precondition for live scans, ARIA, compliance scoring, and findings — when this is degraded, every dashboard surface falls back to reference data."
        />
        {isLoading && !data && (
          <Skeleton variant="block" height="80px" />
        )}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Reachable</p>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  data.backend.reachable
                    ? "text-[var(--matcha-300)]"
                    : "text-[var(--ember-glow)]"
                }`}
              >
                {data.backend.reachable ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Status</p>
              <Badge
                intent={backendIntent}
                variant="subtle"
                size="md"
                mono
              >
                {data.backend.status ?? data.backend.error ?? "unknown"}
              </Badge>
            </div>
            {typeof data.backend.uptime_hours === "number" && (
              <div>
                <p className="eyebrow text-[var(--stone-500)] mb-1">Uptime</p>
                <p className="text-2xl font-bold tabular-nums text-[var(--stone-100)]">
                  {data.backend.uptime_hours}h
                </p>
              </div>
            )}
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Endpoint</p>
              <p className="text-xs font-mono text-[var(--stone-400)] mt-2 break-all">
                /healthz
              </p>
            </div>
          </div>
        )}
        {error && !data && (
          <ErrorState
            variant="degraded"
            title="Operations snapshot unavailable"
            description="The /api/admin/ops endpoint did not respond. The Operations console is itself unreachable — fall back to direct BFF log inspection in Vercel."
            detail={error instanceof Error ? error.message : undefined}
          />
        )}
      </Card>

      {/* Tenant quotas */}
      <Card variant="elevated" density="comfortable">
        <CardHeader
          eyebrow="Throttling"
          title="Your tenant's quotas"
          description="Live per-tenant action concurrency. Quotas reset after their TTL window expires; the BFF returns 429 + Retry-After when a tenant exceeds its allotment. Adjust limits in lib/tenant-quota.ts."
        />
        {isLoading && !data && (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="kpi" />
            <Skeleton variant="kpi" />
          </div>
        )}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuotaKPI label="Scan" snap={data.quotas.scan} icon={<Activity size={14} />} />
            <QuotaKPI label="Remediate" snap={data.quotas.remediate} icon={<Zap size={14} />} />
          </div>
        )}
      </Card>

      {/* Future-work placeholder */}
      <Card variant="default" density="comfortable">
        <CardHeader
          eyebrow="Roadmap"
          title="Operational tooling — coming next"
          description="The Operations console will expand with the items below as their backing data becomes available."
        />
        <VStack gap="sm">
          {[
            {
              icon: <Server size={14} className="text-[var(--matcha-300)]" />,
              title: "Cross-tenant quota matrix",
              note: "Requires Go API admin endpoint exposing peek across all active tenants.",
            },
            {
              icon: <Activity size={14} className="text-[var(--mist)]" />,
              title: "Request-id → log line lookup",
              note: "Requires Vercel / Fly log-aggregator integration so an operator can paste a correlation id and see the full BFF + Go trace.",
            },
            {
              icon: <Zap size={14} className="text-[var(--amber-clay)]" />,
              title: "Scan queue inspection",
              note: "Requires Go API to expose pending-scan queue depth + per-tenant queue breakdown.",
            },
          ].map((item) => (
            <HStack key={item.title} gap="sm" align="start">
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div>
                <p className="text-xs font-semibold text-[var(--stone-200)]">
                  {item.title}
                </p>
                <p className="text-[11px] text-[var(--stone-500)] leading-relaxed mt-0.5">
                  {item.note}
                </p>
              </div>
            </HStack>
          ))}
        </VStack>
      </Card>
    </PageShell>
  );
}

function QuotaKPI({
  label,
  snap,
  icon,
}: {
  label: string;
  snap: QuotaSnap;
  icon: React.ReactNode;
}) {
  const utilization = snap.limit > 0 ? snap.current / snap.limit : 0;
  const intent =
    utilization >= 1 ? "danger" : utilization >= 0.7 ? "warning" : "success";
  return (
    <KPI
      label={
        <HStack gap="xs" align="center">
          {icon}
          <span>{label}</span>
        </HStack>
      }
      value={`${snap.current}/${snap.limit}`}
      intent={intent}
      hint={
        snap.ttl !== null && snap.ttl > 0
          ? `Counter resets in ${snap.ttl}s`
          : "Counter idle (no active in-flight requests)"
      }
    />
  );
}
