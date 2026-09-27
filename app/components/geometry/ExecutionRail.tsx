import type { SVGProps } from "react";
import { evenStops, linePath, pointOnCircle, type Point } from "./math";
import { assertMinStages } from "./invariants";

/**
 * ExecutionRail — the deterministic pipeline track (EVL §1: Evaluate→Prove→Run).
 *
 * PURPOSE: a straight rail carrying evenly spaced stage stops (detents), the
 * mechanism `Evaluate/Prove/Run` runs along. Quantized, mechanical — the visual
 * opposite of a fuzzy gradient. Stops carry `data-stage={i}` for the motion layer
 * to advance them in equal linear ticks.
 *
 * CONSTRUCTION: a segment of `length` at `angle` (default 90° = horizontal),
 * centered at (cx,cy), with `stages` detent ticks perpendicular to the rail.
 *
 * PUBLIC PROPS: cx, cy, length, angle, stages, detentLength, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative; described at the Frame. RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: an escapement, not a progress bar — determinism you can
 * count. Stops are discrete, never a continuous fill (EVL §0.3).
 * PERFORMANCE: rail `<path>` + N detent `<path>`s; pure. EXTENSION: `evenStops`
 * is exported so callers can mount PolicyGates/glyphs exactly on the detents.
 */
export interface ExecutionRailProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  length?: number;
  angle?: number;
  stages?: number;
  detentLength?: number;
  strokeWidth?: number;
}

export function ExecutionRail({
  cx = 0,
  cy = 0,
  length = 240,
  angle = 90,
  stages = 3,
  detentLength = 10,
  strokeWidth = 1,
  ...rest
}: ExecutionRailProps) {
  assertMinStages(stages); // fail fast — a pipeline needs >= 2 stages (EVL §1)
  const half = length / 2;
  const a: Point = pointOnCircle(cx, cy, half, angle + 180);
  const b: Point = pointOnCircle(cx, cy, half, angle);
  const n: Point = pointOnCircle(0, 0, 1, angle + 90);
  const stops = evenStops(a, b, stages);

  return (
    <g data-geo="execution-rail" {...rest}>
      <path
        d={linePath(a, b)}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {stops.map((s, i) => (
        <path
          key={i}
          data-stage={i}
          d={linePath(
            { x: s.x - n.x * (detentLength / 2), y: s.y - n.y * (detentLength / 2) },
            { x: s.x + n.x * (detentLength / 2), y: s.y + n.y * (detentLength / 2) },
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
