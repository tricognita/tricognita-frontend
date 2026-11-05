import type { SVGProps } from "react";
import { pointOnCircle, linePath, evenStops, type Point } from "./math";
import { assertTwoEndpoints } from "./invariants";

/**
 * TrustBoundary — the sovereign divider between two planes (EVL §10).
 *
 * PURPOSE: the straight "data never crosses this line" boundary. A definite,
 * drawn line (rendered as a primary rule + a faint parallel guide, so it reads
 * as deliberate, not incidental) with optional short ticks along it.
 *
 * CONSTRUCTION: a segment of `length` centered at (cx,cy) at `angle` degrees
 * (0° = vertical divider, the default; 60° = the brand framing law; 90° =
 * horizontal). A second rule is offset by `gap` on the normal. `ticks` short
 * perpendicular marks are spaced along it. Geometry only — which side is "data"
 * vs "control" is applied by the rendering layer.
 *
 * PUBLIC PROPS: cx, cy, length, angle, gap, ticks, tickLength, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative; label at the Frame. RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: the boundary is asymmetric and permanent; giving it a
 * double rule + graticule ticks makes it read as an instrument datum, not a border.
 * PERFORMANCE: a handful of `<line>`s, pure. EXTENSION: expose per-side tick
 * direction for the data/control asymmetry; accept a polyline for non-straight seams.
 */
export interface TrustBoundaryProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  length?: number;
  angle?: number;
  gap?: number;
  ticks?: number;
  tickLength?: number;
  strokeWidth?: number;
}

export function TrustBoundary({
  cx = 0,
  cy = 0,
  length = 200,
  angle = 0,
  gap = 4,
  ticks = 0,
  tickLength = 6,
  strokeWidth = 1,
  ...rest
}: TrustBoundaryProps) {
  const half = length / 2;
  const a: Point = pointOnCircle(cx, cy, half, angle);
  const b: Point = pointOnCircle(cx, cy, half, angle + 180);
  assertTwoEndpoints(a, b); // fail fast — a boundary is a line, not a point (EVL §10)
  // Unit normal to the line (perpendicular direction).
  const n: Point = pointOnCircle(0, 0, 1, angle + 90);

  const offset = (p: Point, k: number): Point => ({ x: p.x + n.x * k, y: p.y + n.y * k });

  const tickMarks: string[] = [];
  if (ticks > 0) {
    for (const s of evenStops(a, b, ticks)) {
      tickMarks.push(linePath(offset(s, -tickLength / 2), offset(s, tickLength / 2)));
    }
  }

  return (
    <g data-geo="trust-boundary" {...rest}>
      <path
        d={linePath(a, b)}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {gap > 0 && (
        <path
          d={linePath(offset(a, gap), offset(b, gap))}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeOpacity={0.4}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {tickMarks.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeOpacity={0.55}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
