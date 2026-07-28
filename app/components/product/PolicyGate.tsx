import type { SVGProps } from "react";
import { PolicyGate as PolicyGateShape } from "@/app/components/geometry";
import { OperationalState } from "@/lib/contracts/state";
import { gateOpen, operationalClass } from "./viewmodel";

/**
 * PolicyGate (product) — a control's binary decision, colored by state.
 * Open (gap) iff nominal/passed; shut (crossbar) for advisory/halt. Color from
 * the Contract state via currentColor. Snap motion is applied by the parent
 * (`snapState` on `[data-role=gate]`).
 *
 * PUBLIC API: cx, cy, state, aperture, postLength + SVG group props.
 * RESPONSIVE: unitless/scales. ACCESSIBILITY: decorative; the pass/fail is
 * announced by the render context. PERFORMANCE: one geometry gate. No duplication.
 */
export interface PolicyGateProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  state?: OperationalState;
  aperture?: number;
  postLength?: number;
}

export function PolicyGate({
  cx = 0,
  cy = 0,
  state = OperationalState.Nominal,
  aperture = 24,
  postLength = 22,
  className,
  ...rest
}: PolicyGateProps) {
  return (
    <g data-geo="product-policy-gate" data-role="gate" className={className ?? operationalClass(state)} {...rest}>
      <PolicyGateShape cx={cx} cy={cy} open={gateOpen(state)} aperture={aperture} postLength={postLength} />
    </g>
  );
}
