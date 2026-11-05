import { EmptyState } from "@/lib/ui";
import {
  evidenceByRecency,
  type Control,
  type Evidence,
  type VerificationRun,
} from "@/lib/domain";
import { EvidenceCard } from "./EvidenceCard";

/**
 * EvidenceList — evidence in the order it was recorded, newest first.
 *
 * Not a file browser: each entry resolves its own control and run so the
 * reader sees the assurance context, not a row of opaque references.
 */
export function EvidenceList({
  evidence,
  controls,
  runs,
  emptyTitle = "No evidence yet",
  emptyDescription = "Evidence is recorded from the first verification run.",
}: {
  evidence: Evidence[];
  controls: Control[];
  runs: VerificationRun[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (evidence.length === 0) {
    return <EmptyState variant="bordered" title={emptyTitle} description={emptyDescription} />;
  }

  const controlById = new Map(controls.map((c) => [c.id, c]));
  const runById = new Map(runs.map((r) => [r.id, r]));

  return (
    <ul className="flex flex-col gap-2">
      {evidenceByRecency(evidence).map((e) => (
        <li key={e.id}>
          <EvidenceCard
            evidence={e}
            control={e.controlId ? controlById.get(e.controlId) : undefined}
            run={e.runId ? runById.get(e.runId) : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
