/**
 * Geometry invariants — tests. Architectural truths must hold, and violations
 * must FAIL FAST (never silently repair). Run via `npm test`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  GeometryInvariantError,
  assertEquilateral,
  assertArmCount,
  assertBeatCount,
  assertMinStages,
  assertTwoEndpoints,
  assertPositiveNotch,
} from "./invariants";
import { triangleVertices, radialArmTips, evenStops, type Point } from "./math";

const throws = (fn: () => void) => assert.throws(fn, GeometryInvariantError);

test("INVARIANT triangle is always equilateral (holds for real triangleVertices)", () => {
  assert.doesNotThrow(() => assertEquilateral(triangleVertices(0, 0, 10, "up")));
  assert.doesNotThrow(() => assertEquilateral(triangleVertices(5, -2, 37, "down")));
});

test("INVARIANT equilateral guard fails fast on a non-equilateral / degenerate triangle", () => {
  throws(() => assertEquilateral([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 3, y: 9 }]));
  throws(() => assertEquilateral([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]));
  throws(() => assertEquilateral([{ x: 0, y: 0 }, { x: 1, y: 1 }])); // wrong vertex count
});

test("INVARIANT control plane always has 8 arms (default RadialEight tips)", () => {
  assert.doesNotThrow(() => assertArmCount(radialArmTips(0, 0, 20)));
  throws(() => assertArmCount(radialArmTips(0, 0, 20, 6))); // 6 arms → fail fast
});

test("INVARIANT lifecycle spine always has 10 beats (default spine stops)", () => {
  assert.doesNotThrow(() => assertBeatCount(evenStops({ x: 0, y: 0 }, { x: 360, y: 0 }, 10)));
  throws(() => assertBeatCount(evenStops({ x: 0, y: 0 }, { x: 360, y: 0 }, 8)));
});

test("INVARIANT execution rail requires >= 2 stages (fail fast, no silent repair)", () => {
  assert.doesNotThrow(() => assertMinStages(2));
  assert.doesNotThrow(() => assertMinStages(5));
  throws(() => assertMinStages(1));
  throws(() => assertMinStages(0));
  throws(() => assertMinStages(2.5)); // non-integer stage count
});

test("INVARIANT trust boundary must have two distinct endpoints", () => {
  const a: Point = { x: 0, y: 0 };
  assert.doesNotThrow(() => assertTwoEndpoints(a, { x: 10, y: 0 }));
  throws(() => assertTwoEndpoints(a, { x: 0, y: 0 })); // zero-length → a point, not a line
});

test("INVARIANT evidence notch always exists and fits within the block", () => {
  assert.doesNotThrow(() => assertPositiveNotch(8, 44, 32));
  throws(() => assertPositiveNotch(0, 44, 32)); // no notch
  throws(() => assertPositiveNotch(-4, 44, 32)); // negative
  throws(() => assertPositiveNotch(40, 44, 32)); // notch bigger than block height
});

test("GeometryInvariantError carries a descriptive, prefixed message", () => {
  try {
    assertMinStages(1);
    assert.fail("should have thrown");
  } catch (e) {
    assert.ok(e instanceof GeometryInvariantError);
    assert.match((e as Error).message, /Geometry invariant violated/);
  }
});
