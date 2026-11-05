/**
 * archiveBeat — a completed beat settles and compacts into permanent history
 * (terminal); Verified → Archived (EVL §2; NARRATIVE G3). Never destroyed —
 * retrievable via deterministic replay.
 *
 * PUBLIC API: `archiveBeat(target, input?, opts?)`; `planArchiveBeat()` (pure).
 * TIMING: `settle`. REDUCED MOTION: beat rendered in its archived/compacted
 * end-state. SSR: pure plan; client-only application. PERFORMANCE: transform +
 * opacity only. ACCESSIBILITY: decorative; the archived state is announced by the
 * render layer. COMPOSITION: the final beat of every narrative run.
 */
import { duration, easingCss } from "../design/tokens";
import type { ArchiveBeatInput } from "../contracts/motion";
import { run, type MotionPlan, type MotionHandle, type MotionOptions } from "./runtime";

/** Compacted-history opacity — dimmed but never removed. */
export const ARCHIVE_OPACITY = 0.5;

export function planArchiveBeat(): MotionPlan {
  return {
    duration: duration.settle,
    easing: easingCss.settle,
    keyframes: [
      { opacity: 1, transform: "scale(1)" },
      { opacity: ARCHIVE_OPACITY, transform: "scale(0.96)" },
    ],
    final: { opacity: ARCHIVE_OPACITY, transform: "scale(0.96)" },
  };
}

export function archiveBeat(
  target: Element | null | undefined,
  _input?: ArchiveBeatInput,
  opts?: MotionOptions,
): MotionHandle {
  return run(target, planArchiveBeat(), opts);
}
