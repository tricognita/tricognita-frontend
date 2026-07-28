import type { SVGProps } from "react";
import { regularPolygon, radialArmTips, polylinePath, linePath, pointOnCircle } from "./math";

/**
 * RadialEight — the distributed control plane: a core with eight arms at 45°
 * increments, each reaching an execution domain (DLS §1, §4.4; EVL §5).
 *
 * PURPOSE: the single live system schematic, as pure shape. Arms are load-bearing
 * (each = one execution domain), so all eight are always drawn and countable.
 *
 * CONSTRUCTION: an octagonal core (flat-topped, `coreRadius`) + `count` spokes
 * from the core edge out to circumradius `radius`, at 360/count° increments from
 * `offsetDeg` (clockwise from north). Optional `curl` adds a short constant-radius
 * hook at each tip (the "arm curl", radius token `--radius-curl`) — octopus, not
 * asterisk. Each arm carries `data-arm={i}` so the motion layer can stagger the
 * "reach" independently (EVL §4).
 *
 * PUBLIC PROPS: cx, cy, radius, coreRadius, count(=8), offsetDeg, curl, curlRadius,
 * strokeWidth + SVG passthrough. Arm tips are available via `radialArmTips(...)`
 * for placing DomainNodes/ports.
 *
 * ACCESSIBILITY: decorative; the diagram names itself at the Frame.
 * RESPONSIVE: unitless/scales; non-scaling strokes stay hairline-crisp.
 * ENGINEERING RATIONALE: peers on a grid, identical construction — distribution,
 * not a hub-and-spoke toy (EVL §5). Fixed 45° law = the diagram fingerprint.
 * PERFORMANCE: one core `<path>` + N arm `<path>`s; pure, no defs, no state.
 * EXTENSION: `count` generalizes beyond 8 for nested/fractal armatures; `curl`
 * direction could alternate for a livelier silhouette.
 */
export interface RadialEightProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  radius?: number;
  coreRadius?: number;
  count?: number;
  offsetDeg?: number;
  curl?: boolean;
  curlRadius?: number;
  strokeWidth?: number;
}

export function RadialEight({
  cx = 0,
  cy = 0,
  radius = 90,
  coreRadius = 16,
  count = 8,
  offsetDeg = 0,
  curl = false,
  curlRadius = 6,
  strokeWidth = 1,
  ...rest
}: RadialEightProps) {
  const core = polylinePath(regularPolygon(cx, cy, coreRadius, 8, 22.5), true);
  const tips = radialArmTips(cx, cy, radius, count, offsetDeg);

  return (
    <g data-geo="radial-eight" {...rest}>
      <path
        d={core}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
      {tips.map((tip, i) => {
        const deg = offsetDeg + (i * 360) / count;
        const base = pointOnCircle(cx, cy, coreRadius, deg);
        const arm = linePath(base, tip);
        const hook =
          curl
            ? ` M ${tip.x} ${tip.y} A ${curlRadius} ${curlRadius} 0 0 1 ${
                pointOnCircle(tip.x, tip.y, curlRadius, deg + 90).x
              } ${pointOnCircle(tip.x, tip.y, curlRadius, deg + 90).y}`
            : "";
        return (
          <path
            key={i}
            data-arm={i}
            d={arm + hook}
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
