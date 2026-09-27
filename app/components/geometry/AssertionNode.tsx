import type { SVGProps } from "react";
import { pointOnCircle, polylinePath } from "./math";

/**
 * AssertionNode — the Assertion node type in the Evidence Graph (EVL §7).
 *
 * PURPOSE: the claim/conclusion glyph — an outlined diamond (rhombus), the "QED"
 * of the graph. Distinct silhouette from the other four graph glyphs; type by
 * shape, never color.
 *
 * CONSTRUCTION: a 4-point regular polygon (circumradius `size`, i.e. a diamond)
 * outlined in `currentColor`.
 *
 * PUBLIC PROPS: cx, cy, size, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative; named at the diagram. RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: a diamond reads as a terminal assertion/decision and is
 * visually orthogonal to square (Control), circle (Observation), triangle (Signal),
 * and block (Evidence). PERFORMANCE: one `<path>`, pure. EXTENSION: a filled
 * "proven" variant driven by the render layer's state.
 */
export interface AssertionNodeProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  size?: number;
  strokeWidth?: number;
}

export function AssertionNode({
  cx = 0,
  cy = 0,
  size = 10,
  strokeWidth = 1,
  ...rest
}: AssertionNodeProps) {
  const pts = [0, 90, 180, 270].map((a) => pointOnCircle(cx, cy, size, a));
  return (
    <g data-geo="assertion-node" {...rest}>
      <path
        d={polylinePath(pts, true)}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
