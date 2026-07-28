/**
 * TRICOGNITA NARRATIVE CONTRACT (Phase 3, Step 1)
 * ---------------------------------------------------------------------------
 * The ten-beat arc and its status model — the SOURCE OF TRUTH for the Lifecycle
 * Spine. Pure TypeScript. Encodes the cognitive guarantees (ENGINEERING_
 * NARRATIVE.md): G1 locatability (always a "you are here"), G2 causality
 * (monotonic completion), G3 recoverability (deterministic replay).
 *
 * The LifecycleSpine geometry (10 nodes) maps 1:1 to these beats; the rendering
 * layer maps BeatStatus → visual emphasis. Beats are never invented or reordered.
 */

/** The ten beats, in fixed order. Numeric value === ordinal (1..10). */
export enum Beat {
  Initial = 1,
  Trigger,
  Observation,
  DeterministicEvaluation,
  PolicyDecision,
  AutonomousExecution,
  EvidenceGeneration,
  Verification,
  RollbackPath,
  FinalArchivedState,
}

export const BEAT_COUNT = 10 as const;

/** The canonical ordered arc. Invariant: exactly 10, ordinals 1..10 contiguous. */
export const BEAT_ORDER: readonly Beat[] = [
  Beat.Initial,
  Beat.Trigger,
  Beat.Observation,
  Beat.DeterministicEvaluation,
  Beat.PolicyDecision,
  Beat.AutonomousExecution,
  Beat.EvidenceGeneration,
  Beat.Verification,
  Beat.RollbackPath,
  Beat.FinalArchivedState,
];

/** Status of a beat within one narrative run. Skipped ≠ omitted (drawn greyed). */
export type BeatStatus = "completed" | "current" | "future" | "skipped";

export interface BeatMeta {
  readonly beat: Beat;
  readonly ordinal: number; // 1..10
  readonly key: string; // stable machine key
  /** The cognitive question this beat answers (ENGINEERING_NARRATIVE §1). */
  readonly question: string;
  /** Beats that a read-only capability legitimately skips (e.g. execution/rollback). */
  readonly skippable: boolean;
}

export const BEATS: Readonly<Record<Beat, BeatMeta>> = {
  [Beat.Initial]: { beat: Beat.Initial, ordinal: 1, key: "initial", question: "What was true before?", skippable: false },
  [Beat.Trigger]: { beat: Beat.Trigger, ordinal: 2, key: "trigger", question: "Why did anything happen now?", skippable: false },
  [Beat.Observation]: { beat: Beat.Observation, ordinal: 3, key: "observation", question: "What did we see?", skippable: false },
  [Beat.DeterministicEvaluation]: { beat: Beat.DeterministicEvaluation, ordinal: 4, key: "evaluation", question: "What does it mean — and can I trust the meaning?", skippable: false },
  [Beat.PolicyDecision]: { beat: Beat.PolicyDecision, ordinal: 5, key: "policy", question: "Pass or fail — and where?", skippable: false },
  [Beat.AutonomousExecution]: { beat: Beat.AutonomousExecution, ordinal: 6, key: "execution", question: "What is the platform doing about it — on whose authority?", skippable: true },
  [Beat.EvidenceGeneration]: { beat: Beat.EvidenceGeneration, ordinal: 7, key: "evidence", question: "What's the proof it happened?", skippable: false },
  [Beat.Verification]: { beat: Beat.Verification, ordinal: 8, key: "verification", question: "Is the proof sound — untampered, signed, linked?", skippable: false },
  [Beat.RollbackPath]: { beat: Beat.RollbackPath, ordinal: 9, key: "rollback", question: "Can this be undone — and is that undo accountable?", skippable: true },
  [Beat.FinalArchivedState]: { beat: Beat.FinalArchivedState, ordinal: 10, key: "archive", question: "What is true now, and where does it live forever?", skippable: false },
};

/** The beat rollback originates at, and the beat it retraces (ENGINEERING_NARRATIVE §2.2). */
export const ROLLBACK_BEAT = Beat.RollbackPath;
export const EXECUTION_BEAT = Beat.AutonomousExecution;
/** The terminal beat — the run compacts to permanent history here. */
export const ARCHIVE_BEAT = Beat.FinalArchivedState;

/** A read-only capability (e.g. a posture scan) skips execution + rollback. */
export const DEFAULT_READONLY_SKIPS: readonly Beat[] = [Beat.AutonomousExecution, Beat.RollbackPath];

/* ── Progress model ──────────────────────────────────────────────────────────
   `current` = the live beat (G1). Everything before it that isn't skipped is
   `completed` (G2, causal/monotonic). Everything after is `future`. `skipped`
   beats are marked, never removed (they carry the "nothing changed" meaning).   */

export type NarrativeMode = "live" | "replay" | "archived";

export interface NarrativeProgress {
  readonly mode: NarrativeMode;
  /** The live beat, or null before start / when fully archived. */
  readonly current: Beat | null;
  /** Beats not applicable to this capability (drawn greyed). */
  readonly skipped: readonly Beat[];
}

/**
 * Derive each beat's status from `current` + `skipped`. Deterministic and pure —
 * same inputs always yield the same statuses (G3). In `archived` mode every
 * non-skipped beat is `completed`.
 */
export function deriveStatuses(progress: NarrativeProgress): Readonly<Record<Beat, BeatStatus>> {
  const { mode, current, skipped } = progress;
  const skippedSet = new Set(skipped);
  const currentOrdinal = current ? BEATS[current].ordinal : null;

  const out = {} as Record<Beat, BeatStatus>;
  for (const beat of BEAT_ORDER) {
    if (skippedSet.has(beat)) {
      out[beat] = "skipped";
      continue;
    }
    if (mode === "archived") {
      out[beat] = "completed";
      continue;
    }
    const ord = BEATS[beat].ordinal;
    if (currentOrdinal === null) out[beat] = "future";
    else if (ord === currentOrdinal) out[beat] = "current";
    else if (ord < currentOrdinal) out[beat] = "completed";
    else out[beat] = "future";
  }
  return out;
}

/** The ordered non-skipped beats that make up a run — its replay timeline. */
export type NarrativeTimeline = readonly Beat[];

export function timelineOf(skipped: readonly Beat[]): NarrativeTimeline {
  const s = new Set(skipped);
  return BEAT_ORDER.filter((b) => !s.has(b));
}

/** Replay is deterministic: two runs with the same skips have identical timelines (G3). */
export function isDeterministicReplay(a: NarrativeTimeline, b: NarrativeTimeline): boolean {
  return a.length === b.length && a.every((beat, i) => beat === b[i]);
}

/* ── Invariants — fail fast ──────────────────────────────────────────────────── */

export class NarrativeContractError extends Error {
  constructor(message: string) {
    super(`Narrative contract violated: ${message}`);
    this.name = "NarrativeContractError";
  }
}

/** The arc is always exactly 10 contiguous beats (1..10). */
export function assertBeatContract(): void {
  if (BEAT_ORDER.length !== BEAT_COUNT) {
    throw new NarrativeContractError(`arc must have ${BEAT_COUNT} beats, has ${BEAT_ORDER.length}`);
  }
  BEAT_ORDER.forEach((beat, i) => {
    if (BEATS[beat].ordinal !== i + 1) {
      throw new NarrativeContractError(`beat ${beat} out of order at index ${i}`);
    }
  });
}

/** A `current` beat is only legal if every earlier non-skipped beat is completed. */
export function assertMonotonic(progress: NarrativeProgress): void {
  const statuses = deriveStatuses(progress);
  const currentOrdinal = progress.current ? BEATS[progress.current].ordinal : 0;
  for (const beat of BEAT_ORDER) {
    if (statuses[beat] === "skipped") continue;
    if (BEATS[beat].ordinal < currentOrdinal && statuses[beat] !== "completed") {
      throw new NarrativeContractError(`beat ${beat} precedes current but is not completed`);
    }
  }
}
