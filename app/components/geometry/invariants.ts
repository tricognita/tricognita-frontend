/**
 * TRICOGNITA GEOMETRY ENGINE — invariants
 * ---------------------------------------------------------------------------
 * Architectural truths encoded as fail-fast guards. Invalid geometry is a bug,
 * never something to silently repair — a degenerate diagram would draw a lie, and
 * this platform's whole thesis is provable truth (EVL §0). Guards THROW.
 *
 * This is intra-layer (imports only `./math` types) — geometry never imports up.
 */

import type { Point } from "./math";

/** Thrown when a geometric invariant is violated. Fail fast, never repair. */
export class GeometryInvariantError extends Error {
  constructor(message: string) {
    super(`Geometry invariant violated: ${message}`);
    this.name = "GeometryInvariantError";
  }
}

/** Assert a condition or throw. TS narrows on success. */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new GeometryInvariantError(message);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * The trust boundary is always an equilateral triangle (DLS §1, §4.3): exactly
 * three vertices, all side lengths equal within a relative epsilon.
 */
export function assertEquilateral(points: Point[], epsilon = 1e-6): void {
  invariant(points.length === 3, `triangle must have 3 vertices, got ${points.length}`);
  const [a, b, c] = points;
  const sides = [distance(a, b), distance(b, c), distance(c, a)];
  const max = Math.max(...sides);
  const min = Math.min(...sides);
  invariant(max > 0, "triangle is degenerate (zero size)");
  invariant((max - min) / max <= epsilon, `triangle not equilateral (sides ${sides.join(", ")})`);
}

/** The control plane always has 8 arms (EVL §5) — the canonical schematic count. */
export function assertArmCount(tips: Point[], expected = 8): void {
  invariant(tips.length === expected, `control plane must have ${expected} arms, got ${tips.length}`);
}

/** The lifecycle arc always has 10 beats (ENGINEERING_NARRATIVE §1). */
export function assertBeatCount(stops: Point[], expected = 10): void {
  invariant(stops.length === expected, `lifecycle spine must have ${expected} beats, got ${stops.length}`);
}

/** A deterministic pipeline needs at least 2 stages to be a pipeline (EVL §1). */
export function assertMinStages(stages: number, min = 2): void {
  invariant(
    Number.isInteger(stages) && stages >= min,
    `execution rail needs >= ${min} stages, got ${stages}`,
  );
}

/** A boundary is a line — it must have two distinct endpoints (EVL §10). */
export function assertTwoEndpoints(a: Point, b: Point): void {
  invariant(distance(a, b) > 0, "trust boundary endpoints must be distinct (length > 0)");
}

/** An evidence block always has its hash-link notch (EVL §8): 0 < notch <= min(w,h). */
export function assertPositiveNotch(notch: number, w: number, h: number): void {
  invariant(notch > 0, `evidence notch must exist (> 0), got ${notch}`);
  invariant(notch <= Math.min(w, h), `evidence notch (${notch}) exceeds block ${w}x${h}`);
}
