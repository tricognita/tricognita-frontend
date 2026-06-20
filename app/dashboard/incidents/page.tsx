"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertOctagon,
  ArrowUpCircle,
  CheckCircle2,
  MessageSquare,
  Plus,
  User as UserIcon,
} from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
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
  Timeline,
  TimelineItem,
  TR,
  VStack,
} from "@/lib/ui";
import { useSession } from "@/lib/use-session";
import { fetcher, jsonFetch } from "@/lib/swr-fetcher";
import { PageRestrictedGuard } from "../components/PageRestrictedGuard";

interface IncidentNote {
  ts: string;
  author: string;
  body: string;
}
interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "info" | "minor" | "major" | "critical";
  state: "active" | "acknowledged" | "resolved";
  scope: "platform" | "tenant" | "subsystem";
  affected_tenants: string[];
  affected_subsystem?: string;
  declared_by: string;
  declared_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  notes: IncidentNote[];
  assigned_to?: string | null;
  escalation_level?: 0 | 1 | 2 | 3;
  linked_findings?: string[];
  linked_attack_paths?: string[];
}
interface IncidentsResponse {
  active: Incident[];
  resolved: Incident[];
}

const SEV_INTENT: Record<Incident["severity"], BadgeIntent> = {
  info: "info",
  minor: "neutral",
  major: "warning",
  critical: "danger",
};
const STATE_INTENT: Record<Incident["state"], BadgeIntent> = {
  active: "danger",
  acknowledged: "warning",
  resolved: "success",
};
const ESC_LABEL: Record<number, string> = {
  0: "Unescalated",
  1: "Manager",
  2: "On-call",
  3: "Executive",
};

type StateFilter = "ALL" | "active" | "acknowledged" | "resolved";
type SevFilter = "ALL" | Incident["severity"];

export default function IncidentsPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Incidents"
      description="Operator-declared incident workflow — assignment, escalation, severity progression."
      subtitle="Incidents"
    >
      <IncidentsView />
    </PageRestrictedGuard>
  );
}

function IncidentsView() {
  const { email: myEmail } = useSession();
  const { data, error, isLoading, mutate } = useSWR<IncidentsResponse>(
    "/api/admin/incidents",
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );

  const [stateFilter, setStateFilter] = useState<StateFilter>("active");
  const [sevFilter, setSevFilter] = useState<SevFilter>("ALL");
  const [mineOnly, setMineOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const all: Incident[] = useMemo(() => {
    return [...(data?.active ?? []), ...(data?.resolved ?? [])];
  }, [data]);

  const filtered = useMemo(() => {
    return all.filter((i) => {
      if (stateFilter !== "ALL" && i.state !== stateFilter) return false;
      if (sevFilter !== "ALL" && i.severity !== sevFilter) return false;
      if (mineOnly && i.assigned_to !== myEmail) return false;
      return true;
    });
  }, [all, stateFilter, sevFilter, mineOnly, myEmail]);

  const counts = useMemo(() => {
    return {
      total: all.length,
      active: all.filter((i) => i.state === "active").length,
      acknowledged: all.filter((i) => i.state === "acknowledged").length,
      resolved: all.filter((i) => i.state === "resolved").length,
      mine: all.filter((i) => i.assigned_to === myEmail).length,
    };
  }, [all, myEmail]);

  const selectedIncident = useMemo(
    () => all.find((i) => i.id === selected) ?? null,
    [all, selected],
  );

  return (
    <PageShell
      eyebrow="Operations · Incidents"
      title="Incidents"
      description="Operator-declared incidents with assignment, escalation, and linked artifacts. Refreshes every 30 seconds."
      meta={
        <HStack gap="sm" align="center">
          <StatusDot
            intent={counts.active > 0 ? "danger" : "success"}
            pulse={counts.active > 0}
            size="sm"
            label={
              counts.active > 0
                ? `${counts.active} active`
                : "No active incidents"
            }
          />
        </HStack>
      }
      actions={
        <Button
          variant="primary"
          size="md"
          icon={<Plus size={11} />}
          onClick={() => setShowCreate(true)}
        >
          Declare incident
        </Button>
      }
      width="wide"
      density="tight"
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI label="Total" value={counts.total} />
        <KPI label="Active" value={counts.active} intent="danger" />
        <KPI label="Acknowledged" value={counts.acknowledged} intent="warning" />
        <KPI label="Resolved" value={counts.resolved} intent="success" />
        <KPI label="Assigned to me" value={counts.mine} intent="info" />
      </div>

      {showCreate && (
        <CreateIncidentForm
          onCancel={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            mutate();
          }}
        />
      )}

      <FilterBar label="Filters">
        {(["ALL", "active", "acknowledged", "resolved"] as StateFilter[]).map((s) => (
          <FilterChip
            key={s}
            active={stateFilter === s}
            onClick={() => setStateFilter(s)}
          >
            {s === "ALL" ? "All states" : s}
          </FilterChip>
        ))}
        <span className="text-[var(--stone-700)] mx-1">·</span>
        {(["ALL", "critical", "major", "minor", "info"] as SevFilter[]).map((s) => (
          <FilterChip
            key={s}
            active={sevFilter === s}
            onClick={() => setSevFilter(s)}
            intent={s === "critical" ? "danger" : s === "major" ? "warning" : "neutral"}
          >
            {s === "ALL" ? "All severities" : s}
          </FilterChip>
        ))}
        <span className="text-[var(--stone-700)] mx-1">·</span>
        <FilterChip active={mineOnly} onClick={() => setMineOnly((v) => !v)}>
          Assigned to me
        </FilterChip>
      </FilterBar>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="elevated" density="comfortable" className="lg:col-span-2">
          <CardHeader title="Incident list" />
          {isLoading && !data && <Skeleton variant="text" lines={4} />}
          {error && !data && (
            <ErrorState
              variant="degraded"
              title="Could not load incidents"
              detail={error instanceof Error ? error.message : undefined}
            />
          )}
          {data && (
            <Table density="compact">
              <THead>
                <TR>
                  <TH>ID / Title</TH>
                  <TH>Severity</TH>
                  <TH>State</TH>
                  <TH>Owner</TH>
                  <TH>Escalation</TH>
                  <TH>Declared</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.length === 0 ? (
                  <TBodyEmpty colSpan={6}>
                    <EmptyState
                      icon={<AlertOctagon size={20} className="text-[var(--matcha-300)]" />}
                      title="No incidents match filters"
                      description="Adjust filters above, or declare a new incident."
                    />
                  </TBodyEmpty>
                ) : (
                  filtered.map((i) => (
                    <TR
                      key={i.id}
                      interactive
                      selected={i.id === selected}
                      onClick={() => setSelected(i.id)}
                    >
                      <TD>
                        <p className="font-mono text-[10px] text-[var(--matcha-300)]">
                          {i.id}
                        </p>
                        <p className="text-[var(--stone-200)] mt-0.5 leading-snug max-w-[320px]">
                          {i.title}
                        </p>
                      </TD>
                      <TD>
                        <Badge intent={SEV_INTENT[i.severity]} variant="subtle" size="xs" mono>
                          {i.severity}
                        </Badge>
                      </TD>
                      <TD>
                        <Badge intent={STATE_INTENT[i.state]} variant="subtle" size="xs" mono>
                          {i.state}
                        </Badge>
                      </TD>
                      <TD className="text-[11px]">
                        {i.assigned_to ? (
                          <span
                            className={
                              i.assigned_to === myEmail
                                ? "text-[var(--matcha-300)] font-semibold"
                                : "text-[var(--stone-300)]"
                            }
                          >
                            {i.assigned_to}
                          </span>
                        ) : (
                          <span className="text-[var(--stone-600)]">—</span>
                        )}
                      </TD>
                      <TD>
                        <Badge intent="neutral" variant="outline" size="xs">
                          L{i.escalation_level ?? 0}{" · "}
                          {ESC_LABEL[i.escalation_level ?? 0]}
                        </Badge>
                      </TD>
                      <TD className="text-[10px] text-[var(--stone-500)]">
                        {new Date(i.declared_at).toLocaleDateString()}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          )}
        </Card>

        <Card variant="elevated" density="comfortable">
          <CardHeader title={selectedIncident ? "Detail" : "Select an incident"} />
          {!selectedIncident ? (
            <EmptyState
              variant="compact"
              title="Nothing selected"
              description="Click a row to see notes, escalation, and assignment actions."
            />
          ) : (
            <IncidentDetail
              incident={selectedIncident}
              onMutated={() => mutate()}
              myEmail={myEmail ?? ""}
            />
          )}
        </Card>
      </div>
    </PageShell>
  );
}

function CreateIncidentForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Incident["severity"]>("major");
  const [scope, setScope] = useState<Incident["scope"]>("tenant");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      await jsonFetch("/api/admin/incidents", "POST", {
        title,
        description,
        severity,
        scope,
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to declare incident");
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full bg-[var(--ink-deep)] border border-[var(--sage-soft)] rounded px-3 py-2 text-sm text-[var(--stone-100)] focus:outline-none focus:border-[var(--matcha-400)] focus:ring-1 focus:ring-[var(--matcha-400)]/30 transition";
  const label =
    "block text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)] mb-1";

  return (
    <Card variant="elevated" density="comfortable">
      <CardHeader
        eyebrow="Declare"
        title="New incident"
        description="An operator-declared incident immediately appears in the active queue and broadcasts to the platform notification feed."
      />
      <VStack gap="md">
        <div>
          <label className={label}>Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief, specific summary"
            className={input}
          />
        </div>
        <div>
          <label className={label}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is happening? What is affected? What is the initial impact?"
            rows={3}
            className={input}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Incident["severity"])}
              className={input}
            >
              <option value="info">info</option>
              <option value="minor">minor</option>
              <option value="major">major</option>
              <option value="critical">critical</option>
            </select>
          </div>
          <div>
            <label className={label}>Scope</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as Incident["scope"])}
              className={input}
            >
              <option value="tenant">tenant</option>
              <option value="platform">platform</option>
              <option value="subsystem">subsystem</option>
            </select>
          </div>
        </div>
        {err && <p className="text-xs text-[var(--ember-glow)]">{err}</p>}
        <HStack gap="sm" justify="end">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={submitting}
            disabled={!title.trim() || !description.trim()}
            onClick={submit}
          >
            Declare incident
          </Button>
        </HStack>
      </VStack>
    </Card>
  );
}

function IncidentDetail({
  incident,
  onMutated,
  myEmail,
}: {
  incident: Incident;
  onMutated: () => void;
  myEmail: string;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function op(opName: string, body: Record<string, unknown> = {}) {
    setBusy(opName);
    try {
      await jsonFetch(
        `/api/admin/incidents?id=${incident.id}&op=${opName}`,
        "PATCH",
        body,
      );
      onMutated();
      if (opName === "note") setNote("");
    } catch {
      /* errors are logged by the BFF route */
    } finally {
      setBusy(null);
    }
  }

  const escalateNext = ((incident.escalation_level ?? 0) + 1) as 1 | 2 | 3;

  return (
    <VStack gap="md">
      <div>
        <p className="font-mono text-[10px] text-[var(--matcha-300)] mb-1">
          {incident.id}
        </p>
        <p className="text-sm font-semibold text-[var(--stone-100)]">
          {incident.title}
        </p>
        <p className="text-xs text-[var(--stone-400)] mt-1 leading-relaxed">
          {incident.description}
        </p>
      </div>

      <HStack gap="xs" wrap>
        <Badge intent={SEV_INTENT[incident.severity]} variant="subtle" size="xs" mono>
          {incident.severity}
        </Badge>
        <Badge intent={STATE_INTENT[incident.state]} variant="subtle" size="xs" mono>
          {incident.state}
        </Badge>
        <Badge intent="neutral" variant="outline" size="xs" mono>
          L{incident.escalation_level ?? 0} · {ESC_LABEL[incident.escalation_level ?? 0]}
        </Badge>
        <Badge intent="info" variant="outline" size="xs" mono>
          {incident.scope}
        </Badge>
      </HStack>

      <div className="rounded-md border border-[var(--sage-soft)] bg-[var(--moss)] p-3">
        <HStack justify="between" align="center" wrap>
          <HStack gap="xs" align="center">
            <UserIcon size={11} className="text-[var(--stone-400)]" />
            <span className="text-[11px] text-[var(--stone-300)]">
              Owner:{" "}
              <span className="font-mono">
                {incident.assigned_to ?? "unassigned"}
              </span>
            </span>
          </HStack>
          {incident.state !== "resolved" && (
            <HStack gap="xs">
              {incident.assigned_to !== myEmail && (
                <Button
                  variant="ghost"
                  size="xs"
                  loading={busy === "assign"}
                  onClick={() => {
                    setBusy("assign");
                    op("assign", { assign_to: myEmail }).finally(() =>
                      setBusy(null),
                    );
                  }}
                >
                  Assign to me
                </Button>
              )}
              {incident.assigned_to && (
                <Button
                  variant="ghost"
                  size="xs"
                  loading={busy === "unassign"}
                  onClick={() => {
                    setBusy("unassign");
                    op("assign", { assign_to: null }).finally(() =>
                      setBusy(null),
                    );
                  }}
                >
                  Unassign
                </Button>
              )}
            </HStack>
          )}
        </HStack>
      </div>

      {incident.state !== "resolved" && (
        <HStack gap="xs" wrap>
          {incident.state === "active" && (
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle2 size={11} />}
              loading={busy === "ack"}
              onClick={() => op("ack")}
            >
              Acknowledge
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<CheckCircle2 size={11} />}
            loading={busy === "resolve"}
            onClick={() => op("resolve")}
          >
            Resolve
          </Button>
          {(incident.escalation_level ?? 0) < 3 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowUpCircle size={11} />}
              loading={busy === "escalate"}
              onClick={() => op("escalate", { escalation: escalateNext })}
            >
              Escalate → {ESC_LABEL[escalateNext]}
            </Button>
          )}
        </HStack>
      )}

      <div>
        <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)] mb-1">
          Add note
        </label>
        <HStack gap="xs">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Operator handoff note…"
            className="flex-1 bg-[var(--ink-deep)] border border-[var(--sage-soft)] rounded px-3 py-2 text-xs text-[var(--stone-100)] focus:outline-none focus:border-[var(--matcha-400)] focus:ring-1 focus:ring-[var(--matcha-400)]/30 transition"
            onKeyDown={(e) => {
              if (e.key === "Enter" && note.trim()) op("note", { note });
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<MessageSquare size={11} />}
            loading={busy === "note"}
            disabled={!note.trim()}
            onClick={() => op("note", { note })}
          >
            Post
          </Button>
        </HStack>
      </div>

      <div>
        <p className="eyebrow text-[var(--stone-500)] mb-2">Activity</p>
        <Timeline density="compact">
          {[...incident.notes]
            .reverse()
            .slice(0, 20)
            .map((n, i) => (
              <TimelineItem
                key={i}
                time={new Date(n.ts).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                title={
                  <span className="text-[var(--stone-200)]">
                    <span className="font-mono text-[10px] text-[var(--matcha-300)] mr-2">
                      {n.author}
                    </span>
                    {n.body}
                  </span>
                }
                intent="neutral"
              />
            ))}
        </Timeline>
      </div>
    </VStack>
  );
}
