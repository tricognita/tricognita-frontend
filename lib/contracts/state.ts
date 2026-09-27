/**
 * TRICOGNITA STATE CONTRACT (Phase 3, Step 1)
 * ---------------------------------------------------------------------------
 * The engineering states, their legal/illegal transitions, terminal status, and
 * visual implications. Pure TypeScript — no React, no Framer, no CSS, no
 * rendering. Motion implications are defined in `./motion` (to keep this file a
 * dependency-free leaf); each state's motion is cross-referenced in JSDoc.
 *
 * Two machines, because the platform has two distinct kinds of state:
 *   • OperationalState — the color/state grammar of a domain/control/board.
 *   • EvidenceState    — the append-only lifecycle of an evidence record.
 *
 * Traceability: TRICOGNITA_VISUAL_OS.md (state grammar) · ENGINEERING_VISUAL_
 * LANGUAGE.md (§0.3 discrete state, §8 signed evidence) · ENGINEERING_NARRATIVE.md.
 */

import type { StateRole } from "@/lib/design/tokens";

/* ────────────────────────────────────────────────────────────────────────────
   OPERATIONAL STATE — the state grammar (color = state)
   nominal   proven / at-rest      → StateRole "nominal"   · motion: settle→still
   advisory  ARIA proposal/caution → StateRole "advisory"  · motion: snapState
   engaged   autonomously acting   → StateRole "engaged"   · motion: snapState + flowSignal
   halt      blocked / failed      → StateRole "halt"      · motion: snapState (hard stop)
   reverted  rollback in progress  → StateRole "engaged"   · motion: retraceRollback → settles nominal
   ──────────────────────────────────────────────────────────────────────────── */
export enum OperationalState {
  Nominal = "nominal",
  Advisory = "advisory",
  Engaged = "engaged",
  Halt = "halt",
  Reverted = "reverted",
}

/* ────────────────────────────────────────────────────────────────────────────
   EVIDENCE STATE — append-only, forward-only (a record never moves backward)
   pending   being produced (pre-hash)  · motion: drawEvidence
   unsigned  content settled, no seal   · motion: settle
   sealed    HMAC-signed, seal shut     · motion: sealBlock
   verified  hash-link checked vs prev  · motion: verifyChain
   archived  compacted to history       · motion: archiveBeat   (TERMINAL)
   ──────────────────────────────────────────────────────────────────────────── */
export enum EvidenceState {
  Pending = "pending",
  Unsigned = "unsigned",
  Sealed = "sealed",
  Verified = "verified",
  Archived = "archived",
}

/** Union of every engineering state (both machines). */
export type EngineeringState = OperationalState | EvidenceState;

/* ── Legal transitions (anything not listed is ILLEGAL — fail fast) ─────────── */

/** Operational transitions. `nominal` is the resting attractor; no state is terminal. */
export const OPERATIONAL_TRANSITIONS: Readonly<Record<OperationalState, readonly OperationalState[]>> = {
  [OperationalState.Nominal]: [OperationalState.Advisory, OperationalState.Engaged, OperationalState.Halt],
  [OperationalState.Advisory]: [OperationalState.Engaged, OperationalState.Halt, OperationalState.Nominal],
  [OperationalState.Engaged]: [OperationalState.Nominal, OperationalState.Halt, OperationalState.Reverted],
  [OperationalState.Halt]: [OperationalState.Advisory, OperationalState.Engaged, OperationalState.Nominal],
  [OperationalState.Reverted]: [OperationalState.Nominal],
};

/** Evidence transitions — strictly forward; `archived` is terminal. */
export const EVIDENCE_TRANSITIONS: Readonly<Record<EvidenceState, readonly EvidenceState[]>> = {
  [EvidenceState.Pending]: [EvidenceState.Unsigned],
  [EvidenceState.Unsigned]: [EvidenceState.Sealed],
  [EvidenceState.Sealed]: [EvidenceState.Verified],
  [EvidenceState.Verified]: [EvidenceState.Archived],
  [EvidenceState.Archived]: [],
};

/** The resting operational state (a healthy system idles here). */
export const OPERATIONAL_RESTING = OperationalState.Nominal;

/** Terminal states (no legal outgoing transition). */
export const OPERATIONAL_TERMINAL: readonly OperationalState[] = [];
export const EVIDENCE_TERMINAL: readonly EvidenceState[] = [EvidenceState.Archived];

/* ── Visual implications: state → color role (null = neutral / fg-muted) ─────── */

export const OPERATIONAL_COLOR: Readonly<Record<OperationalState, StateRole | null>> = {
  [OperationalState.Nominal]: "nominal",
  [OperationalState.Advisory]: "advisory",
  [OperationalState.Engaged]: "engaged",
  [OperationalState.Halt]: "halt",
  [OperationalState.Reverted]: "engaged", // active reversal; settles to nominal
};

export const EVIDENCE_COLOR: Readonly<Record<EvidenceState, StateRole | null>> = {
  [EvidenceState.Pending]: null,
  [EvidenceState.Unsigned]: null,
  [EvidenceState.Sealed]: "nominal",
  [EvidenceState.Verified]: "nominal",
  [EvidenceState.Archived]: null, // dimmed / compacted history
};

/* ── Invariants — fail fast, never silently accept an illegal transition ─────── */

export class StateTransitionError extends Error {
  constructor(from: EngineeringState, to: EngineeringState) {
    super(`Illegal state transition: ${from} → ${to}`);
    this.name = "StateTransitionError";
  }
}

export function isLegalOperationalTransition(from: OperationalState, to: OperationalState): boolean {
  return OPERATIONAL_TRANSITIONS[from].includes(to);
}

export function isLegalEvidenceTransition(from: EvidenceState, to: EvidenceState): boolean {
  return EVIDENCE_TRANSITIONS[from].includes(to);
}

export function assertOperationalTransition(from: OperationalState, to: OperationalState): void {
  if (!isLegalOperationalTransition(from, to)) throw new StateTransitionError(from, to);
}

export function assertEvidenceTransition(from: EvidenceState, to: EvidenceState): void {
  if (!isLegalEvidenceTransition(from, to)) throw new StateTransitionError(from, to);
}

export function isTerminalOperational(s: OperationalState): boolean {
  return OPERATIONAL_TERMINAL.includes(s);
}
export function isTerminalEvidence(s: EvidenceState): boolean {
  return EVIDENCE_TERMINAL.includes(s);
}
