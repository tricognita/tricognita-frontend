import type { SVGProps } from "react";
import { pointOnCircle, sideDeg, type Side } from "./math";

/**
 * ConnectionPort — the anchor where an edge attaches to a node (EVL §5).
 *
 * PURPOSE: a small, explicit terminal marking where a connection enters/leaves —
 * an open ring plus a short stub pointing in the connection `direction`. Makes the
 * wiring legible and gives the motion layer a fixed point to originate flow from.
 *
 * CONSTRUCTION: an open ring of `radius` at (cx,cy) and a `stub` line leaving along
 * `direction` (a compass side → degrees clockwise from north). Pure shape.
 *
 * PUBLIC PROPS: cx, cy, radius, direction, stub, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative. RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: connections should terminate deliberately, not float into
 * a node; a real port + direction supports honest, directed edges (EVL §0.1).
 * PERFORMANCE: `<circle>` + `<path>`, pure. EXTENSION: a filled/"connected" variant;
 * a `count` for multi-lane ports.
 */
export interface ConnectionPortProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  radius?: number;
  direction?: Side;
  stub?: number;
  strokeWidth?: number;
}

export function ConnectionPort({
  cx = 0,
  cy = 0,
  radius = 3,
  direction = "e",
  stub = 8,
  strokeWidth = 1,
  ...rest
}: ConnectionPortProps) {
  const deg = sideDeg(direction);
  const a = pointOnCircle(cx, cy, radius, deg);
  const b = pointOnCircle(cx, cy, radius + stub, deg);
  return (
    <g data-geo="connection-port" data-direction={direction} {...rest}>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {stub > 0 && (
        <path
          d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}
