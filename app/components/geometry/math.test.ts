/**
 * Geometry math — unit tests. Tests MATHEMATICS, not snapshots (per Phase 2.5).
 * Run: `npm test` → `node --import tsx --test app/components/geometry/*.test.ts`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  pointOnCircle,
  regularPolygon,
  triangleVertices,
  radialArmTips,
  evenStops,
  polylinePath,
  linePath,
  routePath,
  portPoint,
  sideDeg,
  round,
  type Point,
} from "./math";

const EPS = 1e-9;
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps;
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
function assertNear(a: number, b: number, eps = 1e-6, msg?: string) {
  assert.ok(near(a, b, eps), msg ?? `expected ${a} ≈ ${b}`);
}

test("pointOnCircle: 0° is north, 90° is east (clockwise from north, y-down)", () => {
  const n = pointOnCircle(0, 0, 10, 0);
  assertNear(n.x, 0);
  assertNear(n.y, -10);
  const e = pointOnCircle(0, 0, 10, 90);
  assertNear(e.x, 10);
  assertNear(e.y, 0);
  const s = pointOnCircle(0, 0, 10, 180);
  assertNear(s.y, 10);
  const w = pointOnCircle(0, 0, 10, 270);
  assertNear(w.x, -10);
});

test("pointOnCircle: always at radius r from center", () => {
  for (const deg of [0, 17, 45, 123, 200, 359]) {
    const p = pointOnCircle(5, -3, 7, deg);
    assertNear(dist({ x: 5, y: -3 }, p), 7);
  }
});

test("regularPolygon: n vertices, all on the circumcircle, equal edge lengths", () => {
  for (const sides of [3, 4, 5, 6, 8]) {
    const pts = regularPolygon(0, 0, 12, sides);
    assert.equal(pts.length, sides);
    for (const p of pts) assertNear(dist({ x: 0, y: 0 }, p), 12);
    // all edges equal
    const edges = pts.map((p, i) => dist(p, pts[(i + 1) % sides]));
    const max = Math.max(...edges);
    const min = Math.min(...edges);
    assert.ok((max - min) / max <= 1e-9, `edges unequal for ${sides}-gon`);
  }
});

test("triangleVertices: exactly 3, equilateral, apex up by default (base below)", () => {
  const pts = triangleVertices(0, 0, 10, "up");
  assert.equal(pts.length, 3);
  const sides = [dist(pts[0], pts[1]), dist(pts[1], pts[2]), dist(pts[2], pts[0])];
  assert.ok(Math.max(...sides) - Math.min(...sides) <= EPS, "not equilateral");
  // apex up = first vertex at top (min y), base = other two below
  const apex = pts[0];
  assert.ok(apex.y < pts[1].y && apex.y < pts[2].y, "apex should be topmost");
});

test("triangleVertices: 'down' flips the apex to the bottom", () => {
  const up = triangleVertices(0, 0, 10, "up");
  const down = triangleVertices(0, 0, 10, "down");
  assert.ok(down[0].y > up[0].y, "down apex should be below up apex");
});

test("radialArmTips: default is 8 arms, equally spaced 45° apart, on the circle", () => {
  const tips = radialArmTips(0, 0, 20);
  assert.equal(tips.length, 8);
  for (const t of tips) assertNear(dist({ x: 0, y: 0 }, t), 20);
  // adjacent angular separation ≈ 45°
  const ang = (p: Point) => (Math.atan2(p.y, p.x) * 180) / Math.PI;
  for (let i = 0; i < 8; i++) {
    let d = Math.abs(ang(tips[(i + 1) % 8]) - ang(tips[i]));
    if (d > 180) d = 360 - d;
    assertNear(d, 45, 1e-4);
  }
});

test("evenStops: inclusive endpoints, correct count, uniform spacing", () => {
  const a: Point = { x: 0, y: 0 };
  const b: Point = { x: 90, y: 0 };
  const stops = evenStops(a, b, 10);
  assert.equal(stops.length, 10);
  assert.deepEqual(stops[0], a);
  assertNear(stops[9].x, 90);
  const gaps = stops.slice(1).map((s, i) => s.x - stops[i].x);
  for (const g of gaps) assertNear(g, 10);
});

test("evenStops: degenerate count (<2) returns the single start point", () => {
  const a: Point = { x: 1, y: 2 };
  assert.deepEqual(evenStops(a, { x: 9, y: 9 }, 1), [a]);
});

test("lifecycle spacing: 10 beats over length L are spaced L/9", () => {
  const stops = evenStops({ x: 0, y: 0 }, { x: 360, y: 0 }, 10);
  assert.equal(stops.length, 10);
  assertNear(stops[1].x - stops[0].x, 360 / 9);
});

test("execution rail spacing: 3 stages over length L are spaced L/2", () => {
  const stops = evenStops({ x: 0, y: 0 }, { x: 240, y: 0 }, 3);
  assert.equal(stops.length, 3);
  assertNear(stops[1].x, 120);
  assertNear(stops[2].x, 240);
});

test("polylinePath: M then L per point; close appends Z", () => {
  const d = polylinePath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }]);
  assert.equal(d, "M 0 0 L 10 0 L 10 5");
  assert.equal(polylinePath([{ x: 0, y: 0 }, { x: 1, y: 1 }], true), "M 0 0 L 1 1 Z");
  assert.equal(polylinePath([]), "");
});

test("linePath: single segment a→b", () => {
  assert.equal(linePath({ x: 1, y: 2 }, { x: 3, y: 4 }), "M 1 2 L 3 4");
});

test("routePath straight: direct line a→b", () => {
  assert.equal(routePath({ x: 0, y: 0 }, { x: 10, y: 6 }, "straight"), "M 0 0 L 10 6");
});

test("routePath orthogonal: one right-angle turn; travels longer axis first", () => {
  // |dx|>|dy| → horizontal first (mid at (bx, ay))
  assert.equal(routePath({ x: 0, y: 0 }, { x: 10, y: 4 }, "orthogonal"), "M 0 0 L 10 0 L 10 4");
  // |dy|>|dx| → vertical first (mid at (ax, by))
  assert.equal(routePath({ x: 0, y: 0 }, { x: 4, y: 10 }, "orthogonal"), "M 0 0 L 0 10 L 4 10");
});

test("routePath octilinear: one 45° diagonal + one axis-aligned segment", () => {
  // dx=10, dy=4 → diagonal covers 4 (to 4,4), then horizontal to (10,4)
  const d = routePath({ x: 0, y: 0 }, { x: 10, y: 4 }, "octilinear");
  assert.equal(d, "M 0 0 L 4 4 L 10 4");
});

test("routePath octilinear: every segment runs at a multiple of 45°", () => {
  const cases: [Point, Point][] = [
    [{ x: 0, y: 0 }, { x: 30, y: 12 }],
    [{ x: 5, y: 5 }, { x: -20, y: 40 }],
    [{ x: 0, y: 0 }, { x: -14, y: -3 }],
  ];
  for (const [a, b] of cases) {
    const d = routePath(a, b, "octilinear");
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    const pts: Point[] = [];
    for (let i = 0; i < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      if (dx === 0 && dy === 0) continue;
      const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 45;
      assert.ok(near(deg, 0, 1e-6) || near(deg, 45, 1e-6), `segment not on 45° grid (${dx},${dy})`);
    }
  }
});

test("routePath octilinear: endpoints are exactly a and b", () => {
  const a: Point = { x: 3, y: 7 };
  const b: Point = { x: 41, y: 19 };
  const d = routePath(a, b, "octilinear");
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  assertNear(nums[0], a.x);
  assertNear(nums[1], a.y);
  assertNear(nums[nums.length - 2], b.x);
  assertNear(nums[nums.length - 1], b.y);
});

test("portPoint: edge sides land on edge midpoints, corners on the box corner", () => {
  assert.deepEqual(portPoint(0, 0, 10, "n"), { x: 0, y: -10 });
  assert.deepEqual(portPoint(0, 0, 10, "e"), { x: 10, y: 0 });
  assert.deepEqual(portPoint(0, 0, 10, "s"), { x: 0, y: 10 });
  assert.deepEqual(portPoint(0, 0, 10, "w"), { x: -10, y: 0 });
  assert.deepEqual(portPoint(0, 0, 10, "ne"), { x: 10, y: -10 });
  assert.deepEqual(portPoint(0, 0, 10, "sw"), { x: -10, y: 10 });
});

test("sideDeg: the 8 compass sides map to 45° increments clockwise from north", () => {
  assert.equal(sideDeg("n"), 0);
  assert.equal(sideDeg("e"), 90);
  assert.equal(sideDeg("s"), 180);
  assert.equal(sideDeg("w"), 270);
  assert.equal(sideDeg("ne"), 45);
});

test("projection grid spacing: line count = floor(extent/cell)+1 per axis", () => {
  // Emulates ProjectionGrid's loop: inclusive from origin to origin+extent.
  const cell = 32;
  const width = 320;
  let count = 0;
  for (let x = 0; x <= width + 0.001; x += cell) count++;
  assert.equal(count, width / cell + 1); // 11 vertical lines for 320/32
});

test("round: stabilizes to 3 decimals", () => {
  assert.equal(round(1.23456), 1.235);
  assert.equal(round(2), 2);
  assert.equal(round(-0.00049), -0);
});
