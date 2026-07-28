/**
 * snapState — a discrete, quantized transition between two states (EVL §0.3, §1).
 * Determinism you can see: a detent "snap", never an interpolated confidence.
 *
 * PUBLIC API: `snapState(target, input, opts?)`; `planSnapState(input)` (pure).
 * The transition is validated against the State Contract and THROWS on an illegal
 * move — an illegal transition never animates (fail fast).
 * TIMING: `snap` duration + snap easing. REDUCED MOTION: the final state is shown
 * immediately (transform reset) — the state itself is applied by the render layer's
 * class swap; snapState only performs the discrete gesture.
 * SSR: pure plan; client-only application. PERFORMANCE: transform only.
 * ACCESSIBILITY: decorative gesture; the state change is announced by the render layer.
 * COMPOSITION: used at DeterministicEvaluation and PolicyDecision beats.
 */
import { duration, easingCss } from "../design/tokens";
import {
  OperationalState,
  EvidenceState,
  assertOperationalTransition,
  assertEvidenceTransition,
} from "../contracts/state";
import type { SnapStateInput } from "../contracts/motion";
import { run, type MotionPlan, type MotionHandle, type MotionOptions } from "./runtime";

function isOperational(s: OperationalState | EvidenceState): s is OperationalState {
  return (Object.values(OperationalState) as string[]).includes(s);
}

/** Assert a snap's transition is legal within a single state machine (fail fast). */
export function assertSnapLegal(
  from: OperationalState | EvidenceState,
  to: OperationalState | EvidenceState,
): void {
  const fromOp = isOperational(from);
  const toOp = isOperational(to);
  if (fromOp && toOp) {
    assertOperationalTransition(from as OperationalState, to as OperationalState);
  } else if (!fromOp && !toOp) {
    assertEvidenceTransition(from as EvidenceState, to as EvidenceState);
  } else {
    throw new Error(`snapState: cannot transition across state machines (${from} → ${to})`);
  }
}

export function planSnapState(input: SnapStateInput): MotionPlan {
  assertSnapLegal(input.from, input.to);
  return {
    duration: duration.snap,
    easing: easingCss.snap,
    keyframes: [
      { transform: "scale(1)", offset: 0 },
      { transform: "scale(1.06)", offset: 0.5 },
      { transform: "scale(1)", offset: 1 },
    ],
    final: { transform: "none" },
  };
}

export function snapState(
  target: Element | null | undefined,
  input: SnapStateInput,
  opts?: MotionOptions,
): MotionHandle {
  return run(target, planSnapState(input), opts);
}
