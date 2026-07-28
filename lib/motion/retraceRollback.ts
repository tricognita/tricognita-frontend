/**
 * retraceRollback — time runs backward along the EXACT execution path to the
 * preserved prior state, and APPENDS a signed 'reverted' record (EVL §3).
 * "Undo the world; you cannot undo the record." Engaged → Reverted → Nominal.
 *
 * PUBLIC API: `retraceRollback(targets, input, opts?)`; `planRetrace()` (pure) —
 * which is exactly `planFlowSignal({ reverse: true })`, guaranteeing the retrace
 * follows the same path in reverse.
 * TIMING: `flow` (retrace) then evidence append. REDUCED MOTION: prior state
 * restored + the reverted evidence record present. SSR: pure plan; client-only.
 * PERFORMANCE: reuses flow/draw/seal (dashoffset, transform, opacity).
 * ACCESSIBILITY: decorative; the revert + its new evidence are announced by the
 * render layer. COMPOSITION: composedOf [flowSignal(reverse), drawEvidence, sealBlock].
 */
import { duration } from "../design/tokens";
import type { RetraceRollbackInput } from "../contracts/motion";
import { planFlowSignal } from "./flowSignal";
import { planDrawEvidence } from "./drawEvidence";
import { planSealBlock } from "./sealBlock";
import { runTimeline, type MotionPlan, type MotionHandle, type MotionOptions, type TimelineEntry } from "./runtime";

/** The retrace plan IS the reverse of the executed flow — exact, by construction. */
export function planRetrace(): MotionPlan {
  return planFlowSignal({ reverse: true });
}

export interface RetraceTargets {
  /** The executed edge, retraced in reverse. */
  path?: Element | null;
  /** The new 'reverted' evidence edge that is appended (the ledger still grows). */
  revertedEdge?: Element | null;
  /** The new 'reverted' evidence block that seals. */
  revertedNode?: Element | null;
}

export function retraceRollback(
  targets: RetraceTargets,
  _input?: RetraceRollbackInput,
  opts?: MotionOptions,
): MotionHandle {
  const entries: TimelineEntry[] = [{ target: targets.path, plan: planRetrace(), delay: 0 }];
  const afterRetrace = duration.flow;
  if (targets.revertedEdge) {
    entries.push({ target: targets.revertedEdge, plan: planDrawEvidence(), delay: afterRetrace });
  }
  if (targets.revertedNode) {
    entries.push({ target: targets.revertedNode, plan: planSealBlock(), delay: afterRetrace + duration.settle });
  }
  return runTimeline(entries, opts);
}
