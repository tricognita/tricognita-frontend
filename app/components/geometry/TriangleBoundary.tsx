import type { SVGProps } from "react";
import { triangleVertices, polylinePath } from "./math";

/**
 * TriangleBoundary — the trust boundary as an equilateral triangle (DLS §1, §4.3).
 *
 * PURPOSE: draws the sovereign frame — the enclosing, stable boundary the whole
 * identity descends from. Shape only; its "always stable / drawn-first" behavior
 * is applied later by the motion layer (EVL §10).
 *
 * CONSTRUCTION: an equilateral triangle of circumradius `size`, centered at
 * (cx,cy), apex `orientation` up (base-down = grounded, DLS §4.5). Outline only,
 * mitered corners. `vectorEffect="non-scaling-stroke"` keeps the hairline crisp
 * at any scale.
 *
 * PUBLIC PROPS: size, orientation, cx, cy, strokeWidth + all `<g>`/SVG props
 * (className, style, transform, data-*, aria-*, ref) via passthrough.
 *
 * ACCESSIBILITY: decorative by default; name the parent Frame with role="img".
 * RESPONSIVE: unitless; scales with the Frame viewBox.
 * ENGINEERING RATIONALE: the boundary is the most load-bearing line in the system;
 * it is a real shape (3 vertices), reusable for framing and safe-area.
 * PERFORMANCE: single `<path>`, pure render.
 * EXTENSION: `orientation` could accept an arbitrary rotation; vertices are
 * exported (`triangleVertices`) so callers can anchor content to the corners.
 */
export interface TriangleBoundaryProps extends SVGProps<SVGGElement> {
  size?: number;
  orientation?: "up" | "down";
  cx?: number;
  cy?: number;
  strokeWidth?: number;
}

export function TriangleBoundary({
  size = 100,
  orientation = "up",
  cx = 0,
  cy = 0,
  strokeWidth = 1,
  ...rest
}: TriangleBoundaryProps) {
  const d = polylinePath(triangleVertices(cx, cy, size, orientation), true);
  return (
    <g data-geo="triangle-boundary" {...rest}>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
