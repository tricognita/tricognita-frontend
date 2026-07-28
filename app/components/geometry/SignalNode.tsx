import type { SVGProps } from "react";
import { pointOnCircle, polylinePath } from "./math";

/**
 * SignalNode — the Signal node type in the Evidence Graph (EVL §7).
 *
 * PURPOSE: the origin/trigger glyph — a small filled triangle "pointing" in the
 * flow `direction`. Type is carried by silhouette, never by color (color = state).
 *
 * CONSTRUCTION: an equilateral triangle (circumradius `size`) filled with
 * `currentColor`, rotated to `direction` degrees (clockwise from north).
 *
 * PUBLIC PROPS: cx, cy, size, direction, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative glyph; typed meaning is labeled at the diagram level.
 * RESPONSIVE: unitless/scales. ENGINEERING RATIONALE: a directional filled mark
 * reads as a pulse/origin distinct from the other four graph glyphs (EVL §7).
 * PERFORMANCE: one `<path>`, pure. EXTENSION: outline vs filled variant.
 */
export interface SignalNodeProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  size?: number;
  direction?: number;
  strokeWidth?: number;
}

export function SignalNode({
  cx = 0,
  cy = 0,
  size = 9,
  direction = 0,
  strokeWidth = 1,
  ...rest
}: SignalNodeProps) {
  const pts = [0, 120, 240].map((a) => pointOnCircle(cx, cy, size, direction + a));
  return (
    <g data-geo="signal-node" {...rest}>
      <path
        d={polylinePath(pts, true)}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
