import type { SVGProps } from "react";
import { TrustBoundary as TrustBoundaryShape } from "@/app/components/geometry";

/**
 * TrustBoundary (product) — the sovereign divider with labelled planes.
 * Composes geometry `TrustBoundary` + side labels; color via currentColor.
 *
 * PUBLIC API: cx, cy, length, angle, dataLabel, controlLabel + SVG group props.
 * COMPOSITION: place inside a `<Frame>` (playground) or a larger schematic.
 * RESPONSIVE: unitless; scales with the Frame. ACCESSIBILITY: decorative geometry;
 * the plane names are real text (readable, translatable). PERFORMANCE: 1 shape + 2
 * texts, pure. Consumes geometry + Token color only — no duplication.
 */
export interface TrustBoundaryProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  length?: number;
  angle?: number;
  dataLabel?: string;
  controlLabel?: string;
}

export function TrustBoundary({
  cx = 0,
  cy = 0,
  length = 220,
  angle = 0,
  dataLabel = "DATA PLANE",
  controlLabel = "CONTROL PLANE",
  className,
  ...rest
}: TrustBoundaryProps) {
  const label = { fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em" } as const;
  return (
    <g data-geo="product-trust-boundary" className={className ?? "text-bone"} {...rest}>
      <TrustBoundaryShape cx={cx} cy={cy} length={length} angle={angle} ticks={5} />
      <text x={cx - 12} y={cy - length / 2 + 8} textAnchor="end" fill="currentColor" style={label} opacity={0.75}>
        {dataLabel}
      </text>
      <text x={cx + 12} y={cy - length / 2 + 8} textAnchor="start" fill="currentColor" style={label} opacity={0.75}>
        {controlLabel}
      </text>
    </g>
  );
}
