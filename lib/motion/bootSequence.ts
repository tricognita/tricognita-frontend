/**
 * bootSequence — system activation: boundary draws → core powers → 8 arms reach →
 * evidence settles → status resolves to NOMINAL. "The platform just came online."
 * ≤ bootTotal (380ms), once (Visual OS §3). The trust boundary is first & stable.
 *
 * PUBLIC API: `bootSequence(targets, input?, opts?)`; `planBootSequence(arms, evidence)`
 * (pure timeline of BootSteps). REDUCED MOTION: the fully-online end-state rendered
 * instantly (beautiful static). SSR: pure plan; client-only application.
 * PERFORMANCE: opacity+transform reveals; staggered. ACCESSIBILITY: decorative;
 * "online/NOMINAL" is announced by the render layer once. COMPOSITION: composedOf
 * reveals + arm reaches + a final snap to nominal, all under one time ceiling.
 */
import { duration, easingCss, stagger } from "../design/tokens";
import type { BootSequenceInput } from "../contracts/motion";
import { runTimeline, type MotionPlan, type MotionHandle, type MotionOptions, type TimelineEntry } from "./runtime";

export type BootRole = "boundary" | "core" | "arm" | "evidence" | "status";

export interface BootStep {
  readonly role: BootRole;
  readonly index: number;
  readonly delay: number;
  readonly plan: MotionPlan;
}

export interface BootTargets {
  boundary?: Element | null;
  core?: Element | null;
  arms?: readonly (Element | null | undefined)[];
  evidence?: readonly (Element | null | undefined)[];
  status?: Element | null;
}

function reveal(durationMs: number): MotionPlan {
  return {
    duration: durationMs,
    easing: easingCss.settle,
    keyframes: [
      { opacity: 0, transform: "scale(0.96)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    final: { opacity: 1, transform: "none" },
  };
}

/**
 * The activation timeline. Delays are chosen so the last step ends within
 * bootTotal (asserted in tests). Boundary is always first (delay 0).
 */
export function planBootSequence(arms = 8, evidence = 0): BootStep[] {
  const steps: BootStep[] = [];
  steps.push({ role: "boundary", index: 0, delay: 0, plan: reveal(100) });
  steps.push({ role: "core", index: 0, delay: 100, plan: reveal(60) });
  for (let i = 0; i < arms; i++) {
    steps.push({ role: "arm", index: i, delay: 160 + i * stagger.arm, plan: reveal(60) });
  }
  for (let j = 0; j < evidence; j++) {
    steps.push({ role: "evidence", index: j, delay: 250 + j * stagger.arm, plan: reveal(50) });
  }
  steps.push({ role: "status", index: 0, delay: 310, plan: reveal(60) });
  return steps;
}

/** End time (ms) of the whole activation — must be ≤ bootTotal. */
export function bootSequenceEnd(steps: BootStep[]): number {
  return steps.reduce((max, s) => Math.max(max, s.delay + s.plan.duration), 0);
}

/** The activation ceiling from Token API. */
export const BOOT_CEILING = duration.bootTotal;

function resolve(targets: BootTargets, step: BootStep): Element | null | undefined {
  switch (step.role) {
    case "boundary":
      return targets.boundary;
    case "core":
      return targets.core;
    case "arm":
      return targets.arms?.[step.index];
    case "evidence":
      return targets.evidence?.[step.index];
    case "status":
      return targets.status;
  }
}

export function bootSequence(
  targets: BootTargets,
  input: BootSequenceInput = {},
  opts?: MotionOptions,
): MotionHandle {
  const arms = input.arms ?? targets.arms?.length ?? 8;
  const steps = planBootSequence(arms, targets.evidence?.length ?? 0);
  const entries: TimelineEntry[] = steps.map((s) => ({
    target: resolve(targets, s),
    plan: s.plan,
    delay: s.delay,
  }));
  return runTimeline(entries, opts);
}
