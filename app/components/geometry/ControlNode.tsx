import type { SVGProps } from "react";

/**
 * ControlNode — the Control node type in the Evidence Graph (EVL §7).
 *
 * PURPOSE: the governance glyph — a rounded square crossed by a horizontal bar
 * (a governor/register). Distinct silhouette from Signal/Observation/Assertion/
 * Evidence; type by shape, never color.
 *
 * CONSTRUCTION: a rounded `<rect>` of side `size` (corner `radius`) with a bar
 * across its middle at `barInset` from each edge. `currentColor`, outline.
 *
 * PUBLIC PROPS: cx, cy, size, radius, barInset, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative; named at the diagram. RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: a control is a governed unit — a framed square with a
 * regulating bar communicates "policy/control" without an icon metaphor.
 * PERFORMANCE: `<rect>` + `<path>`, pure. EXTENSION: a "satisfied/violated" bar
 * position, driven by the render layer's state.
 */
export interface ControlNodeProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  size?: number;
  radius?: number;
  barInset?: number;
  strokeWidth?: number;
}

export function ControlNode({
  cx = 0,
  cy = 0,
  size = 16,
  radius = 3,
  barInset = 3,
  strokeWidth = 1,
  ...rest
}: ControlNodeProps) {
  const half = size / 2;
  return (
    <g data-geo="control-node" {...rest}>
      <rect
        x={cx - half}
        y={cy - half}
        width={size}
        height={size}
        rx={radius}
        ry={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${cx - half + barInset} ${cy} L ${cx + half - barInset} ${cy}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
