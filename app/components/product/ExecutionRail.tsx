import type { SVGProps } from "react";
import { ExecutionRail as ExecutionRailShape } from "@/app/components/geometry";

/**
 * ExecutionRail (product) — the deterministic pipeline rail, colored.
 * Composes geometry `ExecutionRail`; stages carry `data-stage` for the motion
 * layer to advance in quantized ticks.
 *
 * PUBLIC API: cx, cy, length, angle, stages + SVG group props.
 * RESPONSIVE: unitless/scales. ACCESSIBILITY: decorative. PERFORMANCE: one geometry
 * rail. Consumes geometry + Token color only.
 */
export interface ExecutionRailProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  length?: number;
  angle?: number;
  stages?: number;
}

export function ExecutionRail({
  cx = 0,
  cy = 0,
  length = 240,
  angle = 90,
  stages = 3,
  className,
  ...rest
}: ExecutionRailProps) {
  return (
    <g data-geo="product-execution-rail" className={className ?? "text-bone"} {...rest}>
      <ExecutionRailShape cx={cx} cy={cy} length={length} angle={angle} stages={stages} />
    </g>
  );
}
