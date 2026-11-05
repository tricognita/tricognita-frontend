import type { SVGProps } from "react";

/**
 * ObservationNode — the Observation node type in the Evidence Graph (EVL §7).
 *
 * PURPOSE: the "we saw" glyph — an aperture: an open ring with a center dot.
 * Reads as a reading/observation, distinct from Signal/Control/Assertion/Evidence.
 *
 * CONSTRUCTION: an outer `<circle>` (radius `size`) + a filled center dot
 * (`dotRatio`·size). Color via `currentColor`; type by shape only.
 *
 * PUBLIC PROPS: cx, cy, size, dotRatio, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative; named at the diagram. RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: an aperture is the natural icon for observation and is
 * visually orthogonal to the other four graph glyphs. PERFORMANCE: two circles,
 * pure. EXTENSION: a crosshair variant for "sampled" observations.
 */
export interface ObservationNodeProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  size?: number;
  dotRatio?: number;
  strokeWidth?: number;
}

export function ObservationNode({
  cx = 0,
  cy = 0,
  size = 8,
  dotRatio = 0.3,
  strokeWidth = 1,
  ...rest
}: ObservationNodeProps) {
  return (
    <g data-geo="observation-node" {...rest}>
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={cx} cy={cy} r={size * dotRatio} fill="currentColor" stroke="none" />
    </g>
  );
}
