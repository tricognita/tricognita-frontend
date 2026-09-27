import { DataTable, DateTime, EmptyState, type Column } from "@/lib/ui";
import { runsByRecency, type VerificationRun } from "@/lib/domain";
import { VerificationStatusBadge } from "./StatusBadges";

/**
 * VerificationRunsTable — the historical record.
 *
 * Every run is listed, including the ones that failed and the one still
 * running. A record that only shows successes proves nothing, so failures stay
 * visible with the reason they failed.
 */

const TRIGGER_LABEL: Record<VerificationRun["trigger"], string> = {
  SCHEDULED: "Scheduled",
  MANUAL: "Manual",
  POST_REMEDIATION: "After a fix",
};

export function VerificationRunsTable({ runs }: { runs: VerificationRun[] }) {
  const columns: Column<VerificationRun>[] = [
    {
      id: "started",
      header: "Started",
      mobile: "title",
      cell: (r) => <DateTime value={r.startedAt} variant="both" />,
    },
    {
      id: "state",
      header: "Result",
      mobile: "status",
      width: "w-[140px]",
      cell: (r) => <VerificationStatusBadge state={r.state} size="xs" />,
    },
    {
      id: "trigger",
      header: "Trigger",
      mobile: "supporting",
      width: "w-[130px]",
      cell: (r) => TRIGGER_LABEL[r.trigger],
    },
    {
      id: "scope",
      header: "Scope",
      mobile: "supporting",
      width: "w-[160px]",
      cell: (r) =>
        r.scope.controlIds?.length
          ? `${r.scope.controlIds.length} control${r.scope.controlIds.length > 1 ? "s" : ""}`
          : "Full baseline",
    },
    {
      id: "results",
      header: "Results",
      align: "right",
      mobile: "supporting",
      width: "w-[230px]",
      cell: (r) =>
        r.state === "FAILED" ? (
          <span className="text-[var(--fg-muted)]">{r.error?.message ?? "Did not complete"}</span>
        ) : r.counts.evaluated === 0 ? (
          <span className="text-[var(--fg-subtle)]">—</span>
        ) : (
          <span className="tabular-nums text-[var(--fg-muted)]">
            {r.counts.evaluated} checked · {r.counts.passed} passed · {r.counts.failed} failed
            {r.counts.notAssessed > 0 ? ` · ${r.counts.notAssessed} not assessed` : ""}
          </span>
        ),
    },
    {
      id: "finished",
      header: "Finished",
      mobile: "hidden",
      width: "w-[160px]",
      cell: (r) =>
        r.finishedAt ? <DateTime value={r.finishedAt} variant="relative" /> : <span className="text-[var(--fg-subtle)]">—</span>,
    },
  ];

  return (
    <DataTable
      caption="Verification runs"
      rows={runsByRecency(runs)}
      columns={columns}
      getRowKey={(r) => r.id}
      density="compact"
      stickyHeader
      empty={
        <EmptyState
          variant="compact"
          title="No verification runs recorded"
          description="The record starts with the first run after a cloud account is connected."
        />
      }
    />
  );
}
