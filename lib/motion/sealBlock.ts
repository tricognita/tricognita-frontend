/**
 * sealBlock — an evidence block's seal snaps shut; Unsigned → Sealed (EVL §2, §8).
 * Once sealed, immutable — it never re-animates.
 *
 * PUBLIC API: `sealBlock(target, input?, opts?)`; `planSealBlock()` (pure).
 * TIMING: `seal` duration, settle easing. REDUCED MOTION: sealed block rendered
 * with its seal shut. SSR: pure plan; client-only application. PERFORMANCE:
 * transform + opacity only. ACCESSIBILITY: decorative; "sealed" is announced by
 * the render layer. COMPOSITION: follows drawEvidence, precedes verifyChain.
 */
import { duration, easingCss } from "../design/tokens";
import type { SealBlockInput } from "../contracts/motion";
import { run, type MotionPlan, type MotionHandle, type MotionOptions } from "./runtime";

export function planSealBlock(): MotionPlan {
  return {
    duration: duration.seal,
    easing: easingCss.settle,
    keyframes: [
      { transform: "scale(0.6)", opacity: 0, offset: 0 },
      { transform: "scale(1.1)", opacity: 1, offset: 0.6 },
      { transform: "scale(1)", opacity: 1, offset: 1 },
    ],
    final: { transform: "none", opacity: 1 },
  };
}

export function sealBlock(
  target: Element | null | undefined,
  _input?: SealBlockInput,
  opts?: MotionOptions,
): MotionHandle {
  return run(target, planSealBlock(), opts);
}
