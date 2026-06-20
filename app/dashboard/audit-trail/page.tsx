"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { ChevronDown, Download, Lock } from "lucide-react";
import { SHAPExplainer } from "../components/aria/SHAPExplainer";
import { ReActStepTrace } from "../components/aria/ReActStepTrace";
import type { HealingActionRow, RCAResult, ActionStatus } from "@/lib/aria-types";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { fetcher } from "@/lib/swr-fetcher";
import { PageRestrictedGuard } from "../components/PageRestrictedGuard";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterBar,
  FilterChip,
  HStack,
  KPI,
  PageShell,
  StatusDot,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TBodyEmpty,
  VStack,
  cn,
  type BadgeIntent,
} from "@/lib/ui";

// Shared resilient fetcher — see lib/swr-fetcher.
// Import alias kept local so the existing useSWR signature stays unchanged.

// ── Types ─────────────────────────────────────────────────────────────────────

type DateRange = "today" | "7d" | "30d" | "all";

// Map ARIA action status → semantic intent
const STATUS_INTENT: Record<ActionStatus, BadgeIntent> = {
  pending_approval: "warning",
  accepted: "info",
  pending: "warning",
  running: "violet",
  executing: "violet",
  executed: "success",
  success: "success",
  rolled_back: "warning",
  failed: "danger",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function cutoff(range: DateRange): number {
  const now = Date.now();
  if (range === "today") return new Date().setHours(0, 0, 0, 0);
  if (range === "7d") return now - 7 * 86400_000;
  if (range === "30d") return now - 30 * 86400_000;
  return 0;
}

function toCSV(rows: HealingActionRow[]): string {
  const header = [
    "id",
    "rca_log_id",
    "action_type",
    "target_arn",
    "status",
    "healing_mode",
    "created_at",
  ].join(",");
  const lines = rows.map((r) =>
    [r.id, r.rca_log_id, r.action_type, `"${r.target_arn}"`, r.status, r.healing_mode, r.created_at].join(","),
  );
  return [header, ...lines].join("\n");
}

function downloadCSV(rows: HealingActionRow[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `aria-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function shortArn(arn?: string | null): string {
  const a = arn ?? "";
  return a.length > 50 ? `…${a.slice(-47)}` : a;
}

function formatStatus(s: ActionStatus): string {
  return s.replace(/_/g, " ");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewAuditTrail");

  // Gate: null key = no fetch for roles without viewAuditTrail
  const { data: raw, error: rawError } = useSWR<
    HealingActionRow[] | { actions: HealingActionRow[] }
  >(
    swrKey(hasAccess, "/api/aria/audit-trail?limit=500"),
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const allRows: HealingActionRow[] = useMemo(() => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if ("actions" in raw && Array.isArray(raw.actions)) return raw.actions;
    return [];
  }, [raw]);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "ALL">("ALL");
  const [typeSearch, setTypeSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<"ALL" | "AUTONOMOUS" | "MANUAL_APPROVAL">("ALL");

  // Selected row for RCA panel
  const [selected, setSelected] = useState<HealingActionRow | null>(null);
  const { data: rca } = useSWR<RCAResult>(
    selected && hasAccess ? `/api/aria/rca/${selected.rca_log_id}` : null,
    fetcher,
  );

  const filtered = useMemo(() => {
    const ts = cutoff(dateRange);
    return allRows.filter((r) => {
      if (ts && new Date(r.created_at).getTime() < ts) return false;
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (agentFilter !== "ALL" && r.healing_mode !== agentFilter) return false;
      if (typeSearch && !r.action_type.toLowerCase().includes(typeSearch.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [allRows, dateRange, statusFilter, agentFilter, typeSearch]);

  const summaryStats = useMemo(
    () => ({
      total: allRows.length,
      executed: allRows.filter((r) => r.status === "executed").length,
      failed: allRows.filter((r) => r.status === "failed").length,
      pending: allRows.filter((r) => r.status === "pending_approval").length,
      autonomous: allRows.filter((r) => r.healing_mode === "AUTONOMOUS").length,
    }),
    [allRows],
  );

  const shap = useMemo(() => rca?.action_plan?.[0]?.shap_vector ?? {}, [rca]);
  const hasActiveFilter =
    dateRange !== "all" || statusFilter !== "ALL" || agentFilter !== "ALL" || typeSearch !== "";

  // RBAC gate
  if (!hasAccess) {
    return (
      <PageRestrictedGuard
        capability="viewAuditTrail"
        title="Remediation Audit Trail"
        description="Full history of automated and manual remediation actions."
        allowedRoles={["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"]}
        subtitle="Audit Trail"
      >
        {null}
      </PageRestrictedGuard>
    );
  }

  // Status meta indicator
  let statusMeta: React.ReactNode;
  if (rawError?.message === "429") {
    statusMeta = <StatusDot intent="warning" pulse size="sm" label="Rate limited — retrying" />;
  } else if (rawError?.message === "401") {
    statusMeta = <StatusDot intent="danger" size="sm" label="Session expired" />;
  } else if (!raw) {
    statusMeta = <StatusDot intent="info" pulse size="sm" label="Loading audit chain…" />;
  } else {
    statusMeta = (
      <StatusDot
        intent="success"
        size="sm"
        label={`${allRows.length} records · append-only`}
      />
    );
  }

  const renderTableBody = () => {
    if (rawError?.message === "429" || rawError?.message === "401") {
      return (
        <TBodyEmpty colSpan={8}>
          <EmptyState
            title={rawError.message === "429" ? "Rate limited — retrying" : "Session expired"}
            description={
              rawError.message === "429"
                ? "We are retrying automatically. The audit chain itself is unaffected."
                : "Re-authenticate to continue viewing the audit chain."
            }
          />
        </TBodyEmpty>
      );
    }
    if (!raw) {
      return (
        <TBodyEmpty colSpan={8}>
          <EmptyState title="Loading audit records…" description="Reading the latest append-only chain entries." />
        </TBodyEmpty>
      );
    }
    if (filtered.length === 0) {
      const isUnfiltered = allRows.length === 0;
      return (
        <TBodyEmpty colSpan={8}>
          {isUnfiltered ? (
            <EmptyState
              icon={<Lock size={20} className="text-[var(--matcha-300)]" />}
              title="No ARIA actions recorded yet"
              description="Every remediation ARIA proposes, every operator approval, and every rejection lands here — hash-linked into a tamper-evident chain. This becomes your evidence pack for SOC 2 audits and incident retrospectives. Records appear automatically once ARIA's first healing decision is logged."
            />
          ) : (
            <EmptyState
              title="No records match the current filters."
              description="Try widening the date range or clearing the status / agent filter."
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateRange("all");
                    setStatusFilter("ALL");
                    setAgentFilter("ALL");
                    setTypeSearch("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}
        </TBodyEmpty>
      );
    }

    return filtered.map((row, idx) => {
      const isSelected = selected?.id === row.id;
      return (
        <TR
          key={row.id}
          interactive
          selected={isSelected}
          onClick={() => setSelected(isSelected ? null : row)}
        >
          <TD className="text-[var(--stone-600)]">{filtered.length - idx}</TD>
          <TD className="text-[var(--stone-500)] whitespace-nowrap">
            {new Date(row.created_at).toLocaleString()}
          </TD>
          <TD className="font-semibold text-[var(--stone-200)]">{row.action_type}</TD>
          <TD className="hidden sm:table-cell max-w-[200px]" mono truncate>
            {shortArn(row.target_arn)}
          </TD>
          <TD>
            <Badge intent={STATUS_INTENT[row.status]} variant="subtle" size="xs" mono>
              {formatStatus(row.status)}
            </Badge>
          </TD>
          <TD className="hidden md:table-cell">
            <Badge
              intent={row.healing_mode === "AUTONOMOUS" ? "danger" : "neutral"}
              variant="outline"
              size="xs"
              mono
            >
              {row.healing_mode === "AUTONOMOUS" ? "AUTO" : "MANUAL"}
            </Badge>
          </TD>
          <TD className="hidden lg:table-cell font-mono text-[10px] text-[var(--stone-600)]">
            {row.rca_log_id.slice(0, 16)}…
          </TD>
          <TD align="right" className="text-[var(--matcha-300)]">
            {row.rca_log_id ? (
              <ChevronDown
                size={14}
                className={cn("transition-transform duration-200 inline-block", isSelected && "rotate-180")}
              />
            ) : (
              <span className="text-[var(--stone-700)]">—</span>
            )}
          </TD>
        </TR>
      );
    });
  };

  return (
    <PageShell
      eyebrow="ARIA · Audit"
      title="ARIA Audit Trail"
      description="Immutable, append-only log of every ARIA healing action and operator approval decision. Records cannot be modified or deleted; the chain is hash-linked for tamper evidence."
      meta={statusMeta}
      density="tight"
      actions={
        <Button
          variant="ghost"
          size="md"
          icon={<Download size={13} />}
          onClick={() => downloadCSV(filtered)}
          disabled={filtered.length === 0}
        >
          Export CSV ({filtered.length})
        </Button>
      }
    >
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Total actions" value={summaryStats.total} />
        <KPI
          label="Executed"
          value={summaryStats.executed}
          intent={summaryStats.executed > 0 ? "success" : "neutral"}
        />
        <KPI
          label="Failed"
          value={summaryStats.failed}
          intent={summaryStats.failed > 0 ? "danger" : "neutral"}
        />
        <KPI
          label="Pending"
          value={summaryStats.pending}
          intent={summaryStats.pending > 0 ? "warning" : "neutral"}
        />
        <KPI label="Autonomous" value={summaryStats.autonomous} intent="info" />
      </div>

      {/* Filters */}
      <VStack gap="sm">
        <FilterBar label="Date range">
          {(
            [
              ["today", "Today"],
              ["7d", "7 days"],
              ["30d", "30 days"],
              ["all", "All"],
            ] as [DateRange, string][]
          ).map(([v, label]) => (
            <FilterChip key={v} active={dateRange === v} onClick={() => setDateRange(v)}>
              {label}
            </FilterChip>
          ))}
        </FilterBar>

        <FilterBar
          label={hasActiveFilter ? "Filters active" : "Status & agent"}
          action={
            hasActiveFilter && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setDateRange("all");
                  setStatusFilter("ALL");
                  setAgentFilter("ALL");
                  setTypeSearch("");
                }}
              >
                Clear filters
              </Button>
            )
          }
        >
          {/* Status select — kept as native select for the larger option set */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ActionStatus | "ALL")}
            className="rounded border border-[var(--sage-soft)] bg-[var(--moss)] px-2.5 py-1 text-[11px] font-mono uppercase tracking-widest text-[var(--stone-300)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/40"
            aria-label="Filter by action status"
          >
            <option value="ALL">All statuses</option>
            {(
              ["pending_approval", "approved", "executing", "executed", "rolled_back", "failed"] as ActionStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>

          {(["ALL", "AUTONOMOUS", "MANUAL_APPROVAL"] as const).map((v) => (
            <FilterChip
              key={v}
              active={agentFilter === v}
              intent={v === "AUTONOMOUS" ? "danger" : "neutral"}
              onClick={() => setAgentFilter(v)}
            >
              {v === "ALL" ? "Any agent" : v === "AUTONOMOUS" ? "Auto" : "Manual"}
            </FilterChip>
          ))}

          <input
            type="search"
            placeholder="Filter action type…"
            value={typeSearch}
            onChange={(e) => setTypeSearch(e.target.value)}
            className="rounded border border-[var(--sage-soft)] bg-[var(--moss)] px-2.5 py-1 text-[11px] font-mono text-[var(--stone-300)] placeholder:text-[var(--stone-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/40 w-44"
          />
        </FilterBar>
      </VStack>

      {/* Immutability strip + table */}
      <div className="space-y-0">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-t-[var(--radius)] border-x border-t border-[var(--sage-soft)]"
          style={{ background: "var(--moss)" }}
        >
          <Lock size={11} className="text-[var(--stone-500)]" />
          <span className="text-[10px] text-[var(--stone-500)] uppercase tracking-widest">
            Append-only record — no modifications permitted
          </span>
          <span className="ml-auto text-[10px] text-[var(--stone-600)] tabular-nums font-mono">
            {filtered.length} of {allRows.length} records
          </span>
        </div>

        <Table density="compact" stickyHeader className="!rounded-t-none border-t-0">
          <THead>
            <TR>
              <TH width="w-12">#</TH>
              <TH>Timestamp</TH>
              <TH>Action type</TH>
              <TH className="hidden sm:table-cell">Target</TH>
              <TH>Status</TH>
              <TH className="hidden md:table-cell">Agent</TH>
              <TH className="hidden lg:table-cell">RCA session</TH>
              <TH align="right" width="w-10"></TH>
            </TR>
          </THead>
          <TBody>{renderTableBody()}</TBody>
        </Table>
      </div>

      {/* Inline RCA panel */}
      {selected && (
        <Card variant="default" density="spacious" className="!border-[var(--matcha-700)]/40 !bg-[var(--matcha-900)]/20">
          <HStack align="center" justify="between" className="mb-4">
            <HStack gap="sm" align="center">
              <span className="eyebrow text-[var(--matcha-300)]">ARIA Reasoning Trace</span>
              <span className="font-mono text-[10px] text-[var(--stone-600)]">
                {selected.rca_log_id}
              </span>
            </HStack>
            <Button variant="ghost" size="xs" onClick={() => setSelected(null)}>
              Close
            </Button>
          </HStack>

          {/* Action summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-4">
            <Card variant="default" density="compact">
              <p className="eyebrow text-[var(--stone-500)] mb-0.5">Action</p>
              <p className="font-semibold text-[var(--stone-200)]">{selected.action_type}</p>
            </Card>
            <Card variant="default" density="compact">
              <p className="eyebrow text-[var(--stone-500)] mb-0.5">Status</p>
              <Badge intent={STATUS_INTENT[selected.status]} variant="subtle" size="xs" mono>
                {formatStatus(selected.status)}
              </Badge>
            </Card>
            <Card variant="default" density="compact">
              <p className="eyebrow text-[var(--stone-500)] mb-0.5">Mode</p>
              <Badge
                intent={selected.healing_mode === "AUTONOMOUS" ? "danger" : "neutral"}
                variant="outline"
                size="xs"
                mono
              >
                {selected.healing_mode}
              </Badge>
            </Card>
          </div>

          {/* SHAP + RCA reasoning */}
          {!rca ? (
            <EmptyState
              variant="compact"
              title="Loading ARIA reasoning trace…"
              description="Fetching SHAP attribution + ReAct steps for this action."
            />
          ) : (
            <VStack gap="md">
              {Object.keys(shap).length > 0 && (
                <div>
                  <p className="eyebrow text-[var(--stone-500)] mb-2">Risk Attribution (SHAP)</p>
                  <SHAPExplainer shap={shap} />
                </div>
              )}
              {rca.root_cause && (
                <Card variant="warning" density="compact">
                  <p className="text-xs text-[var(--amber-clay)]">
                    <span className="font-semibold">Root cause:</span> {rca.root_cause}
                  </p>
                  <p className="text-[10px] text-[var(--amber-clay)]/70 mt-0.5">
                    Confidence: {(rca.confidence * 100).toFixed(0)}%
                  </p>
                </Card>
              )}
              {rca.reasoning_steps?.length > 0 && (
                <ReActStepTrace steps={rca.reasoning_steps} rootCause={rca.root_cause} />
              )}
            </VStack>
          )}
        </Card>
      )}
    </PageShell>
  );
}
