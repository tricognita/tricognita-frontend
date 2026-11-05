"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { MessageSquare, RefreshCw } from "lucide-react";
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

type FeedbackCategory =
  | "onboarding"
  | "workflow"
  | "ui_confusion"
  | "deployment"
  | "integration"
  | "general";
type FeedbackStatus = "new" | "triaged" | "resolved";

interface FeedbackEntry {
  id: string;
  tenant_id: string;
  user_email: string;
  user_role: string;
  category: FeedbackCategory;
  message: string;
  page_path: string;
  context: {
    user_agent?: string;
    viewport?: string;
    timezone?: string;
  };
  status: FeedbackStatus;
  triaged_at?: string;
  triaged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  admin_notes?: string;
  submitted_at: string;
}

interface FeedbackResponse {
  entries: FeedbackEntry[];
}

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  general: "General",
  onboarding: "Onboarding",
  workflow: "Workflow",
  ui_confusion: "UI confusion",
  integration: "Integration",
  deployment: "Deployment",
};

const STATUS_INTENT: Record<FeedbackStatus, "info" | "warning" | "success"> = {
  new: "info",
  triaged: "warning",
  resolved: "success",
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

export default function AdminFeedbackPage() {
  return (
    <PageRestrictedGuard
      capability="manageSettings"
      title="Pilot Feedback Inbox"
      description="Cross-tenant feedback signals from pilot and customer users. Triage and resolve."
      subtitle="Operations"
    >
      <FeedbackInbox />
    </PageRestrictedGuard>
  );
}

function FeedbackInbox(): React.JSX.Element {
  const { data, error, isLoading, mutate } = useSWR<FeedbackResponse>(
    "/api/admin/feedback",
    fetcher,
    { refreshInterval: 30_000 },
  );

  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState<string>("");
  const [acting, setActing] = useState<boolean>(false);

  // We snapshot now at render time for KPI relative ages. No interval —
  // the page refreshes every 30s anyway so "just now" / "5m ago" stay
  // accurate within usable bounds.
  const now = Date.now();

  const allEntries = data?.entries ?? [];

  const counts = useMemo(() => {
    return {
      total: allEntries.length,
      new: allEntries.filter((e) => e.status === "new").length,
      triaged: allEntries.filter((e) => e.status === "triaged").length,
      resolved: allEntries.filter((e) => e.status === "resolved").length,
    };
  }, [allEntries]);

  const filtered = useMemo(() => {
    return allEntries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      return true;
    });
  }, [allEntries, statusFilter, categoryFilter]);

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? null,
    [filtered, selectedId],
  );

  const performAction = useCallback(
    async (op: "triage" | "resolve") => {
      if (!selected) return;
      setActing(true);
      try {
        const res = await fetch(
          `/api/admin/feedback?id=${encodeURIComponent(selected.id)}&op=${op}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ notes: draftNotes || undefined }),
          },
        );
        if (!res.ok) {
          // Leave the form state intact so the admin can retry.
          return;
        }
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
      <PageShell title="Pilot Feedback">
        <ErrorState
          title="Could not load feedback"
          description="The feedback store may be offline. Try again in a moment."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Pilot Feedback Inbox"
      description="Cross-tenant signals from pilot + customer users"
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
      <HStack gap="md" className="mb-4 flex-wrap">
        <KPI label="Total" value={counts.total} />
        <KPI label="New" value={counts.new} intent="info" />
        <KPI label="Triaged" value={counts.triaged} intent="warning" />
        <KPI label="Resolved" value={counts.resolved} intent="success" />
      </HStack>

      <FilterBar className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as FeedbackStatus | "all")
          }
          className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
        >
          <option value="all">All statuses</option>
          <option value="new">New only</option>
          <option value="triaged">Triaged only</option>
          <option value="resolved">Resolved only</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as FeedbackCategory | "all")
          }
          className="rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
        >
          <option value="all">All categories</option>
          {(Object.keys(CATEGORY_LABELS) as FeedbackCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </FilterBar>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title="No feedback matches"
          description={
            allEntries.length === 0
              ? "Nothing has been submitted yet. The widget is mounted on every dashboard page."
              : "No entries match the current filters."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader title={`Entries (${filtered.length})`} />
            <div className="max-h-[560px] overflow-y-auto">
              {filtered.map((e) => {
                const isSel = e.id === selectedId;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(e.id);
                      setDraftNotes(e.admin_notes ?? "");
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
                        {CATEGORY_LABELS[e.category]} · {relTime(e.submitted_at, now)}
                      </span>
                    </div>
                    <div className="mb-1 line-clamp-2 text-[var(--moss)]">
                      {e.message}
                    </div>
                    <div className="text-[10px] opacity-50">
                      {e.user_email} · {e.user_role} · {e.page_path}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {selected ? (
            <Card>
              <CardHeader title="Detail" />
              <VStack gap="md" className="p-3 text-xs">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">
                    Message
                  </div>
                  <div className="whitespace-pre-wrap rounded border border-[var(--mist)] bg-[var(--stone)] p-2 text-[var(--moss)]">
                    {selected.message}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Tenant" value={selected.tenant_id} />
                  <Field label="User" value={selected.user_email} />
                  <Field label="Role" value={selected.user_role} />
                  <Field label="Category" value={CATEGORY_LABELS[selected.category]} />
                  <Field label="Page" value={selected.page_path} />
                  <Field label="Submitted" value={selected.submitted_at} />
                  {selected.context.viewport && (
                    <Field label="Viewport" value={selected.context.viewport} />
                  )}
                  {selected.context.timezone && (
                    <Field label="Timezone" value={selected.context.timezone} />
                  )}
                </div>
                {selected.context.user_agent && (
                  <Field label="UA" value={selected.context.user_agent} />
                )}

                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider opacity-60">
                    Admin notes
                  </div>
                  <textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    rows={3}
                    placeholder="Optional triage notes…"
                    className="w-full resize-none rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs"
                  />
                </div>

                <HStack gap="sm">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => performAction("triage")}
                    loading={acting}
                    disabled={selected.status === "resolved"}
                  >
                    Mark triaged
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => performAction("resolve")}
                    loading={acting}
                    disabled={selected.status === "resolved"}
                  >
                    Resolve
                  </Button>
                </HStack>

                {selected.triaged_at && (
                  <div className="text-[10px] opacity-60">
                    Triaged by {selected.triaged_by} at {selected.triaged_at}
                  </div>
                )}
                {selected.resolved_at && (
                  <div className="text-[10px] opacity-60">
                    Resolved by {selected.resolved_by} at {selected.resolved_at}
                  </div>
                )}
              </VStack>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Detail" />
              <EmptyState
                title="Select an entry"
                description="Click any row on the left to read full context and triage."
              />
            </Card>
          )}
        </div>
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
