/**
 * drawEvidence — an evidence edge draws as the record is produced (EVL §2, §8).
 * Pending → Unsigned. Unlike flowSignal (a transient pulse), the drawn line PERSISTS
 * (append-only — a drawn edge never un-draws).
 *
 * PUBLIC API: `drawEvidence(target, input, opts?)` on an edge `<path pathLength=1>`;
 * `planDrawEvidence()` is the pure plan.
 * TIMING: `settle` duration + easing (settle-and-lock arrival).
 * REDUCED MOTION: the edge is rendered fully drawn (its truthful end-state).
 * SSR: pure plan; client-only application. PERFORMANCE: `stroke-dashoffset` only.
 * ACCESSIBILITY: decorative; the evidence's meaning/label is the render layer's job.
 * COMPOSITION: precedes `sealBlock` then `verifyChain` (evidence settles before
 * verification).
 */
import { duration, easingCss } from "../design/tokens";
import type { DrawEvidenceInput } from "../contracts/motion";
import { run, type MotionPlan, type MotionHandle, type MotionOptions } from "./runtime";

export function planDrawEvidence(): MotionPlan {
  return {
    duration: duration.settle,
    easing: easingCss.settle,
    keyframes: [
      { strokeDasharray: "1 1", strokeDashoffset: 1 },
      { strokeDasharray: "1 1", strokeDashoffset: 0 },
    ],
    // fully drawn and persistent (append-only).
    final: { strokeDasharray: "none", strokeDashoffset: 0 },
  };
}

export function drawEvidence(
  target: Element | null | undefined,
  _input?: DrawEvidenceInput,
  opts?: MotionOptions,
): MotionHandle {
  return run(target, planDrawEvidence(), opts);
}
