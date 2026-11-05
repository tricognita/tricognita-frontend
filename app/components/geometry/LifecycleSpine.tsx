import type { SVGProps } from "react";
import { pointOnCircle, evenStops, linePath, type Point } from "./math";

/**
 * LifecycleSpine — the ten-beat narrative track, the "you are here" (ENGINEERING_
 * NARRATIVE §1, §3.1).
 *
 * PURPOSE: the persistent backbone every action plays against. Ten evenly spaced
 * beat stops connected by a rail; the rendering layer emphasizes the live beat and
 * locks the done ones. Pure shape here — no active state, no color.
 *
 * CONSTRUCTION: a rail of `length` at `angle` (default 90° = horizontal),
 * centered at (cx,cy), with `beats` stop nodes (small octagon marks) placed on
 * `evenStops`. Each stop carries `data-beat={i}` for the motion/"you-are-here" layer.
 *
 * PUBLIC PROPS: cx, cy, length, angle, beats(=10), nodeRadius, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: the composed spine should expose current beat via an accessible
 * name / live region at the rendering layer; the geometry is decorative.
 * RESPONSIVE: unitless/scales; vertical (`angle=180`) works for narrow columns.
 * ENGINEERING RATIONALE: one learned arc reads every capability; the spine makes
 * locatability (G1) structural. PERFORMANCE: rail + N node `<circle>`s, pure.
 * EXTENSION: `beats` is parameterized though the canonical arc is 10; connectors
 * could carry direction chevrons for cause→effect reading.
 */
export interface LifecycleSpineProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  length?: number;
  angle?: number;
  beats?: number;
  nodeRadius?: number;
  strokeWidth?: number;
}

export function LifecycleSpine({
  cx = 0,
  cy = 0,
  length = 360,
  angle = 90,
  beats = 10,
  nodeRadius = 4,
  strokeWidth = 1,
  ...rest
}: LifecycleSpineProps) {
  const half = length / 2;
  const a: Point = pointOnCircle(cx, cy, half, angle + 180);
  const b: Point = pointOnCircle(cx, cy, half, angle);
  const stops = evenStops(a, b, beats);

  return (
    <g data-geo="lifecycle-spine" {...rest}>
      <path
        d={linePath(a, b)}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {stops.map((s, i) => (
        <circle
          key={i}
          data-beat={i}
          cx={s.x}
          cy={s.y}
          r={nodeRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}
