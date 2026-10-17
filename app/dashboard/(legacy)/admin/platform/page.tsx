"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Activity,
  Building2,
  Database,
  GitBranch,
  RefreshCw,
  Server,
  Zap,
} from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  HStack,
  KPI,
  PageShell,
  Skeleton,
  StatusDot,
  Table,
  TBody,
  TBodyEmpty,
  TD,
  TH,
  THead,
  TR,
  Timeline,
  TimelineItem,
  VStack,
} from "@/lib/ui";
import { PageRestrictedGuard } from "../../components/PageRestrictedGuard";
import { fetcher } from "@/lib/swr-fetcher";

interface QuotaSnap {
  tenantId: string;
  current: number;
  limit: number;
  ttl: number | null;
}

interface TenantSummary {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at?: string;
}

interface AdminEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  tenant_id: string | null;
  timestamp: string;
}

interface PlatformSnapshot {
  release: {
    version: string;
    sha: string;
    branch: string;
    env: string;
    deployedAt: string | null;
    label: string;
  };
  timestamp: string;
  backend: {
    reachable: boolean;
    status?: string;
    uptime_hours?: number;
    error?: string;
  };
  redis: { reachable: boolean; error?: string };
  tenants: TenantSummary[];
  quotas: { scan: QuotaSnap[]; remediate: QuotaSnap[] };
  recentEvents: AdminEvent[];
  aggregates: {
    tenantCount: number;
    scanQuotaInUseTenants: number;
    remediationQuotaInUseTenants: number;
  };
}

export default function PlatformOpsPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Platform Operations"
      description="Cross-tenant operational view for platform operators."
      subtitle="Platform"
    >
      <PlatformView />
    </PageRestrictedGuard>
  );
}

function PlatformView() {
  const { data, error, isLoading, mutate } = useSWR<PlatformSnapshot>(
    "/api/admin/platform",
    fetcher,
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    },
  );

  const [lastTick, setLastTick] = useState<string | null>(null);
  useEffect(() => {
    if (data?.timestamp) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastTick(new Date(data.timestamp).toLocaleTimeString());
    }
  }, [data?.timestamp]);

  const planIntent: Record<string, BadgeIntent> = {
    free: "neutral",
    starter: "info",
    professional: "violet",
    enterprise: "success",
  };

  const eventIntent: Record<string, BadgeIntent> = {
    incident: "danger",
    critical_finding: "danger",
    action_rejected: "warning",
    action_approved: "success",
    healing_mode: "warning",
    jit_approved: "info",
    jit_rejected: "warning",
    jit_requested: "info",
    api_key_created: "info",
    new_user: "info",
    scan_complete: "success",
  };

  return (
    <PageShell
      eyebrow="Platform · Cross-tenant"
      title="Platform Operations"
      description="Cross-tenant operational view. Refreshes every 30 seconds. Strictly internal — only platform-tenant ADMINs should reach this surface."
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
                  ? "Snapshot failed"
                  : lastTick
                    ? `Updated ${lastTick}`
                    : "Live"
            }
          />
          {data?.release && (
            <Badge intent="neutral" variant="subtle" size="xs" mono>
              <GitBranch size={9} className="mr-1" />
              {data.release.sha} · {data.release.env}
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
      width="wide"
      density="tight"
    >
      {/* Platform aggregates */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading && !data && (
          <>
            <Skeleton variant="kpi" />
            <Skeleton variant="kpi" />
            <Skeleton variant="kpi" />
            <Skeleton variant="kpi" />
          </>
        )}
        {data && (
          <>
            <KPI
              label={
                <HStack gap="xs" align="center">
                  <Building2 size={11} />
                  <span>Tenants</span>
                </HStack>
              }
              value={data.aggregates.tenantCount}
              intent="neutral"
              hint={
                data.aggregates.tenantCount === 0
                  ? "Inventory endpoint unreachable or no orgs registered"
                  : `Across ${
                      new Set(data.tenants.map((t) => t.plan)).size
                    } plan tiers`
              }
            />
            <KPI
              label={
                <HStack gap="xs" align="center">
                  <Activity size={11} />
                  <span>Scan quota in use</span>
                </HStack>
              }
              value={data.aggregates.scanQuotaInUseTenants}
              intent={
                data.aggregates.scanQuotaInUseTenants > 5 ? "warning" : "success"
              }
              hint="Tenants with at least one in-flight scan"
            />
            <KPI
              label={
                <HStack gap="xs" align="center">
                  <Zap size={11} />
                  <span>Remediations in flight</span>
                </HStack>
              }
              value={data.aggregates.remediationQuotaInUseTenants}
              intent="info"
              hint="Tenants with at least one active remediation"
            />
            <KPI
              label={
                <HStack gap="xs" align="center">
                  <Server size={11} />
                  <span>Infrastructure</span>
                </HStack>
              }
              value={
                data.backend.reachable && data.redis.reachable
                  ? "Healthy"
                  : "Degraded"
              }
              intent={
                data.backend.reachable && data.redis.reachable
                  ? "success"
                  : "danger"
              }
              hint={
                data.backend.reachable
                  ? `Go: ${data.backend.status ?? "ok"} · Redis: ${
                      data.redis.reachable ? "ok" : "down"
                    }`
                  : "Go API unreachable"
              }
            />
          </>
        )}
      </div>

      {/* Tenant inventory */}
      <Card variant="elevated" density="comfortable">
        <CardHeader
          eyebrow="Inventory"
          title="Tenants"
          description="All registered orgs from the Go organization registry. Falls back gracefully when the endpoint is unavailable — quota state below still works."
        />
        {isLoading && !data && (
          <div className="space-y-2">
            <Skeleton variant="text" lines={3} />
          </div>
        )}
        {data && (
          <Table density="compact">
            <THead>
              <TR>
                <TH>Tenant</TH>
                <TH>Plan</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                <TH align="right">Scan quota</TH>
              </TR>
            </THead>
            <TBody>
              {data.tenants.length === 0 ? (
                <TBodyEmpty colSpan={5}>
                  <EmptyState
                    icon={<Building2 size={20} className="text-[var(--matcha-300)]" />}
                    title="No tenants in inventory"
                    description="The Go /api/organizations endpoint returned nothing or is unreachable. Per-tenant quota data below is still available."
                  />
                </TBodyEmpty>
              ) : (
                data.tenants.map((t) => {
                  const scanSnap = data.quotas.scan.find(
                    (q) => q.tenantId === t.id,
                  );
                  return (
                    <TR key={t.id}>
                      <TD>
                        <p className="font-semibold text-[var(--stone-100)]">
                          {t.name || t.id}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--stone-500)] mt-0.5">
                          {t.id}
                        </p>
                      </TD>
                      <TD>
                        <Badge
                          intent={planIntent[t.plan] ?? "neutral"}
                          variant="subtle"
                          size="xs"
                          mono
                        >
                          {t.plan ?? "—"}
                        </Badge>
                      </TD>
                      <TD>
                        <Badge intent="neutral" variant="outline" size="xs" mono>
                          {t.status ?? "active"}
                        </Badge>
                      </TD>
                      <TD className="text-[11px] text-[var(--stone-500)]">
                        {t.created_at
                          ? new Date(t.created_at).toLocaleDateString()
                          : "—"}
                      </TD>
                      <TD align="right">
                        {scanSnap ? (
                          <span
                            className={`font-mono text-xs tabular-nums ${
                              scanSnap.current >= scanSnap.limit
                                ? "text-[var(--ember-glow)]"
                                : scanSnap.current > 0
                                  ? "text-[var(--amber-clay)]"
                                  : "text-[var(--stone-500)]"
                            }`}
                          >
                            {scanSnap.current}/{scanSnap.limit}
                          </span>
                        ) : (
                          <span className="text-[var(--stone-600)] text-xs">—</span>
                        )}
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Operational metrics — derived from recentEvents */}
      {data && data.recentEvents.length > 0 && (
        <OperationalMetricsCard events={data.recentEvents} />
      )}

      {/* Active quota usage (cross-tenant) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Concurrency"
            title="Scans in flight (cross-tenant)"
            description="Live Redis snapshot. Tenants saturating quota are the highest-priority for capacity review."
          />
          <ActiveQuotaList snaps={data?.quotas.scan ?? []} loading={isLoading && !data} />
        </Card>
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Concurrency"
            title="Remediations in flight"
            description="Live Redis snapshot."
          />
          <ActiveQuotaList
            snaps={data?.quotas.remediate ?? []}
            loading={isLoading && !data}
          />
        </Card>
      </div>

      {/* Recent cross-tenant events */}
      <Card variant="elevated" density="comfortable">
        <CardHeader
          eyebrow="Activity"
          title="Recent platform events"
          description="Last 30 events from the cross-tenant admin notification feed. Tenant-tagged where available."
        />
        {isLoading && !data && (
          <Skeleton variant="text" lines={4} />
        )}
        {data && data.recentEvents.length === 0 && (
          <EmptyState
            title="No recent events"
            description="Platform is quiet, or the admin notification feed is empty."
            variant="compact"
          />
        )}
        {data && data.recentEvents.length > 0 && (
          <Timeline density="compact">
            {data.recentEvents.slice(0, 20).map((e) => (
              <TimelineItem
                key={e.id}
                intent={eventIntent[e.type] ?? "neutral"}
                time={new Date(e.timestamp).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                title={
                  <span>
                    <Badge intent="neutral" variant="subtle" size="xs" mono className="mr-2">
                      {e.type}
                    </Badge>
                    {e.title}
                  </span>
                }
                action={
                  e.tenant_id && (
                    <Badge intent="neutral" variant="outline" size="xs" mono>
                      {e.tenant_id.slice(0, 12)}
                    </Badge>
                  )
                }
              >
                <p className="text-[11px] text-[var(--stone-500)] leading-relaxed">
                  {e.body}
                </p>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Card>

      {/* Error state — full platform unreachable */}
      {error && !data && (
        <ErrorState
          variant="degraded"
          title="Platform snapshot unavailable"
          description="The /api/admin/platform endpoint did not respond. Use /dashboard/admin/operations for the single-tenant view as a fallback."
          detail={error instanceof Error ? error.message : undefined}
        />
      )}

      {/* Infrastructure card — release + backend + redis */}
      {data && (
        <Card variant="default" density="comfortable">
          <CardHeader
            eyebrow="Infrastructure"
            title="Component health"
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Version</p>
              <p className="text-sm font-mono text-[var(--stone-200)]">
                v{data.release.version} · {data.release.sha}
              </p>
            </div>
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Environment</p>
              <Badge
                intent={
                  data.release.env === "production"
                    ? "success"
                    : data.release.env === "preview"
                      ? "info"
                      : "warning"
                }
                variant="subtle"
                size="xs"
                mono
              >
                {data.release.env}
              </Badge>
            </div>
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Go API</p>
              <HStack gap="xs" align="center">
                <StatusDot
                  intent={data.backend.reachable ? "success" : "danger"}
                  size="sm"
                />
                <span className="text-xs text-[var(--stone-300)] font-mono">
                  {data.backend.reachable
                    ? `${data.backend.status} · ${data.backend.uptime_hours ?? "—"}h`
                    : data.backend.error ?? "down"}
                </span>
              </HStack>
            </div>
            <div>
              <p className="eyebrow text-[var(--stone-500)] mb-1">Redis</p>
              <HStack gap="xs" align="center">
                <StatusDot
                  intent={data.redis.reachable ? "success" : "danger"}
                  size="sm"
                />
                <span className="text-xs text-[var(--stone-300)] font-mono">
                  <Database size={10} className="inline mr-1" />
                  {data.redis.reachable
                    ? "Upstash connected"
                    : data.redis.error ?? "down"}
                </span>
              </HStack>
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}

function ActiveQuotaList({
  snaps,
  loading,
}: {
  snaps: QuotaSnap[];
  loading: boolean;
}) {
  if (loading) return <Skeleton variant="text" lines={3} />;
  const active = snaps.filter((s) => s.current > 0);
  if (active.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="No active usage"
        description="No tenants currently consuming this quota."
      />
    );
  }
  return (
    <VStack gap="sm">
      {active.map((s) => {
        const pct = Math.min(100, (s.current / s.limit) * 100);
        const intent =
          s.current >= s.limit ? "danger" : s.current / s.limit >= 0.7 ? "warning" : "success";
        return (
          <div key={s.tenantId}>
            <HStack justify="between" align="center" className="mb-1">
              <span className="text-[11px] font-mono text-[var(--stone-300)]">
                {s.tenantId}
              </span>
              <span
                className={`text-xs font-bold tabular-nums ${
                  intent === "danger"
                    ? "text-[var(--ember-glow)]"
                    : intent === "warning"
                      ? "text-[var(--amber-clay)]"
                      : "text-[var(--matcha-300)]"
                }`}
              >
                {s.current}/{s.limit}
              </span>
            </HStack>
            <div
              className="h-1 rounded-full bg-[var(--ink-deep)] overflow-hidden"
              role="progressbar"
              aria-valuenow={s.current}
              aria-valuemax={s.limit}
              aria-label={`Tenant ${s.tenantId} quota`}
            >
              <div
                className={`h-full ${
                  intent === "danger"
                    ? "bg-[var(--ember)]"
                    : intent === "warning"
                      ? "bg-[var(--amber-clay)]"
                      : "bg-[var(--matcha-400)]"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {s.ttl !== null && s.ttl > 0 && (
              <p className="text-[10px] text-[var(--stone-600)] mt-0.5">
                Resets in {s.ttl}s
              </p>
            )}
          </div>
        );
      })}
    </VStack>
  );
}

/**
 * OperationalMetricsCard — honestly-derived signal from the
 * cross-tenant admin notification feed. No fake telemetry.
 *
 * Buckets the last 30 events by event type and surfaces:
 *   - scan throughput (count of scan_complete events)
 *   - critical findings (count of critical_finding events)
 *   - action governance (count of action_rejected vs action_approved)
 *   - operator pressure (count of jit_requested events)
 *   - incidents (count of incident events)
 *
 * Window is "last 30 events" not "last hour" because we don't have a
 * timestamp-bucketed metric pipeline — we have an event-bounded feed.
 * Caveat noted in the description.
 */
function OperationalMetricsCard({ events }: { events: AdminEvent[] }) {
  const buckets: Record<string, number> = {};
  for (const e of events) {
    buckets[e.type] = (buckets[e.type] ?? 0) + 1;
  }
  const metrics = [
    {
      label: "Scans completed",
      value: buckets["scan_complete"] ?? 0,
      intent: "success" as const,
    },
    {
      label: "Critical findings",
      value: buckets["critical_finding"] ?? 0,
      intent: ((buckets["critical_finding"] ?? 0) > 0
        ? "danger"
        : "success") as "danger" | "success",
    },
    {
      label: "Actions approved",
      value: buckets["action_approved"] ?? 0,
      intent: "success" as const,
    },
    {
      label: "Actions rejected",
      value: buckets["action_rejected"] ?? 0,
      intent: ((buckets["action_rejected"] ?? 0) > 0
        ? "warning"
        : "neutral") as "warning" | "neutral",
    },
    {
      label: "JIT requests",
      value: buckets["jit_requested"] ?? 0,
      intent: "info" as const,
    },
    {
      label: "Active incidents",
      value: buckets["incident"] ?? 0,
      intent: ((buckets["incident"] ?? 0) > 0
        ? "danger"
        : "success") as "danger" | "success",
    },
  ];

  return (
    <Card variant="elevated" density="comfortable">
      <CardHeader
        eyebrow="Signal"
        title="Operational metrics (last 30 platform events)"
        description="Derived from the cross-tenant admin notification feed — no synthetic telemetry. Window is event-bounded (the last 30 events written to tricognita:notifications:admin), not time-bounded. For time-bucketed metrics, a future metrics pipeline is required."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-md border border-[var(--sage-soft)] bg-[var(--moss)] p-3"
          >
            <p className="eyebrow text-[var(--stone-500)] mb-1">{m.label}</p>
            <p
              className={`text-2xl font-bold tabular-nums ${
                m.intent === "danger"
                  ? "text-[var(--ember-glow)]"
                  : m.intent === "warning"
                    ? "text-[var(--amber-clay)]"
                    : m.intent === "success"
                      ? "text-[var(--matcha-300)]"
                      : m.intent === "info"
                        ? "text-[var(--mist)]"
                        : "text-[var(--stone-200)]"
              }`}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
