/**
 * verifyChain — walk the chain link by link, ticking each verified, or HALT at the
 * exact break (EVL §8). Sealed → Verified. Never fabricates a pass.
 *
 * PUBLIC API: `verifyChain(links, input, opts?)` over an ordered array of link
 * elements; `planVerifyChain(count, breakAt?)` (pure StaggerPlan).
 * TIMING: per-link `tick`, LINEAR, staggered by `node`. REDUCED MOTION: all links
 * shown verified (or the break shown at its exact link). SSR: pure plan; client-only.
 * PERFORMANCE: opacity per link; one animation each. ACCESSIBILITY: decorative;
 * verification result announced by the render layer. COMPOSITION: ALWAYS follows
 * evidence generation (drawEvidence + sealBlock) — see sequence.ts ordering.
 */
import { duration, easingCss, stagger } from "../design/tokens";
import type { VerifyChainInput } from "../contracts/motion";
import {
  runStagger,
  type StaggerPlan,
  type StaggerStep,
  type MotionHandle,
  type MotionOptions,
} from "./runtime";

function linkPlan() {
  return {
    duration: duration.tick,
    easing: easingCss.linear,
    keyframes: [{ opacity: 0.35 }, { opacity: 1 }],
    final: { opacity: 1 },
  };
}

/**
 * Verify `links` in order. If `breakAt` is set, links after it never animate (the
 * walk HALTS at the break) — tamper-evidence made visible at the exact link.
 */
export function planVerifyChain(links: number, breakAt: number | null = null): StaggerPlan {
  const steps: StaggerStep[] = [];
  for (let i = 0; i < links; i++) {
    if (breakAt !== null && i > breakAt) break;
    const isBreak = breakAt !== null && i === breakAt;
    steps.push({ index: i, delay: i * stagger.node, kind: isBreak ? "halt" : "verified", plan: linkPlan() });
    if (isBreak) break;
  }
  return { steps };
}

export function verifyChain(
  links: readonly (Element | null | undefined)[],
  input: VerifyChainInput & { breakAt?: number | null },
  opts?: MotionOptions,
): MotionHandle {
  return runStagger(links, planVerifyChain(input.links, input.breakAt ?? null), opts);
}
