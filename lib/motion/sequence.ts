/**
 * sequence — compose motion primitives into a narrative run, in beat order.
 * Pure planning (no DOM): reads the Contracts' BEAT_MOTION and produces the ordered
 * primitives to play, honoring skipped beats. Encodes the ordering laws:
 * "evidence always settles before verification" and "verification always follows
 * execution". The Motion Playground drives these steps against real elements.
 */
import { BEAT_ORDER, Beat, type BeatMeta, BEATS } from "../contracts/narrative";
import { BEAT_MOTION, MotionPrimitive } from "../contracts/motion";

export interface NarrativeStep {
  readonly beat: Beat;
  readonly meta: BeatMeta;
  readonly primitive: MotionPrimitive;
}

/** Ordered primitives for a run — beats in canonical order, skips and null-motion beats removed. */
export function orderedMotion(skipped: readonly Beat[] = []): NarrativeStep[] {
  const skip = new Set(skipped);
  const out: NarrativeStep[] = [];
  for (const beat of BEAT_ORDER) {
    if (skip.has(beat)) continue;
    const primitive = BEAT_MOTION[beat];
    if (primitive) out.push({ beat, meta: BEATS[beat], primitive });
  }
  return out;
}

export class MotionOrderingError extends Error {
  constructor(message: string) {
    super(`Motion ordering violated: ${message}`);
    this.name = "MotionOrderingError";
  }
}

const beatIndex = (steps: NarrativeStep[], beat: Beat): number => steps.findIndex((s) => s.beat === beat);

/** Fail fast if a run would verify before evidence settles, or verify before execution. */
export function assertMotionOrdering(steps: NarrativeStep[]): void {
  const verify = beatIndex(steps, Beat.Verification);
  if (verify === -1) return;
  const evidence = beatIndex(steps, Beat.EvidenceGeneration);
  if (evidence !== -1 && evidence >= verify) {
    throw new MotionOrderingError("evidence must settle before verification");
  }
  const exec = beatIndex(steps, Beat.AutonomousExecution);
  if (exec !== -1 && exec >= verify) {
    throw new MotionOrderingError("verification must follow execution");
  }
}
