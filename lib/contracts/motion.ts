/**
 * TRICOGNITA MOTION CONTRACT (Phase 3, Step 1)
 * ---------------------------------------------------------------------------
 * Describes every engineering motion primitive: purpose, inputs, outputs, timing,
 * constraints, reduced-motion behavior, composition. Pure TypeScript — NO React,
 * NO Framer Motion, NO CSS, NO rendering. Timing binds to Token API v1 by
 * type-only reference (`Duration`/`Easing`) so there is one source of truth.
 *
 * The Motion Engine (Phase 3, Step 2) implements these contracts; nothing here
 * animates. Traceability: ENGINEERING_VISUAL_LANGUAGE.md (the five laws) ·
 * DESIGN_LANGUAGE_SYSTEM.md §5 · ENGINEERING_NARRATIVE.md (beats).
 */

import type { Duration, Easing } from "@/lib/design/tokens";
import type { Point } from "@/app/components/geometry/math";
import { Beat } from "./narrative";
import { OperationalState, EvidenceState } from "./state";

/* ── The five laws every motion implementation MUST satisfy ─────────────────── */
export enum MotionLaw {
  MotionEqualsComputation = "motion-equals-computation",
  IdleEqualsStillness = "idle-equals-stillness",
  ReducedRendersFinalTruth = "reduced-renders-final-truthful-state",
  ReplayIsDeterministic = "replay-is-deterministic",
  RollbackFollowsExactPath = "rollback-follows-exact-execution-path",
  NothingDecorativeMoves = "nothing-decorative-moves",
}

/* ── The primitives ──────────────────────────────────────────────────────────── */
export enum MotionPrimitive {
  FlowSignal = "flowSignal",
  SnapState = "snapState",
  SealBlock = "sealBlock",
  VerifyChain = "verifyChain",
  DrawEvidence = "drawEvidence",
  ReplayProjection = "replayProjection",
  RetraceRollback = "retraceRollback",
  ArchiveBeat = "archiveBeat",
  BootSequence = "bootSequence",
}

/** Timing binds to token keys (never raw numbers). `staggerToken` names a stagger. */
export interface Timing {
  readonly duration: Duration;
  readonly easing: Easing;
  /** Per-item stagger for sequences (verifyChain links, replay events, boot arms). */
  readonly stagger?: "arm" | "node" | "gate";
  /** Ceiling for composite motions (e.g. bootSequence ≤ bootTotal). */
  readonly maxTotal?: Duration;
}

/** How a motion terminated. Every motion ends in a truthful, locked state. */
export type MotionOutcome = "settled" | "halted" | "reverted";

/** The result contract: the element left in its final state, plus interruption. */
export interface MotionResult {
  readonly outcome: MotionOutcome;
  readonly interrupted: boolean;
}

/* ── Per-primitive input contracts ─────────────────────────────────────────────
   Geometry is referenced by value (a Point path), never re-derived here.        */

/** A route the motion travels — either endpoints (engine routes it) or a ready `d`. */
export type MotionPath = { readonly from: Point; readonly to: Point } | { readonly d: string; readonly length?: number };

export interface FlowSignalInput {
  readonly path: MotionPath;
  /** Direction MUST be truthful; `reverse` is only for retrace (see RetraceRollback). */
  readonly reverse?: boolean;
  /** Concurrent independent signals = orchestration (EVL §4). */
  readonly count?: number;
}

export interface SnapStateInput {
  readonly from: OperationalState | EvidenceState;
  readonly to: OperationalState | EvidenceState;
}

export interface SealBlockInput {
  /** The evidence element transitioning unsigned → sealed. */
  readonly targetId: string;
}

export interface DrawEvidenceInput {
  /** The evidence edge that draws as the record is produced (pending → unsigned). */
  readonly path: MotionPath;
}

export interface VerifyChainInput {
  /** Ordered links (content_hash → prev_hash). Walk in order; halt at first mismatch. */
  readonly links: number;
}

export interface ReplayProjectionInput {
  /** Chain events replayed, in log order, into typed graph nodes/edges. */
  readonly eventCount: number;
}

export interface RetraceRollbackInput {
  /** The EXACT path the execution flowed along; retrace is this, reversed. */
  readonly executedPath: MotionPath;
}

export interface ArchiveBeatInput {
  readonly beat: Beat;
}

export interface BootSequenceInput {
  /** Arms to extend during activation (the 8 execution domains). */
  readonly arms?: number;
}

/** Discriminated union of a motion invocation (engine reads this; contract only). */
export type MotionSpec =
  | { readonly kind: MotionPrimitive.FlowSignal; readonly input: FlowSignalInput }
  | { readonly kind: MotionPrimitive.SnapState; readonly input: SnapStateInput }
  | { readonly kind: MotionPrimitive.SealBlock; readonly input: SealBlockInput }
  | { readonly kind: MotionPrimitive.DrawEvidence; readonly input: DrawEvidenceInput }
  | { readonly kind: MotionPrimitive.VerifyChain; readonly input: VerifyChainInput }
  | { readonly kind: MotionPrimitive.ReplayProjection; readonly input: ReplayProjectionInput }
  | { readonly kind: MotionPrimitive.RetraceRollback; readonly input: RetraceRollbackInput }
  | { readonly kind: MotionPrimitive.ArchiveBeat; readonly input: ArchiveBeatInput }
  | { readonly kind: MotionPrimitive.BootSequence; readonly input: BootSequenceInput };

/* ── The contract registry (documentation-in-code, machine-readable) ──────────── */
export interface MotionContractMeta {
  readonly primitive: MotionPrimitive;
  readonly purpose: string;
  readonly timing: Timing;
  /** Linear = computation is mechanical (EVL §0.2); false = settle-and-lock. */
  readonly linear: boolean;
  readonly constraints: readonly string[];
  /** The truthful locked end-state rendered under prefers-reduced-motion. */
  readonly reducedMotion: string;
  /** Primitives this one composes from (in order), if any. */
  readonly composedOf?: readonly MotionPrimitive[];
  readonly entersOperational?: OperationalState;
  readonly entersEvidence?: EvidenceState;
}

export const MOTION_CONTRACTS: Readonly<Record<MotionPrimitive, MotionContractMeta>> = {
  [MotionPrimitive.FlowSignal]: {
    primitive: MotionPrimitive.FlowSignal,
    purpose: "A directed signal travels a rail at constant velocity — an observation inbound, an arm reaching a domain, orchestration under load.",
    timing: { duration: "flow", easing: "linear" },
    linear: true,
    constraints: [
      "Direction must be truthful — never draw a wrong-way flow (EVL §0.1).",
      "Constant velocity (linear) — telemetry, not easing.",
      "Runs ONLY while real flow/computation is happening; idle = no signal.",
      "count>1 = concurrent independent signals (orchestration, EVL §4).",
    ],
    reducedMotion: "Signal shown at its destination; no travel.",
  },
  [MotionPrimitive.SnapState]: {
    primitive: MotionPrimitive.SnapState,
    purpose: "A discrete, quantized transition between two states — determinism you can see.",
    timing: { duration: "snap", easing: "snap" },
    linear: false,
    constraints: [
      "The transition MUST be legal per the State Contract (assert*Transition).",
      "Discrete — never interpolate a confidence/probability (EVL §0.3, §1).",
      "Binary/snapped; no fuzzy in-between.",
    ],
    reducedMotion: "Final state rendered immediately; no transition.",
  },
  [MotionPrimitive.SealBlock]: {
    primitive: MotionPrimitive.SealBlock,
    purpose: "An evidence block's seal snaps shut — content settles, digest resolves, unsigned → sealed.",
    timing: { duration: "seal", easing: "settle" },
    linear: false,
    constraints: [
      "Only after content has settled (Unsigned → Sealed).",
      "Once sealed, immutable — never re-animates (EVL §2, §8).",
    ],
    reducedMotion: "Sealed block rendered with its seal shut.",
    entersEvidence: EvidenceState.Sealed,
  },
  [MotionPrimitive.DrawEvidence]: {
    primitive: MotionPrimitive.DrawEvidence,
    purpose: "An evidence edge draws as the record is produced (pending → unsigned) — edges are evidence.",
    timing: { duration: "settle", easing: "settle" },
    linear: false,
    constraints: [
      "An edge draws ONLY when evidence is actually produced.",
      "Append-only — a drawn edge never un-draws (EVL §2).",
    ],
    reducedMotion: "Evidence edge fully drawn and the block present.",
    entersEvidence: EvidenceState.Unsigned,
  },
  [MotionPrimitive.VerifyChain]: {
    primitive: MotionPrimitive.VerifyChain,
    purpose: "Walk the chain link by link, ticking each verified (content_hash → prev_hash) — or halt at the exact break.",
    timing: { duration: "tick", easing: "linear", stagger: "node" },
    linear: true,
    constraints: [
      "Walk links in order (sealed → verified).",
      "Halt at the FIRST prev_hash mismatch → operational halt at that link (EVL §8).",
      "Never fabricate a seal or a pass.",
    ],
    reducedMotion: "All links shown verified, or the break shown at its exact link.",
    entersEvidence: EvidenceState.Verified,
  },
  [MotionPrimitive.ReplayProjection]: {
    primitive: MotionPrimitive.ReplayProjection,
    purpose: "Replay the chain in log order to precipitate the typed graph (CQRS read-side) — the story re-tells itself.",
    timing: { duration: "tick", easing: "linear", stagger: "node" },
    linear: true,
    constraints: [
      "The graph is DERIVED from the chain (read-side) — never the source (EVL §7).",
      "Deterministic: replay twice → identical graph (EVL §0.3).",
      "Instantiate nodes/edges strictly in log order.",
    ],
    reducedMotion: "The complete projected graph rendered; no replay.",
  },
  [MotionPrimitive.RetraceRollback]: {
    primitive: MotionPrimitive.RetraceRollback,
    purpose: "Time runs backward along the EXACT execution path to the preserved prior state — and appends a signed 'reverted' record.",
    timing: { duration: "flow", easing: "linear" },
    linear: true,
    constraints: [
      "Follows the exact execution path in reverse — never a new path (EVL §3).",
      "Lands on the PRESERVED prior state (states are kept, not overwritten).",
      "APPENDS reverted evidence — the ledger still grows; never deletes evidence.",
      "Operational: Engaged → Reverted → Nominal.",
    ],
    reducedMotion: "Prior state restored and the reverted evidence record present.",
    composedOf: [MotionPrimitive.FlowSignal, MotionPrimitive.DrawEvidence, MotionPrimitive.SealBlock],
    entersOperational: OperationalState.Reverted,
  },
  [MotionPrimitive.ArchiveBeat]: {
    primitive: MotionPrimitive.ArchiveBeat,
    purpose: "A completed beat settles and compacts into permanent history (terminal) — retrievable only via replay.",
    timing: { duration: "settle", easing: "settle" },
    linear: false,
    constraints: [
      "Terminal — the beat compacts to history.",
      "Never destroyed; retrievable via deterministic replay (EVL §2; NARRATIVE G3).",
    ],
    reducedMotion: "Beat rendered in its archived/compacted end-state.",
    entersEvidence: EvidenceState.Archived,
  },
  [MotionPrimitive.BootSequence]: {
    primitive: MotionPrimitive.BootSequence,
    purpose: "System activation — boundary draws, core powers, 8 arms reach, evidence settles, status resolves to NOMINAL. 'The platform just came online.'",
    timing: { duration: "bootTotal", easing: "settle", stagger: "arm", maxTotal: "bootTotal" },
    linear: false,
    constraints: [
      "≤ bootTotal (380ms), once (Visual OS §3).",
      "The trust boundary is drawn FIRST and thereafter stable (EVL §10).",
      "Composed of ordered sub-motions; the whole is capped by maxTotal.",
    ],
    reducedMotion: "The fully-online end-state rendered instantly (beautiful static).",
    composedOf: [
      MotionPrimitive.DrawEvidence,
      MotionPrimitive.FlowSignal,
      MotionPrimitive.SnapState,
    ],
    entersOperational: OperationalState.Nominal,
  },
};

/* ── Composition backbone — beats ↔ motion, states ↔ entry motion ──────────────
   A narrative run plays BEAT_MOTION in order, honoring skipped beats. `null` =
   the beat has no motion of its own (it's a still state or a latent affordance).  */

export const BEAT_MOTION: Readonly<Record<Beat, MotionPrimitive | null>> = {
  [Beat.Initial]: null, // a still, locked prior state
  [Beat.Trigger]: null, // a discrete originating mark
  [Beat.Observation]: MotionPrimitive.FlowSignal,
  [Beat.DeterministicEvaluation]: MotionPrimitive.SnapState,
  [Beat.PolicyDecision]: MotionPrimitive.SnapState,
  [Beat.AutonomousExecution]: MotionPrimitive.FlowSignal,
  [Beat.EvidenceGeneration]: MotionPrimitive.DrawEvidence,
  [Beat.Verification]: MotionPrimitive.VerifyChain,
  [Beat.RollbackPath]: MotionPrimitive.RetraceRollback, // latent; runs only if taken
  [Beat.FinalArchivedState]: MotionPrimitive.ArchiveBeat,
};

/** The "motion implication" of each state — the primitive that drives entry. */
export const OPERATIONAL_ENTRY_MOTION: Readonly<Record<OperationalState, MotionPrimitive | null>> = {
  [OperationalState.Nominal]: MotionPrimitive.SnapState, // settles to still
  [OperationalState.Advisory]: MotionPrimitive.SnapState,
  [OperationalState.Engaged]: MotionPrimitive.FlowSignal,
  [OperationalState.Halt]: MotionPrimitive.SnapState,
  [OperationalState.Reverted]: MotionPrimitive.RetraceRollback,
};

export const EVIDENCE_ENTRY_MOTION: Readonly<Record<EvidenceState, MotionPrimitive | null>> = {
  [EvidenceState.Pending]: MotionPrimitive.DrawEvidence,
  [EvidenceState.Unsigned]: MotionPrimitive.DrawEvidence,
  [EvidenceState.Sealed]: MotionPrimitive.SealBlock,
  [EvidenceState.Verified]: MotionPrimitive.VerifyChain,
  [EvidenceState.Archived]: MotionPrimitive.ArchiveBeat,
};

/* ── Composition rules (documented + partially machine-checkable) ──────────────── */
export const COMPOSITION_RULES: readonly string[] = [
  "A narrative run plays BEAT_MOTION in beat order, honoring skipped beats (which do not animate).",
  "Orchestration = multiple concurrent FlowSignals (count>1 / parallel invocations), phase-staggered.",
  "Composite motions (RetraceRollback, BootSequence) run their composedOf primitives in listed order under one timing ceiling.",
  "A motion may only enter a state its input transition permits (State Contract).",
  "Every primitive honors all five MotionLaws; reduced-motion always renders the primitive's `reducedMotion` end-state.",
];

/* ── Invariant — fail fast on an incoherent contract ───────────────────────────── */
export class MotionContractError extends Error {
  constructor(message: string) {
    super(`Motion contract violated: ${message}`);
    this.name = "MotionContractError";
  }
}

/** Every primitive has a registry entry, and every beat maps to a known primitive or null. */
export function assertMotionContract(): void {
  for (const p of Object.values(MotionPrimitive)) {
    if (!MOTION_CONTRACTS[p]) throw new MotionContractError(`missing contract for ${p}`);
  }
  for (const [beat, prim] of Object.entries(BEAT_MOTION)) {
    if (prim !== null && !MOTION_CONTRACTS[prim]) {
      throw new MotionContractError(`beat ${beat} maps to unknown primitive ${prim}`);
    }
  }
}
