"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowRight,
  Filter,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
  EmptyState,
  FilterBar,
  FilterChip,
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
} from "@/lib/ui";
import { useSession } from "@/lib/use-session";
import { canDo } from "@/lib/rbac";
import { fetcher } from "@/lib/swr-fetcher";
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

/**
 * Unified analyst work queue.
 *
 * Pulls from two backing surfaces (incidents + findings), normalizes to
 * a single QueueItem shape, sorts by priority, and surfaces them in one
 * scannable triage list. The "Assigned to me" filter respects the
 * incident assignment model from Phase 13 (lib/incidents.ts).
 */

type QueueItem = {
  id: string;
  kind: "incident" | "finding";
  title: string;
  context: string;
  severity_intent: BadgeIntent;
  severity_label: string;
  priority: number; // higher = more urgent
  status: string;
  assigned: string | null;
  age_hours: number;
  href: string;
};

const SEV_PRIORITY: Record<string, number> = {
  critical: 100,
  CRITICAL: 100,
  major: 80,
  HIGH: 80,
  minor: 50,
  MEDIUM: 50,
  info: 30,
  LOW: 30,
};

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

export default function QueuePage() {
  return (
    <PageRestrictedGuard
      capability="viewFindings"
      title="Analyst Queue"
      description="Unified triage queue across incidents and critical findings."
      subtitle="Queue"
    >
      <QueueView />
    </PageRestrictedGuard>
  );
}

function QueueView() {
  const { email: myEmail, role } = useSession();
  const canSeeIncidents = canDo(role, "manageSettings");

  const { data: incidentsResp, isLoading: incLoading } = useSWR<IncidentsResponse>(
    canSeeIncidents ? "/api/admin/incidents" : null,
    fetcher,
    { refreshInterval: 30_000 },
  );
  const { data: findingsResp, isLoading: findLoading } = useSWR<FindingsResponse>(
    "/api/findings",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const [kindFilter, setKindFilter] = useState<"all" | "incident" | "finding">("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Date.now() is impure — lifted to a client-mounted state so the
  // react-compiler doesn't reject the useMemo and so SSR is stable.
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const items: QueueItem[] = useMemo(() => {
    const out: QueueItem[] = [];
    if (now === 0) return out;

    // Incidents — only the active + acknowledged ones; resolved are out of queue.
    if (incidentsResp) {
      for (const i of incidentsResp.active) {
        if (i.state === "resolved") continue;
        const ageHrs = (now - new Date(i.declared_at).getTime()) / 3_600_000;
        // Escalation bumps priority — L3 (executive) adds 30 priority points.
        const escBoost = (i.escalation_level ?? 0) * 10;
        out.push({
          id: i.id,
          kind: "incident",
          title: i.title,
          context: `${i.state}${i.escalation_level ? ` · L${i.escalation_level}` : ""}`,
          severity_intent: SEV_INTENT[i.severity] ?? "neutral",
          severity_label: i.severity,
          priority: (SEV_PRIORITY[i.severity] ?? 30) + escBoost,
          status: i.state,
          assigned: i.assigned_to ?? null,
          age_hours: ageHrs,
          href: `/dashboard/incidents`,
        });
      }
    }

    // Findings — only OPEN at HIGH or CRITICAL severity. Resolved /
    // suppressed are not analyst-actionable in the queue.
    if (findingsResp) {
      for (const f of findingsResp.findings) {
        if (f.status !== "OPEN") continue;
        if (f.severity !== "CRITICAL" && f.severity !== "HIGH") continue;
        const ageHrs = (now - new Date(f.created_at).getTime()) / 3_600_000;
        out.push({
          id: f.id,
          kind: "finding",
          title: f.title,
          context: f.resource_id,
          severity_intent: SEV_INTENT[f.severity] ?? "neutral",
          severity_label: f.severity,
          priority: (SEV_PRIORITY[f.severity] ?? 30) + Math.min(20, f.risk_score / 5),
          status: f.status,
          assigned: null, // findings have no assignment today
          age_hours: ageHrs,
          href: `/dashboard/findings?focus=${encodeURIComponent(f.id)}`,
        });
      }
    }

    return out.sort((a, b) => b.priority - a.priority);
  }, [incidentsResp, findingsResp, now]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (kindFilter !== "all" && it.kind !== kindFilter) return false;
      if (mineOnly && it.assigned !== myEmail) return false;
      if (
        criticalOnly &&
        it.severity_label !== "critical" &&
        it.severity_label !== "CRITICAL"
      )
        return false;
      return true;
    });
  }, [items, kindFilter, mineOnly, criticalOnly, myEmail]);

  const counts = {
    total: items.length,
    incidents: items.filter((i) => i.kind === "incident").length,
    findings: items.filter((i) => i.kind === "finding").length,
    mine: items.filter((i) => i.assigned === myEmail).length,
    critical: items.filter(
      (i) => i.severity_label === "critical" || i.severity_label === "CRITICAL",
    ).length,
  };

  const isLoading = (canSeeIncidents && incLoading) || findLoading;

  function slaHint(item: QueueItem): { intent: BadgeIntent; label: string } | null {
    // Soft SLA — informational only, not enforced server-side. Critical
    // incidents > 1h overdue, criticals > 4h overdue, others > 24h.
    const hrs = item.age_hours;
    const isCrit = item.severity_label === "critical" || item.severity_label === "CRITICAL";
    if (item.kind === "incident" && isCrit && hrs > 1) {
      return { intent: "danger", label: "SLA breach" };
    }
    if (isCrit && hrs > 4) {
      return { intent: "danger", label: "SLA breach" };
    }
    if (hrs > 24) {
      return { intent: "warning", label: "Aging" };
    }
    return null;
  }

  return (
    <PageShell
      eyebrow="Operations · Triage"
      title="Analyst queue"
      description="Unified triage view. Incidents (when you have access) and OPEN HIGH/CRITICAL findings, sorted by priority. Pick one to acknowledge or assign to yourself."
      meta={
        <HStack gap="sm" align="center">
          <StatusDot
            intent={counts.critical > 0 ? "danger" : "success"}
            pulse={counts.critical > 0}
            size="sm"
            label={
              counts.critical > 0
                ? `${counts.critical} critical`
                : "No critical items"
            }
          />
        </HStack>
      }
      actions={
        <HStack gap="sm">
          {canSeeIncidents && (
            <Link href="/dashboard/incidents">
              <Button variant="ghost" size="md" iconRight={<ArrowRight size={11} />}>
                Manage incidents
              </Button>
            </Link>
          )}
          <Link href="/dashboard/findings">
            <Button variant="ghost" size="md" iconRight={<ArrowRight size={11} />}>
              All findings
            </Button>
          </Link>
        </HStack>
      }
      width="default"
      density="tight"
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="Total in queue" value={counts.total} />
        <KPI
          label="Incidents"
          value={canSeeIncidents ? counts.incidents : "—"}
          intent="warning"
          hint={canSeeIncidents ? undefined : "Requires admin"}
        />
        <KPI label="Findings" value={counts.findings} intent="info" />
        <KPI label="Critical" value={counts.critical} intent="danger" />
        <KPI label="Assigned to me" value={counts.mine} intent="success" />
      </div>

      <FilterBar
        label="Filters"
        action={
          <HStack gap="xs" align="center">
            <Filter size={10} className="text-[var(--stone-500)]" />
            <span className="text-[10px] text-[var(--stone-500)]">
              {filtered.length} item{filtered.length === 1 ? "" : "s"}
            </span>
          </HStack>
        }
      >
        {(["all", "incident", "finding"] as const).map((k) => (
          <FilterChip
            key={k}
            active={kindFilter === k}
            onClick={() => setKindFilter(k)}
          >
            {k}
          </FilterChip>
        ))}
        <span className="text-[var(--stone-700)] mx-1">·</span>
        <FilterChip
          active={criticalOnly}
          onClick={() => setCriticalOnly((v) => !v)}
          intent="danger"
        >
          Critical only
        </FilterChip>
        <FilterChip active={mineOnly} onClick={() => setMineOnly((v) => !v)}>
          Assigned to me
        </FilterChip>
      </FilterBar>

      <Card variant="elevated" density="comfortable" className="p-0 overflow-hidden">
        <CardHeader title="Triage queue" />
        {isLoading && items.length === 0 && (
          <div className="p-4">
            <Skeleton variant="text" lines={4} />
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={<Inbox size={20} className="text-[var(--matcha-300)]" />}
              title="Queue is clear"
              description="Nothing actionable matches your filters. Adjust filters above or check back later."
            />
          </div>
        )}
        {filtered.length > 0 && (
          <Table density="compact">
            <THead>
              <TR>
                <TH>Item</TH>
                <TH>Severity</TH>
                <TH>Kind</TH>
                <TH>Owner</TH>
                <TH>Age</TH>
                <TH>SLA</TH>
                <TH align="right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.map((it) => {
                const sla = slaHint(it);
                return (
                  <TR key={`${it.kind}-${it.id}`}>
                    <TD>
                      <p className="font-semibold text-[var(--stone-100)] leading-snug">
                        {it.title}
                      </p>
                      <p className="text-[10px] font-mono text-[var(--stone-500)] mt-0.5 truncate max-w-[420px]">
                        {it.context}
                      </p>
                    </TD>
                    <TD>
                      <Badge
                        intent={it.severity_intent}
                        variant="subtle"
                        size="xs"
                        mono
                      >
                        {it.severity_label}
                      </Badge>
                    </TD>
                    <TD>
                      <HStack gap="xs" align="center">
                        {it.kind === "incident" ? (
                          <AlertOctagon size={10} className="text-[var(--amber-clay)]" />
                        ) : (
                          <ShieldAlert size={10} className="text-[var(--mist)]" />
                        )}
                        <span className="text-[10px] text-[var(--stone-400)]">
                          {it.kind}
                        </span>
                      </HStack>
                    </TD>
                    <TD className="text-[11px]">
                      {it.assigned ? (
                        <span
                          className={
                            it.assigned === myEmail
                              ? "text-[var(--matcha-300)] font-semibold"
                              : "text-[var(--stone-300)]"
                          }
                        >
                          {it.assigned}
                        </span>
                      ) : (
                        <span className="text-[var(--stone-600)]">—</span>
                      )}
                    </TD>
                    <TD className="text-[10px] text-[var(--stone-500)]">
                      {it.age_hours < 1
                        ? `${Math.round(it.age_hours * 60)}m`
                        : it.age_hours < 24
                          ? `${Math.round(it.age_hours)}h`
                          : `${Math.round(it.age_hours / 24)}d`}
                    </TD>
                    <TD>
                      {sla ? (
                        <Badge intent={sla.intent} variant="subtle" size="xs">
                          {sla.label}
                        </Badge>
                      ) : (
                        <span className="text-[var(--stone-700)] text-[10px]">on track</span>
                      )}
                    </TD>
                    <TD align="right">
                      <Link href={it.href}>
                        <Button variant="ghost" size="xs" iconRight={<ArrowRight size={10} />}>
                          Open
                        </Button>
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </PageShell>
  );
}
