/**
 * TRICOGNITA GEOMETRY ENGINE — pure math core
 * ---------------------------------------------------------------------------
 * Zero React, zero color, zero motion, zero product state. Just shape.
 * Every function is a pure, deterministic function of its arguments (no random,
 * no Date, no globals) so geometry renders identically on server and client —
 * determinism is the platform's thesis, enforced at the pixel (EVL §0.3, §1).
 *
 * Angle convention: degrees, measured CLOCKWISE from north (12 o'clock), because
 * the octopus reaches outward and "up" is the natural arm-zero. The two angle
 * laws live in Token API v1 (`--angle-radial` 45°, `--angle-boundary` 60°); this
 * engine takes angles as plain numbers so it imports nothing.
 */

import type * as React from "react";

export interface Point {
  x: number;
  y: number;
}

/** A point on a circle, `deg` clockwise from north (0° = up, 90° = east). */
export function pointOnCircle(cx: number, cy: number, r: number, deg: number): Point {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Vertices of a regular n-gon (circumradius `r`), optionally rotated. */
export function regularPolygon(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rotationDeg = 0,
): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < sides; i++) {
    out.push(pointOnCircle(cx, cy, r, rotationDeg + (i * 360) / sides));
  }
  return out;
}

/** The three vertices of an equilateral triangle (circumradius `r`). */
export function triangleVertices(
  cx: number,
  cy: number,
  r: number,
  orientation: "up" | "down" = "up",
): [Point, Point, Point] {
  const [a, b, c] = regularPolygon(cx, cy, r, 3, orientation === "up" ? 0 : 180);
  return [a, b, c];
}

/** Tip points of `count` radial arms (circumradius `r`), `offsetDeg` rotation. */
export function radialArmTips(
  cx: number,
  cy: number,
  r: number,
  count = 8,
  offsetDeg = 0,
): Point[] {
  return regularPolygon(cx, cy, r, count, offsetDeg);
}

/** Evenly spaced stops along the segment a→b (inclusive of both ends). */
export function evenStops(a: Point, b: Point, count: number): Point[] {
  if (count < 2) return [a];
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** SVG `d` for a polyline through points; `close` appends `Z`. */
export function polylinePath(points: Point[], close = false): string {
  if (points.length === 0) return "";
  const d = points.map((p, i) => `${i ? "L" : "M"} ${round(p.x)} ${round(p.y)}`).join(" ");
  return close ? `${d} Z` : d;
}

/** SVG `d` for a straight line a→b. */
export function linePath(a: Point, b: Point): string {
  return `M ${round(a.x)} ${round(a.y)} L ${round(b.x)} ${round(b.y)}`;
}

export type Routing = "straight" | "orthogonal" | "octilinear";

/**
 * Route a→b as SVG `d`. `octilinear` (the house style) uses one 45° diagonal + one
 * axis-aligned segment so every edge runs at a multiple of 45° — the control-plane
 * radial law, and why a Tricognita diagram never has bezier spaghetti (DLS §4.2).
 */
export function routePath(a: Point, b: Point, routing: Routing = "octilinear"): string {
  if (routing === "straight") return linePath(a, b);

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (routing === "orthogonal") {
    // L-shape: travel the longer axis first, then turn once.
    const mid: Point =
      Math.abs(dx) >= Math.abs(dy) ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
    return polylinePath([a, mid, b]);
  }

  // octilinear: diagonal covers min(|dx|,|dy|); remainder is axis-aligned.
  const diag = Math.min(Math.abs(dx), Math.abs(dy));
  const mid: Point = { x: a.x + sx * diag, y: a.y + sy * diag };
  return polylinePath([a, mid, b]);
}

/** Eight compass directions (used for connection ports; matches the 45° law). */
export type Side = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
const SIDE_DEG: Record<Side, number> = {
  n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315,
};

/**
 * The point on the edge of a square node (half-extent `half`, centered cx,cy)
 * for a given compass `side`. Ports sit on the 8 radial directions so edges
 * leave and arrive octilinearly.
 */
export function portPoint(cx: number, cy: number, half: number, side: Side): Point {
  const unit: Record<Side, Point> = {
    n: { x: 0, y: -1 }, s: { x: 0, y: 1 }, e: { x: 1, y: 0 }, w: { x: -1, y: 0 },
    ne: { x: 1, y: -1 }, nw: { x: -1, y: -1 }, se: { x: 1, y: 1 }, sw: { x: -1, y: 1 },
  };
  const u = unit[side];
  // Corners project to the box corner; edges to the edge midpoint.
  return { x: cx + u.x * half, y: cy + u.y * half };
}

/** Degrees for a compass side (clockwise from north). */
export function sideDeg(side: Side): number {
  return SIDE_DEG[side];
}

/** Round to 3 decimals — keeps emitted path strings compact and stable. */
export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Shared React prop surface for a geometry group (composable, style-through). */
export type GeoGroupProps = React.SVGProps<SVGGElement>;
