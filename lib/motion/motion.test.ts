/**
 * Motion Engine — unit tests. Tests the PURE plans (deterministic, no DOM), plus
 * the reduced-motion / SSR path via `applyFinal` and `run` on a style stub.
 * Run via `npm test`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { duration, stagger } from "../design/tokens";
import { OperationalState, EvidenceState } from "../contracts/state";
import { Beat } from "../contracts/narrative";
import { MotionPrimitive } from "../contracts/motion";
import { applyFinal, run, staggerEnd } from "./runtime";
import { planFlowSignal } from "./flowSignal";
import { planDrawEvidence } from "./drawEvidence";
import { planSnapState, assertSnapLegal } from "./snapState";
import { planSealBlock } from "./sealBlock";
import { planArchiveBeat, ARCHIVE_OPACITY } from "./archiveBeat";
import { planVerifyChain } from "./verifyChain";
import { planReplayProjection } from "./replayProjection";
import { planRetrace } from "./retraceRollback";
import { planBootSequence, bootSequenceEnd, BOOT_CEILING } from "./bootSequence";
import { orderedMotion, assertMotionOrdering, MotionOrderingError } from "./sequence";

const off = { reducedMotion: true };

/* ── LAW: reduced motion / SSR renders the truthful final state ──────────────── */

test("applyFinal writes a plan's truthful end-state onto a style target", () => {
  const el = { style: {} as Record<string, string> };
  applyFinal(el as unknown as Element, planDrawEvidence().final);
  assert.equal(el.style.strokeDasharray, "none");
  assert.equal(el.style.strokeDashoffset, "0");
});

test("run without WAAPI (SSR/reduced) applies final and settles immediately", async () => {
  const el = { style: {} as Record<string, string> }; // no .animate → SSR-like
  const h = run(el as unknown as Element, planArchiveBeat(), off);
  await h.finished;
  assert.equal(el.style.opacity, String(ARCHIVE_OPACITY));
});

/* ── flowSignal / drawEvidence ───────────────────────────────────────────────── */

test("flowSignal is a transient pulse: final leaves the edge solid (idle=stillness)", () => {
  const p = planFlowSignal();
  assert.equal(p.easing, "linear"); // computation is mechanical
  assert.equal(p.duration, duration.flow);
  assert.equal(p.final.strokeDasharray, "none");
});

test("flowSignal reverse swaps the offset direction", () => {
  const fwd = planFlowSignal({ reverse: false });
  const rev = planFlowSignal({ reverse: true });
  assert.equal(fwd.keyframes[0].strokeDashoffset, 1);
  assert.equal(fwd.keyframes[1].strokeDashoffset, 0);
  assert.equal(rev.keyframes[0].strokeDashoffset, 0);
  assert.equal(rev.keyframes[1].strokeDashoffset, 1);
});

test("drawEvidence persists (append-only): fully drawn, solid final", () => {
  const p = planDrawEvidence();
  assert.equal(p.keyframes[0].strokeDashoffset, 1);
  assert.equal(p.keyframes[1].strokeDashoffset, 0);
  assert.equal(p.final.strokeDashoffset, 0);
  assert.equal(p.final.strokeDasharray, "none");
});

/* ── snapState: legal transitions only; discrete ─────────────────────────────── */

test("snapState animates a legal transition and rejects an illegal one", () => {
  assert.doesNotThrow(() => planSnapState({ from: OperationalState.Nominal, to: OperationalState.Engaged }));
  assert.throws(() => planSnapState({ from: OperationalState.Engaged, to: OperationalState.Advisory }));
  assert.throws(() => planSnapState({ from: EvidenceState.Sealed, to: EvidenceState.Unsigned }));
});

test("assertSnapLegal forbids crossing between state machines", () => {
  assert.throws(() => assertSnapLegal(OperationalState.Nominal, EvidenceState.Sealed));
});

test("snapState is discrete (quick snap easing), final resets transform", () => {
  const p = planSnapState({ from: OperationalState.Nominal, to: OperationalState.Halt });
  assert.equal(p.duration, duration.snap);
  assert.equal(p.final.transform, "none");
});

/* ── sealBlock / archiveBeat ─────────────────────────────────────────────────── */

test("sealBlock ends sealed (opacity 1); archiveBeat ends dimmed but present", () => {
  assert.equal(planSealBlock().final.opacity, 1);
  assert.equal(planArchiveBeat().final.opacity, ARCHIVE_OPACITY);
  assert.ok(ARCHIVE_OPACITY > 0, "archived evidence is never removed");
});

/* ── verifyChain: ordered, halts at the break ────────────────────────────────── */

test("verifyChain ticks links in order with increasing stagger", () => {
  const p = planVerifyChain(4);
  assert.equal(p.steps.length, 4);
  p.steps.forEach((s, i) => assert.equal(s.delay, i * stagger.node));
  assert.ok(p.steps.every((s) => s.kind === "verified"));
});

test("verifyChain HALTS at the break: nothing past the broken link animates", () => {
  const p = planVerifyChain(5, 2);
  assert.equal(p.steps.length, 3); // links 0,1,2 then stop
  assert.equal(p.steps[2].kind, "halt");
});

/* ── replayProjection: deterministic, log order ──────────────────────────────── */

test("replayProjection is deterministic (same input → identical plan) and ordered", () => {
  const a = planReplayProjection(6);
  const b = planReplayProjection(6);
  assert.deepEqual(a, b);
  a.steps.forEach((s, i) => assert.equal(s.delay, i * stagger.node));
});

/* ── LAW: rollback retraces exactly ──────────────────────────────────────────── */

test("retrace is EXACTLY the reverse of the executed flow (same path, reversed)", () => {
  assert.deepEqual(planRetrace(), planFlowSignal({ reverse: true }));
});

/* ── bootSequence: bounded, boundary first ───────────────────────────────────── */

test("bootSequence finishes within the activation ceiling and draws the boundary first", () => {
  const steps = planBootSequence(8, 3);
  assert.ok(bootSequenceEnd(steps) <= BOOT_CEILING, `boot ${bootSequenceEnd(steps)}ms exceeds ${BOOT_CEILING}ms`);
  const boundary = steps.find((s) => s.role === "boundary")!;
  assert.equal(boundary.delay, 0);
  assert.equal(steps.filter((s) => s.role === "arm").length, 8);
});

/* ── sequence: ordering laws ─────────────────────────────────────────────────── */

test("orderedMotion (remediation): evidence settles before verification; verify follows execution", () => {
  const steps = orderedMotion(); // no skips = full remediation arc
  assert.doesNotThrow(() => assertMotionOrdering(steps));
  const beats = steps.map((s) => s.beat);
  assert.ok(beats.indexOf(Beat.EvidenceGeneration) < beats.indexOf(Beat.Verification));
  assert.ok(beats.indexOf(Beat.AutonomousExecution) < beats.indexOf(Beat.Verification));
  // the signature seam: execution flows, rollback retraces, archive closes
  assert.equal(steps.find((s) => s.beat === Beat.AutonomousExecution)?.primitive, MotionPrimitive.FlowSignal);
  assert.equal(steps.find((s) => s.beat === Beat.RollbackPath)?.primitive, MotionPrimitive.RetraceRollback);
});

test("orderedMotion (read-only scan) skips execution + rollback but still verifies", () => {
  const steps = orderedMotion([Beat.AutonomousExecution, Beat.RollbackPath]);
  const beats = steps.map((s) => s.beat);
  assert.ok(!beats.includes(Beat.AutonomousExecution));
  assert.ok(!beats.includes(Beat.RollbackPath));
  assert.ok(beats.includes(Beat.Verification));
  assert.doesNotThrow(() => assertMotionOrdering(steps));
});

test("staggerEnd + MotionOrderingError are exported and coherent", () => {
  assert.equal(staggerEnd(planVerifyChain(3)), 2 * stagger.node + duration.tick);
  assert.match(new MotionOrderingError("x").message, /Motion ordering violated/);
});
