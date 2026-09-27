import type { SVGProps } from "react";
import { TriangleBoundary, RadialEight } from "@/app/components/geometry";
import { DomainTopology, type DomainSpec } from "./DomainTopology";

/**
 * CloudControlPlane (product) — the signature schematic: a stable trust-boundary
 * triangle enclosing the distributed control-plane core, whose eight arms reach
 * peer execution domains. Composes geometry `TriangleBoundary` + `RadialEight` +
 * `DomainTopology`. The activation (`bootSequence`) targets `[data-role=boundary]`,
 * `[data-role=core]`, and the arms (`[data-geo=radial-eight] [data-arm]`).
 *
 * PUBLIC API: cx, cy, size, domains + SVG group props. COMPOSITION: hero scale
 * (marketing) and operational scale (product) from one geometry. RESPONSIVE:
 * unitless/scales. ACCESSIBILITY: name the diagram at the composing Frame.
 * PERFORMANCE: boundary + core + N domains; pure. No duplicated geometry.
 */
export interface CloudControlPlaneProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  size?: number;
  domains: readonly DomainSpec[];
}

export function CloudControlPlane({
  cx = 0,
  cy = 0,
  size = 120,
  domains,
  ...rest
}: CloudControlPlaneProps) {
  const reach = size * 0.82;
  return (
    <g data-geo="product-cloud-control-plane" {...rest}>
      <TriangleBoundary data-role="boundary" cx={cx} cy={cy} size={size} className="text-bone" style={{ opacity: 0.5 }} />
      <RadialEight data-role="core" cx={cx} cy={cy} radius={reach} coreRadius={14} count={domains.length} curl className="text-bone" />
      <DomainTopology cx={cx} cy={cy} radius={reach} domains={domains} size={16} />
    </g>
  );
}
