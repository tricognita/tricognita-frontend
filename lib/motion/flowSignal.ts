/**
 * flowSignal — a directed signal travels a rail at constant velocity (EVL §0.1, §4).
 * An observation inbound, an arm reaching a domain, orchestration under load.
 *
 * PUBLIC API: `flowSignal(target, input, opts?)` drives an edge `<path pathLength=1>`;
 * `planFlowSignal(input)` is the pure plan.
 * TIMING: `flow` duration, LINEAR easing (telemetry, not eased).
 * REDUCED MOTION: no travel — the pulse is simply absent (idle = stillness).
 * SSR: pure plan is safe on the server; application is client-only via WAAPI.
 * PERFORMANCE: animates `stroke-dashoffset` only (compositor-friendly), one element.
 * ACCESSIBILITY: decorative; conveys no info a screen reader needs (the state it
 * causes is announced by the render layer). Honors prefers-reduced-motion.
 * COMPOSITION: orchestration = several concurrent flowSignals (one per edge),
 * phase-staggered by the caller.
 */
import { duration, easingCss } from "../design/tokens";
import type { FlowSignalInput } from "../contracts/motion";
import { run, type MotionPlan, type MotionHandle, type MotionOptions } from "./runtime";

/** A 18% dash that travels the normalized (pathLength=1) edge. */
const DASH = "0.18 0.82";

export function planFlowSignal(input: Pick<FlowSignalInput, "reverse"> = {}): MotionPlan {
  const from = input.reverse ? 0 : 1;
  const to = input.reverse ? 1 : 0;
  return {
    duration: duration.flow,
    easing: easingCss.linear,
    keyframes: [
      { strokeDasharray: DASH, strokeDashoffset: from },
      { strokeDasharray: DASH, strokeDashoffset: to },
    ],
    // idle = stillness: the pulse is gone, the edge rests solid.
    final: { strokeDasharray: "none", strokeDashoffset: 0 },
  };
}

export function flowSignal(
  target: Element | null | undefined,
  input: FlowSignalInput,
  opts?: MotionOptions,
): MotionHandle {
  return run(target, planFlowSignal(input), opts);
}
