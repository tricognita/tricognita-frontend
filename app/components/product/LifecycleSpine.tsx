import type { SVGProps } from "react";
import {
  LifecycleSpine as SpineShape,
  ConnectionPort,
  evenStops,
  type Point,
} from "@/app/components/geometry";
import { BEAT_ORDER, deriveStatuses, type NarrativeProgress } from "@/lib/contracts/narrative";
import { beatVisual } from "./viewmodel";

/**
 * LifecycleSpine (product) — the ten-beat "you are here" track, colored by status.
 * Composes the geometry spine (rail) + a per-beat `ConnectionPort` marker colored
 * via `beatVisual(status)`. Progress is CONTROLLED (parent owns `current`).
 *
 * PUBLIC API: cx, cy, length, progress (NarrativeProgress) + SVG group props.
 * COMPOSITION: positions come from geometry `evenStops` — no duplicated geometry.
 * RESPONSIVE: unitless/scales. ACCESSIBILITY: the current beat should be announced
 * by an aria-live region at the composing view (see AutonomousRemediationView).
 * PERFORMANCE: 1 spine + 10 rings; pure. Deterministic from `deriveStatuses`.
 */
export interface LifecycleSpineProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  length?: number;
  progress: NarrativeProgress;
}

export function LifecycleSpine({
  cx = 0,
  cy = 0,
  length = 320,
  progress,
  ...rest
}: LifecycleSpineProps) {
  const statuses = deriveStatuses(progress);
  const half = length / 2;
  const a: Point = { x: cx - half, y: cy };
  const b: Point = { x: cx + half, y: cy };
  const stops = evenStops(a, b, BEAT_ORDER.length);

  return (
    <g data-geo="product-lifecycle-spine" {...rest}>
      <SpineShape cx={cx} cy={cy} length={length} beats={BEAT_ORDER.length} className="text-bone-muted" style={{ opacity: 0.35 }} />
      {BEAT_ORDER.map((beat, i) => {
        const v = beatVisual(statuses[beat]);
        return (
          <ConnectionPort
            key={beat}
            data-beat={i}
            cx={stops[i].x}
            cy={stops[i].y}
            radius={v.emphasized ? 5 : 3}
            stub={0}
            className={v.colorClass}
            style={{ opacity: v.opacity }}
          />
        );
      })}
    </g>
  );
}
