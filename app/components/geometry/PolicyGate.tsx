import type { SVGProps } from "react";
import { pointOnCircle, linePath, type Point } from "./math";

/**
 * PolicyGate — a control/policy gate that is open (pass) or shut (fail/halt),
 * mounted on a rail (EVL §11).
 *
 * PURPOSE: the binary, located decision point. Two posts either leave a gap
 * (open → pass) or are bridged by a crossbar (shut → fail/halt). Hard, mechanical,
 * never a score or gradient.
 *
 * CONSTRUCTION: two `postLength` posts perpendicular to the rail, `aperture`
 * apart, centered at (cx,cy) at `angle` (rail direction, default 90°). When
 * `open` is false a crossbar joins them. `open` is a geometric configuration, not
 * imported product state — the rendering layer passes the value it computed.
 *
 * PUBLIC PROPS: cx, cy, open, aperture, postLength, angle, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative; the gate's meaning is conveyed by an accessible name
 * on the composed diagram. RESPONSIVE: unitless/scales.
 * ENGINEERING RATIONALE: open/shut is the only truthful rendering of a boolean
 * policy outcome; the located gate (not an aggregate %) is the point (EVL §11).
 * PERFORMANCE: 2–3 `<path>`s, pure. EXTENSION: a `halt` variant could thicken the
 * crossbar; `data-open` is emitted for the motion layer to snap the gate.
 */
export interface PolicyGateProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  open?: boolean;
  aperture?: number;
  postLength?: number;
  angle?: number;
  strokeWidth?: number;
}

export function PolicyGate({
  cx = 0,
  cy = 0,
  open = true,
  aperture = 20,
  postLength = 14,
  angle = 90,
  strokeWidth = 1.25,
  ...rest
}: PolicyGateProps) {
  // Along-rail unit (post offset direction) and across-rail unit (post length).
  const along: Point = pointOnCircle(0, 0, 1, angle);
  const across: Point = pointOnCircle(0, 0, 1, angle + 90);
  const half = aperture / 2;
  const pl = postLength / 2;

  const post = (sign: number): string => {
    const base: Point = { x: cx + along.x * sign * half, y: cy + along.y * sign * half };
    return linePath(
      { x: base.x - across.x * pl, y: base.y - across.y * pl },
      { x: base.x + across.x * pl, y: base.y + across.y * pl },
    );
  };
  const bar = linePath(
    { x: cx - along.x * half, y: cy - along.y * half },
    { x: cx + along.x * half, y: cy + along.y * half },
  );

  return (
    <g data-geo="policy-gate" data-open={open} {...rest}>
      <path d={post(-1)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path d={post(1)} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {!open && (
        <path d={bar} fill="none" stroke="currentColor" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
      )}
    </g>
  );
}
