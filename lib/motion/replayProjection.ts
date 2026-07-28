/**
 * replayProjection — replay the chain in log order to precipitate the typed graph
 * (CQRS read-side); the story re-tells itself (EVL §7). DETERMINISTIC: replay
 * twice → identical.
 *
 * PUBLIC API: `replayProjection(nodes, input, opts?)` over an ordered array of
 * node elements; `planReplayProjection(eventCount)` (pure StaggerPlan).
 * TIMING: per-event `tick`, LINEAR, staggered by `node`. REDUCED MOTION: the
 * complete projected graph rendered, no replay. SSR: pure plan; client-only.
 * PERFORMANCE: opacity+transform per node. ACCESSIBILITY: decorative; the graph is
 * labeled by the render layer. COMPOSITION: derived from the chain — never the
 * source; instantiate strictly in log order.
 */
import { duration, easingCss, stagger } from "../design/tokens";
import type { ReplayProjectionInput } from "../contracts/motion";
import {
  runStagger,
  type StaggerPlan,
  type StaggerStep,
  type MotionHandle,
  type MotionOptions,
} from "./runtime";

export function planReplayProjection(eventCount: number): StaggerPlan {
  const steps: StaggerStep[] = [];
  for (let i = 0; i < eventCount; i++) {
    steps.push({
      index: i,
      delay: i * stagger.node, // strictly increasing → deterministic log order
      plan: {
        duration: duration.tick,
        easing: easingCss.linear,
        keyframes: [
          { opacity: 0, transform: "scale(0.82)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        final: { opacity: 1, transform: "none" },
      },
    });
  }
  return { steps };
}

export function replayProjection(
  nodes: readonly (Element | null | undefined)[],
  input: ReplayProjectionInput,
  opts?: MotionOptions,
): MotionHandle {
  return runStagger(nodes, planReplayProjection(input.eventCount), opts);
}
