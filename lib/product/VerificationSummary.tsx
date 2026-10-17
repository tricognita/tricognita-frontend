import Link from "next/link";
import { Card, DataTable, DateTime, EmptyState, HStack, VStack, type Column } from "@/lib/ui";
import {
  activeRun,
  lastCompletedRun,
  recentRuns,
  type VerificationRun,
} from "@/lib/domain";
import { VerificationStatusBadge } from "./StatusBadges";

/**
 * VerificationSummary — "when was this last checked, and what is running now?".
 *
 * A control's status is only as good as the run behind it, so the run is shown
 * next to the counts it produced rather than as a separate log.
 */

const TRIGGER_LABEL: Record<VerificationRun["trigger"], string> = {
  SCHEDULED: "Scheduled",
  MANUAL: "Manual",
  POST_REMEDIATION: "After a fix",
};

export function VerificationSummary({ runs }: { runs: VerificationRun[] }) {
  const running = activeRun(runs);
  const last = lastCompletedRun(runs);

  if (runs.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        title="No verification has run yet"
        description="The first run starts once a cloud account is connected."
      />
    );
  }

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
      cell: (r) => <VerificationStatusBadge state={r.state} size="xs" />,
    },
    { id: "trigger", header: "Trigger", mobile: "supporting", cell: (r) => TRIGGER_LABEL[r.trigger] },
    {
      id: "counts",
      header: "Checks",
      align: "right",
      mobile: "supporting",
      cell: (r) =>
        r.state === "FAILED" ? (
          <span className="text-[var(--fg-subtle)]">—</span>
        ) : (
          <span className="tabular-nums">
            {r.counts.passed} passed · {r.counts.failed} failed
            {r.counts.notAssessed > 0 ? ` · ${r.counts.notAssessed} not assessed` : ""}
          </span>
        ),
    },
  ];

  return (
    <VStack gap="md">
      <div className="grid gap-2 sm:grid-cols-2">
        <Card density="compact">
          <VStack gap="xs">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
              Last verification
            </span>
            {last ? (
              <>
                <HStack gap="sm" align="center" className="flex-wrap">
                  <DateTime value={last.finishedAt ?? last.startedAt} variant="both" className="text-[var(--text-sm)] text-[var(--fg)]" />
                  <VerificationStatusBadge state={last.state} size="xs" />
                </HStack>
                <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                  {last.state === "FAILED"
                    ? last.error?.message ?? "The run could not complete."
                    : `${last.counts.evaluated} checks across the baseline`}
                </span>
              </>
            ) : (
              <span className="text-[var(--text-sm)] text-[var(--fg-muted)]">No completed run yet</span>
            )}
          </VStack>
        </Card>

        <Card density="compact">
          <VStack gap="xs">
            <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
              Running now
            </span>
            {running ? (
              <>
                <HStack gap="sm" align="center" className="flex-wrap">
                  <VerificationStatusBadge state={running.state} size="xs" />
                  <span className="text-[var(--text-sm)] text-[var(--fg)]">
                    {running.scope.controlIds?.length
                      ? `${running.scope.controlIds.length} control${running.scope.controlIds.length > 1 ? "s" : ""}`
                      : "Full baseline"}
                  </span>
                </HStack>
                <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                  Started <DateTime value={running.startedAt} variant="relative" />
                  {running.requestedBy ? ` by ${running.requestedBy}` : ""}
                </span>
              </>
            ) : (
              <span className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                Nothing running. Controls are re-checked on schedule.
              </span>
            )}
          </VStack>
        </Card>
      </div>

      <DataTable
        caption="Recent verification runs"
        rows={recentRuns(runs)}
        columns={columns}
        getRowKey={(r) => r.id}
        density="compact"
        empty={<EmptyState variant="compact" title="No runs yet" />}
      />

      <Link
        href="/dashboard/assurance/history"
        className="text-[var(--text-xs)] text-[var(--accent,var(--brand-primary))] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded-sm w-fit"
      >
        View verification history
      </Link>
    </VStack>
  );
}
