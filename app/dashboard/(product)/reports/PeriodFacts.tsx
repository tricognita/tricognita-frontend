import { Card, DateTime, HStack, VStack } from "@/lib/ui";
import type { PeriodRecord, Timestamp } from "@/lib/domain";

/**
 * PeriodFacts — what the retained record itself holds for a period.
 *
 * Deliberately separate from a report's own summary. A report's counts were
 * true when it was generated; these are read from the record now. Merging them
 * into one number would quietly overwrite the difference.
 */

function Fact({ label, value }: { label: string; value: number }) {
  return (
    <VStack gap="xs" className="min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</span>
      <span className="text-[var(--text-lg)] tabular-nums text-[var(--fg)]">{value}</span>
    </VStack>
  );
}

export function PeriodFacts({
  record,
  start,
  end,
}: {
  record: PeriodRecord;
  start: Timestamp;
  end: Timestamp;
}) {
  const nothingRetained = record.runs === 0 && record.evidence === 0;

  return (
    <Card>
      <VStack gap="md">
        <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
          Read from the record now, for{" "}
          <DateTime value={start} variant="absolute" withTime={false} /> –{" "}
          <DateTime value={end} variant="absolute" withTime={false} />.
        </p>

        {nothingRetained ? (
          <p className="text-[var(--text-sm)] text-[var(--fg-muted)] max-w-[70ch]">
            No verification run or evidence record currently retained falls inside this period. Any
            counts shown elsewhere on this page come from the report as it was generated, not from
            the record as it stands today.
          </p>
        ) : (
          <HStack gap="xl" className="flex-wrap">
            <Fact label="Verification runs" value={record.runs} />
            <Fact label="Completed" value={record.runsCompleted} />
            <Fact label="Did not complete" value={record.runsFailed} />
            <Fact label="Control results" value={record.results} />
            <Fact label="Drift detected" value={record.driftDetected} />
            <Fact label="Drift resolved" value={record.driftResolved} />
            <Fact label="Evidence records" value={record.evidence} />
            <Fact label="Integrity failures" value={record.evidenceIntegrityFailed} />
          </HStack>
        )}
      </VStack>
    </Card>
  );
}
