import type { SVGProps } from "react";
import { portPoint, type Side } from "./math";

/**
 * DomainNode — an execution domain (a cloud account / environment) (EVL §5, §6, §13).
 *
 * PURPOSE: the uniform node placed at each arm tip. Every domain — AWS, Azure, GCP,
 * K8s — is the SAME primitive, identical construction; only label and state differ.
 * Provider parity is *drawn*, not claimed. Shape only.
 *
 * CONSTRUCTION: a square panel of side `size` centered at (cx,cy), corner radius
 * `--radius-panel` (default 4). Optional connection `ports` render as short ticks
 * on the requested compass sides (the octilinear anchor points).
 *
 * PUBLIC PROPS: cx, cy, size, radius, ports, portLength, strokeWidth + SVG passthrough.
 * `portPoint(cx,cy,size/2,side)` is exported for wiring EvidenceEdges to a domain.
 * ACCESSIBILITY: decorative glyph; the domain's label/state is applied by the
 * rendering layer (a real, located name). RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: identical silhouette across providers is the whole point —
 * no provider gets special visual treatment (EVL §13). PERFORMANCE: one `<rect>`
 * + optional tick `<path>`s; pure. EXTENSION: a nested variant (a domain expands
 * into its own RadialEight) for the fractal/composable system (EVL §5).
 */
export interface DomainNodeProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  size?: number;
  radius?: number;
  ports?: Side[];
  portLength?: number;
  strokeWidth?: number;
}

export function DomainNode({
  cx = 0,
  cy = 0,
  size = 40,
  radius = 4,
  ports = [],
  portLength = 6,
  strokeWidth = 1,
  ...rest
}: DomainNodeProps) {
  const half = size / 2;
  return (
    <g data-geo="domain-node" {...rest}>
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
      {ports.map((side) => {
        const p = portPoint(cx, cy, half, side);
        const o = portPoint(cx, cy, half + portLength, side);
        return (
          <path
            key={side}
            data-port={side}
            d={`M ${p.x} ${p.y} L ${o.x} ${o.y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </g>
  );
}
