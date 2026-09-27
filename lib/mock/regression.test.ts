/**
 * Regression golden locks — freeze the five load-bearing surfaces so future
 * changes CANNOT silently alter them: geometry, motion, state colors, timing,
 * contracts. A change to any locked value fails here and must be intentional.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { triangleVertices, routePath, polylinePath } from "../../app/components/geometry/math";
import { duration, stagger, easingCss } from "../design/tokens";
import { OperationalState, EvidenceState, OPERATIONAL_TRANSITIONS, EVIDENCE_TRANSITIONS } from "../contracts/state";
import { Beat, BEAT_ORDER } from "../contracts/narrative";
import { BEAT_MOTION, MotionPrimitive } from "../contracts/motion";
import { planFlowSignal } from "../motion/flowSignal";
import { planSnapState } from "../motion/snapState";
import { planBootSequence, bootSequenceEnd, BOOT_CEILING } from "../motion/bootSequence";

const css = readFileSync("app/styles/tokens/primitives.css", "utf8");
const hexOf = (name: string) => css.match(new RegExp(`--_${name}:\\s*(#[0-9a-fA-F]{6})`))![1].toUpperCase();

test("LOCK · state colors (the grammar) — dark base + four states", () => {
  assert.equal(hexOf("graphite-900"), "#0B0C0E"); // substrate
  assert.equal(hexOf("bone-100"), "#E9E7E1"); // fg
  assert.equal(hexOf("nominal-500"), "#4FB98C");
  assert.equal(hexOf("engaged-500"), "#C36AA6");
  assert.equal(hexOf("advisory-500"), "#E0A73B");
  assert.equal(hexOf("halt-500"), "#E24A3B");
});

test("LOCK · motion timing tokens", () => {
  assert.deepEqual(
    { tick: duration.tick, snap: duration.snap, seal: duration.seal, settle: duration.settle, flow: duration.flow, bootTotal: duration.bootTotal },
    { tick: 90, snap: 120, seal: 180, settle: 240, flow: 600, bootTotal: 380 },
  );
  assert.deepEqual(stagger, { arm: 18, node: 30, gate: 60 });
  assert.equal(easingCss.settle, "cubic-bezier(0.22, 1, 0.36, 1)");
  assert.equal(easingCss.linear, "linear");
});

test("LOCK · contracts — 10 beats, key transitions, signature seam", () => {
  assert.equal(BEAT_ORDER.length, 10);
  assert.equal(BEAT_MOTION[Beat.AutonomousExecution], MotionPrimitive.FlowSignal);
  assert.equal(BEAT_MOTION[Beat.RollbackPath], MotionPrimitive.RetraceRollback);
  assert.ok(OPERATIONAL_TRANSITIONS[OperationalState.Engaged].includes(OperationalState.Reverted));
  assert.deepEqual(EVIDENCE_TRANSITIONS[EvidenceState.Archived], []); // terminal
});

test("LOCK · geometry — canonical path outputs", () => {
  assert.equal(polylinePath(triangleVertices(0, 0, 12, "up"), true), "M 0 -12 L 10.392 6 L -10.392 6 Z");
  assert.equal(routePath({ x: 0, y: 0 }, { x: 10, y: 4 }, "octilinear"), "M 0 0 L 4 4 L 10 4");
  assert.equal(routePath({ x: 0, y: 0 }, { x: 10, y: 6 }, "straight"), "M 0 0 L 10 6");
});

test("LOCK · motion plans — flow/snap/boot", () => {
  const flow = planFlowSignal();
  assert.equal(flow.duration, 600);
  assert.equal(flow.easing, "linear");
  assert.equal(flow.keyframes[0].strokeDashoffset, 1);
  assert.equal(flow.final.strokeDasharray, "none");

  const snap = planSnapState({ from: OperationalState.Nominal, to: OperationalState.Engaged });
  assert.equal(snap.duration, 120);
  assert.equal(snap.final.transform, "none");

  assert.ok(bootSequenceEnd(planBootSequence(8, 3)) <= BOOT_CEILING);
});
