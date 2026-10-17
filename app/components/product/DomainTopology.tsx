import type { SVGProps } from "react";
import { DomainNode, radialArmTips } from "@/app/components/geometry";
import { OperationalState } from "@/lib/contracts/state";
import { operationalClass } from "./viewmodel";

/**
 * DomainTopology (product) — execution domains as PEERS on a radial grid, colored
 * by state. Provider parity is drawn: every domain is the identical geometry
 * `DomainNode`; only state color + label differ (EVL §13). No provider is special.
 *
 * PUBLIC API: cx, cy, radius, domains ({label,state}[]), size + group props.
 * COMPOSITION: positions from geometry `radialArmTips` — no duplication. Nodes carry
 * `data-role="domain-i"` + `data-label`. RESPONSIVE: unitless/scales. ACCESSIBILITY:
 * labels are real attributes; the composing view names the diagram. PERFORMANCE:
 * N identical nodes; pure.
 */
export interface DomainSpec {
  readonly label: string;
  readonly state: OperationalState;
}
export interface DomainTopologyProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  radius?: number;
  size?: number;
  domains: readonly DomainSpec[];
}

export function DomainTopology({
  cx = 0,
  cy = 0,
  radius = 92,
  size = 18,
  domains,
  ...rest
}: DomainTopologyProps) {
  const tips = radialArmTips(cx, cy, radius, domains.length);
  return (
    <g data-geo="product-domain-topology" {...rest}>
      {domains.map((d, i) => (
        <DomainNode
          key={i}
          data-role={`domain-${i}`}
          data-label={d.label}
          cx={tips[i].x}
          cy={tips[i].y}
          size={size}
          className={operationalClass(d.state)}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
    </g>
  );
}
