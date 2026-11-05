import { EvidenceState } from "@/lib/contracts/state";
import { evidenceClass } from "./viewmodel";

/**
 * EvidenceTimeline (product) — an append-only, chronological ledger readout.
 * Instrument-style: monospaced records, newest at the bottom, never reordered.
 * Each record's state is colored via the Contract → Token mapping.
 *
 * PUBLIC API: records ({id,label,state}[]). This is HTML (a readout), not a diagram.
 * RESPONSIVE: a scrollable list; wraps at small widths. ACCESSIBILITY: an ordered
 * list with a group label; states are text, not color-only. PERFORMANCE: static
 * list. Consumes Token color via literal utility classes.
 */
export interface EvidenceRecord {
  readonly id: string;
  readonly label: string;
  readonly state: EvidenceState;
}

export function EvidenceTimeline({ records }: { records: readonly EvidenceRecord[] }) {
  return (
    <ol
      aria-label="Evidence timeline (append-only)"
      className="flex flex-col gap-px rounded-panel border border-graticule bg-panel font-mono text-xs"
    >
      {records.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-1.5 border-b border-graticule/40 last:border-b-0">
          <span className="text-bone-subtle tabular-nums">{r.id}</span>
          <span className={`${evidenceClass(r.state)} uppercase tracking-[0.08em]`}>{r.state}</span>
          <span className="text-bone-muted truncate">{r.label}</span>
        </li>
      ))}
    </ol>
  );
}
