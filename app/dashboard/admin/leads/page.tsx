"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { Inbox, RefreshCw } from "lucide-react";
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

type LeadKind = "request_demo" | "pilot_application" | "waitlist" | "contact";
type LeadStatus = "new" | "contacted" | "qualified" | "closed";

interface LeadEntry {
  id: string;
  kind: LeadKind;
  name: string;
  email: string;
  company?: string;
  role?: string;
  use_case?: string;
  context?: {
    primary_cloud?: string;
    team_size?: string;
    timeframe?: string;
  };
  source_path?: string;
  user_agent?: string;
  status: LeadStatus;
  notes?: string;
  contacted_at?: string;
  contacted_by?: string;
  submitted_at: string;
}

interface LeadsResponse {
  entries: LeadEntry[];
}

const KIND_LABELS: Record<LeadKind, string> = {
  request_demo: "Demo",
  pilot_application: "Pilot",
  waitlist: "Waitlist",
  contact: "Contact",
};

const STATUS_INTENT: Record<LeadStatus, "info" | "warning" | "success" | "neutral"> = {
  new: "info",
  contacted: "warning",
  qualified: "success",
  closed: "neutral",
};

function relTime(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminLeadsPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Leads Inbox"
      description="Marketing-site lead capture. Triage and route to the founder pipeline."
      subtitle="Commercial"
    >
      <LeadsInbox />
    </PageRestrictedGuard>
  );
}

function LeadsInbox(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useSWR<LeadsResponse>(
    "/api/admin/leads",
    fetcher,
    { refreshInterval: 60_000 },
  );

  const [kindFilter, setKindFilter] = useState<LeadKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [acting, setActing] = useState(false);

  const now = Date.now();
  const all = data?.entries ?? [];

  const counts = useMemo(() => {
    return {
      total: all.length,
      new: all.filter((e) => e.status === "new").length,
      contacted: all.filter((e) => e.status === "contacted").length,
      qualified: all.filter((e) => e.status === "qualified").length,
    };
  }, [all]);

  const filtered = useMemo(() => {
    return all.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return true;
    });
  }, [all, kindFilter, statusFilter]);

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const performAction = useCallback(
    async (op: "contacted" | "qualified" | "closed") => {
      if (!selected) return;
      setActing(true);
      try {
        const res = await fetch(
          `/api/admin/leads?id=${encodeURIComponent(selected.id)}&op=${op}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ notes: draftNotes || undefined }),
          },
        );
        if (!res.ok) return;
        await mutate();
        setDraftNotes("");
      } finally {
        setActing(false);
      }
    },
    [selected, draftNotes, mutate],
  );

  if (error) {
    return (
      <PageShell title="Leads">
        <ErrorState
          title="Could not load leads"
          description="The leads store may be offline. Try again."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Leads inbox"
      description="Marketing-site request demo / pilot / waitlist / contact submissions"
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
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="No leads yet"
          description="Leads appear here when visitors submit the marketing-site forms."
        />
      ) : (
        <VStack gap="lg">
          <HStack gap="md" className="flex-wrap">
            <KPI label="Total" value={counts.total} />
            <KPI label="New" value={counts.new} intent="info" />
            <KPI label="Contacted" value={counts.contacted} intent="warning" />
            <KPI label="Qualified" value={counts.qualified} intent="success" />
          </HStack>

          <FilterBar>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as LeadKind | "all")}
              className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
            >
              <option value="all">All kinds</option>
              {(Object.keys(KIND_LABELS) as LeadKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as LeadStatus | "all")
              }
              className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="closed">Closed</option>
            </select>
          </FilterBar>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader title={`Leads (${filtered.length})`} />
              <div className="max-h-[560px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <EmptyState
                    title="No leads match"
                    description="Adjust filters or wait for new submissions."
                  />
                ) : (
                  filtered.map((e) => {
                    const isSel = e.id === selectedId;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(e.id);
                          setDraftNotes(e.notes ?? "");
                        }}
                        className={`w-full border-b border-[var(--mist)] p-3 text-left text-xs hover:bg-[var(--stone)] ${
                          isSel ? "bg-[var(--stone)]" : ""
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Badge intent={STATUS_INTENT[e.status]} size="sm">
                            {e.status}
                          </Badge>
                          <span className="text-[10px] opacity-60">
                            {KIND_LABELS[e.kind]} · {relTime(e.submitted_at, now)}
                          </span>
                        </div>
                        <div className="mb-1 text-[var(--moss)]">
                          <span className="font-medium">{e.name}</span>
                          {e.company && (
                            <span className="opacity-70"> · {e.company}</span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-60">
                          {e.email}
                          {e.role && ` · ${e.role}`}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            {selected ? (
              <Card>
                <CardHeader title="Detail" />
                <VStack gap="md" className="p-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Name" value={selected.name} />
                    <Field label="Email" value={selected.email} />
                    {selected.company && (
                      <Field label="Company" value={selected.company} />
                    )}
                    {selected.role && <Field label="Role" value={selected.role} />}
                    <Field label="Kind" value={KIND_LABELS[selected.kind]} />
                    <Field label="Submitted" value={selected.submitted_at} />
                    {selected.context?.primary_cloud && (
                      <Field label="Cloud" value={selected.context.primary_cloud} />
                    )}
                    {selected.context?.team_size && (
                      <Field label="Team size" value={selected.context.team_size} />
                    )}
                    {selected.context?.timeframe && (
                      <Field label="Timeframe" value={selected.context.timeframe} />
                    )}
                    {selected.source_path && (
                      <Field label="Source" value={selected.source_path} />
                    )}
                  </div>

                  {selected.use_case && (
                    <div>
                      <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">
                        Use case
                      </div>
                      <div className="whitespace-pre-wrap rounded border border-[var(--mist)] bg-[var(--stone)] p-2 text-[var(--moss)]">
                        {selected.use_case}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">
                      Founder notes
                    </div>
                    <textarea
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      rows={3}
                      placeholder="What did you learn? Next step?"
                      className="w-full resize-none rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
                    />
                  </div>

                  <HStack gap="sm">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => performAction("contacted")}
                      loading={acting}
                      disabled={selected.status === "closed"}
                    >
                      Mark contacted
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => performAction("qualified")}
                      loading={acting}
                      disabled={selected.status === "closed"}
                    >
                      Mark qualified
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => performAction("closed")}
                      loading={acting}
                    >
                      Close
                    </Button>
                  </HStack>

                  {selected.contacted_at && (
                    <div className="text-[10px] opacity-60">
                      Contacted by {selected.contacted_by} at {selected.contacted_at}
                    </div>
                  )}
                </VStack>
              </Card>
            ) : (
              <Card>
                <CardHeader title="Detail" />
                <EmptyState
                  title="Select a lead"
                  description="Click any entry on the left for full context and triage actions."
                />
              </Card>
            )}
          </div>
        </VStack>
      )}
    </PageShell>
  );
}

function Field({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider opacity-60">{label}</div>
      <div className="break-all text-xs text-[var(--moss)]">{value}</div>
    </div>
  );
}
