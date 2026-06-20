"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  Inbox,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
  EmptyState,
  HStack,
  KPI,
  PageShell,
  Skeleton,
  StatusDot,
  Timeline,
  TimelineItem,
  VStack,
} from "@/lib/ui";
import { fetcher, jsonFetch } from "@/lib/swr-fetcher";
import { useSession } from "@/lib/use-session";
import { canDo } from "@/lib/rbac";
import { PageRestrictedGuard } from "../components/PageRestrictedGuard";

interface IncidentLite {
  id: string;
  title: string;
  severity: "info" | "minor" | "major" | "critical";
  state: "active" | "acknowledged" | "resolved";
  assigned_to?: string | null;
  declared_at: string;
  escalation_level?: 0 | 1 | 2 | 3;
}
interface IncidentsResponse {
  active: IncidentLite[];
  resolved: IncidentLite[];
}

interface FindingLite {
  id: string;
  rule_id: string;
  resource_id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "RESOLVED" | "SUPPRESSED";
  title: string;
  risk_score: number;
  created_at: string;
}
interface FindingsResponse {
  findings: FindingLite[];
}

interface QuotaSnap {
  current: number;
  limit: number;
  ttl: number | null;
}
interface OpsSnap {
  release: { sha: string; env: string };
  backend: { reachable: boolean; status?: string };
  quotas: { scan: QuotaSnap; remediate: QuotaSnap };
}

interface AdminEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  tenant_id: string | null;
  timestamp: string;
}
interface PlatformSnap {
  recentEvents: AdminEvent[];
}

const SEV_INTENT: Record<string, BadgeIntent> = {
  critical: "danger",
  CRITICAL: "danger",
  major: "warning",
  HIGH: "warning",
  minor: "info",
  MEDIUM: "info",
  info: "neutral",
  LOW: "neutral",
};

export default function SocDashboardPage() {
  return (
    <PageRestrictedGuard
      capability="viewFindings"
      title="SOC Operations"
      description="High-density operator view: active incidents, triage queue, platform posture."
      subtitle="SOC"
    >
      <SocView />
    </PageRestrictedGuard>
  );
}

function SocView() {
  const { email: myEmail, role } = useSession();
  const isAdmin = role === "ADMIN";
  const canSeeIncidents = canDo(role, "manageSettings");

  const { data: incidentsResp, mutate: mutateIncidents } = useSWR<IncidentsResponse>(
    canSeeIncidents ? "/api/admin/incidents" : null,
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true },
  );
  const { data: findingsResp } = useSWR<FindingsResponse>(
    "/api/findings",
    fetcher,
    { refreshInterval: 30_000 },
  );
  const { data: ops, mutate: mutateOps } = useSWR<OpsSnap>(
    isAdmin ? "/api/admin/ops" : null,
    fetcher,
    { refreshInterval: 15_000 },
  );
  const { data: platform } = useSWR<PlatformSnap>(
    isAdmin ? "/api/admin/platform" : null,
    fetcher,
    { refreshInterval: 30_000 },
  );

  const activeIncidents = (incidentsResp?.active ?? []).filter(
    (i) => i.state !== "resolved",
  );
  const criticalFindings = (findingsResp?.findings ?? [])
    .filter((f) => f.status === "OPEN" && f.severity === "CRITICAL")
    .slice(0, 8);
  const highFindings = (findingsResp?.findings ?? []).filter(
    (f) => f.status === "OPEN" && f.severity === "HIGH",
  );

  const platformHealthy = ops?.backend.reachable ?? true;

  async function quickAck(incidentId: string) {
    try {
      await jsonFetch(
        `/api/admin/incidents?id=${incidentId}&op=ack`,
        "PATCH",
        {},
      );
      mutateIncidents();
    } catch {
      /* surfaces in BFF logs */
    }
  }

  async function quickAssignMe(incidentId: string) {
    if (!myEmail) return;
    try {
      await jsonFetch(
        `/api/admin/incidents?id=${incidentId}&op=assign`,
        "PATCH",
        { assign_to: myEmail },
      );
      mutateIncidents();
    } catch {
      /* surfaces in BFF logs */
    }
  }

  return (
    <PageShell
      eyebrow="Operations · SOC mode"
      title="SOC Operations"
      description="High-density operator view. Refreshes every 15 seconds. Designed for active triage during incidents."
      meta={
        <HStack gap="sm" align="center" wrap>
          <StatusDot
            intent={
              activeIncidents.length > 0
                ? "danger"
                : !platformHealthy
                  ? "warning"
                  : "success"
            }
            pulse={activeIncidents.length > 0 || !platformHealthy}
            size="sm"
            label={
              activeIncidents.length > 0
                ? `${activeIncidents.length} active incident${activeIncidents.length === 1 ? "" : "s"}`
                : !platformHealthy
                  ? "Platform degraded"
                  : "All clear"
            }
          />
        </HStack>
      }
      actions={
        <Button
          variant="ghost"
          size="md"
          icon={<RefreshCw size={11} />}
          onClick={() => {
            mutateIncidents();
            mutateOps();
          }}
        >
          Refresh
        </Button>
      }
      width="wide"
      density="tight"
    >
      {/* Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          label={
            <HStack gap="xs" align="center">
              <AlertOctagon size={11} />
              <span>Active incidents</span>
            </HStack>
          }
          value={activeIncidents.length}
          intent={activeIncidents.length > 0 ? "danger" : "success"}
        />
        <KPI
          label={
            <HStack gap="xs" align="center">
              <ShieldAlert size={11} />
              <span>Critical findings</span>
            </HStack>
          }
          value={criticalFindings.length}
          intent={criticalFindings.length > 0 ? "danger" : "success"}
        />
        <KPI
          label="High findings"
          value={highFindings.length}
          intent={highFindings.length > 0 ? "warning" : "success"}
        />
        <KPI
          label={
            <HStack gap="xs" align="center">
              <Server size={11} />
              <span>Platform</span>
            </HStack>
          }
          value={platformHealthy ? "Healthy" : "Degraded"}
          intent={platformHealthy ? "success" : "danger"}
          hint={ops?.release ? `${ops.release.sha} · ${ops.release.env}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active incidents */}
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Triage"
            title="Active incidents"
            description="Operator-declared incidents in active or acknowledged state. Quick-ack and quick-assign without leaving this page."
            actions={
              canSeeIncidents && (
                <Link href="/dashboard/incidents">
                  <Button variant="ghost" size="xs" iconRight={<ArrowRight size={10} />}>
                    All incidents
                  </Button>
                </Link>
              )
            }
          />
          {!incidentsResp && canSeeIncidents && <Skeleton variant="text" lines={3} />}
          {!canSeeIncidents && (
            <EmptyState
              variant="compact"
              title="Incidents require admin access"
              description="Your role can view findings but not manage incidents. Ask an ADMIN to grant the capability."
            />
          )}
          {canSeeIncidents && activeIncidents.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 size={20} className="text-[var(--matcha-300)]" />}
              variant="compact"
              title="No active incidents"
              description="When an incident is declared, it appears here with quick-action buttons."
            />
          )}
          {canSeeIncidents && activeIncidents.length > 0 && (
            <VStack gap="sm">
              {activeIncidents.slice(0, 8).map((i) => (
                <div
                  key={i.id}
                  className="rounded-md border border-[var(--sage-soft)] bg-[var(--moss)] p-3"
                >
                  <HStack justify="between" align="start" wrap gap="sm">
                    <div className="min-w-0 flex-1">
                      <HStack gap="xs" align="center" wrap className="mb-1">
                        <Badge intent={SEV_INTENT[i.severity]} variant="subtle" size="xs" mono>
                          {i.severity}
                        </Badge>
                        <Badge
                          intent={i.state === "active" ? "danger" : "warning"}
                          variant="subtle"
                          size="xs"
                          mono
                        >
                          {i.state}
                        </Badge>
                        {(i.escalation_level ?? 0) > 0 && (
                          <Badge intent="warning" variant="outline" size="xs" mono>
                            L{i.escalation_level}
                          </Badge>
                        )}
                        <span className="font-mono text-[9px] text-[var(--matcha-300)]">
                          {i.id}
                        </span>
                      </HStack>
                      <p className="text-xs text-[var(--stone-100)] font-medium leading-snug">
                        {i.title}
                      </p>
                      <p className="text-[10px] text-[var(--stone-500)] mt-0.5">
                        Owner:{" "}
                        <span
                          className={
                            i.assigned_to === myEmail
                              ? "text-[var(--matcha-300)] font-semibold font-mono"
                              : "text-[var(--stone-300)] font-mono"
                          }
                        >
                          {i.assigned_to ?? "unassigned"}
                        </span>
                      </p>
                    </div>
                    <HStack gap="xs">
                      {i.state === "active" && (
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => quickAck(i.id)}
                        >
                          Ack
                        </Button>
                      )}
                      {i.assigned_to !== myEmail && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => quickAssignMe(i.id)}
                        >
                          Assign me
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                </div>
              ))}
            </VStack>
          )}
        </Card>

        {/* Critical findings */}
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Critical"
            title="Top critical findings"
            description="OPEN CRITICAL severity findings. Triage from here; open the finding to declare an incident if needed."
            actions={
              <Link href="/dashboard/findings?severity=CRITICAL">
                <Button variant="ghost" size="xs" iconRight={<ArrowRight size={10} />}>
                  All critical
                </Button>
              </Link>
            }
          />
          {!findingsResp && <Skeleton variant="text" lines={3} />}
          {findingsResp && criticalFindings.length === 0 && (
            <EmptyState
              icon={<ShieldCheck size={20} className="text-[var(--matcha-300)]" />}
              variant="compact"
              title="No critical findings open"
              description="Posture is clean at CRITICAL severity. Check HIGH findings in the queue."
            />
          )}
          {criticalFindings.length > 0 && (
            <VStack gap="sm">
              {criticalFindings.map((f) => (
                <Link
                  key={f.id}
                  href={`/dashboard/findings?focus=${encodeURIComponent(f.id)}`}
                  className="block rounded-md border border-[var(--sage-soft)] bg-[var(--moss)] px-3 py-2 hover:border-[var(--matcha-400)]/40 transition-colors"
                >
                  <HStack justify="between" align="start" gap="sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--stone-100)] font-medium leading-snug">
                        {f.title}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--stone-500)] mt-0.5 truncate">
                        {f.resource_id}
                      </p>
                    </div>
                    <HStack gap="xs" align="center">
                      <Badge intent="danger" variant="subtle" size="xs" mono>
                        {f.risk_score}
                      </Badge>
                      <ArrowRight size={11} className="text-[var(--stone-500)]" />
                    </HStack>
                  </HStack>
                </Link>
              ))}
            </VStack>
          )}
        </Card>
      </div>

      {/* Recent platform events */}
      {isAdmin && platform && platform.recentEvents.length > 0 && (
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Activity"
            title="Recent platform events"
            description="Cross-tenant operational events from the platform notification feed."
            actions={
              <Link href="/dashboard/admin/platform">
                <Button variant="ghost" size="xs" iconRight={<ArrowRight size={10} />}>
                  Full platform view
                </Button>
              </Link>
            }
          />
          <Timeline density="compact">
            {platform.recentEvents.slice(0, 8).map((e) => (
              <TimelineItem
                key={e.id}
                intent={
                  e.type === "incident" || e.type === "critical_finding"
                    ? "danger"
                    : e.type === "scan_complete" || e.type === "action_approved"
                      ? "success"
                      : "info"
                }
                time={new Date(e.timestamp).toLocaleString(undefined, {
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
                  e.tenant_id ? (
                    <Badge intent="neutral" variant="outline" size="xs" mono>
                      {e.tenant_id.slice(0, 12)}
                    </Badge>
                  ) : undefined
                }
              />
            ))}
          </Timeline>
        </Card>
      )}

      {/* Non-admin operator help */}
      {!isAdmin && (
        <Card variant="default" density="comfortable">
          <CardHeader
            eyebrow="Reference"
            title="Non-admin SOC view"
            description="The cross-tenant platform feed and ops console are ADMIN-only. Your view above shows incidents (if you have access) plus your tenant's critical findings."
          />
          <HStack gap="sm" wrap>
            <Link href="/dashboard/queue">
              <Button variant="ghost" size="sm" iconRight={<ArrowRight size={11} />}>
                Open queue
              </Button>
            </Link>
            <Link href="/dashboard/findings">
              <Button variant="ghost" size="sm" iconRight={<ArrowRight size={11} />}>
                All findings
              </Button>
            </Link>
          </HStack>
        </Card>
      )}

      {/* Empty state when literally nothing to triage */}
      {canSeeIncidents &&
        activeIncidents.length === 0 &&
        criticalFindings.length === 0 && (
          <Card variant="elevated" density="comfortable">
            <EmptyState
              icon={<Inbox size={24} className="text-[var(--matcha-300)]" />}
              title="Nothing to triage"
              description="No active incidents, no critical findings. This is what a clean shift looks like."
              variant="bordered"
            />
          </Card>
        )}
    </PageShell>
  );
}
