import type { SVGProps } from "react";
import { routePath, type Point, type Routing } from "./math";

/**
 * EvidenceEdge — a connection line; edges ARE evidence (DLS §1; EVL §0.1, §8).
 *
 * PURPOSE: the directed link between two ports/nodes — an observation flowing in,
 * an arm reaching a domain, a hash-link threading two evidence blocks. Drawn
 * octilinearly (45°/90°) so it obeys the radial law; "draws / settles to signed"
 * is motion applied later.
 *
 * CONSTRUCTION: a single `<path>` routed `from`→`to` via `routePath` (default
 * `octilinear`; `orthogonal` and `straight` available). Direction is real and
 * always correct (a wrong-direction edge is forbidden) — the render/motion layer
 * animates flow along it. `pathLength={1}` normalizes the path so the motion layer
 * can "draw" it with a 0→1 dash without measuring.
 *
 * PUBLIC PROPS: from, to, routing, strokeWidth + SVG passthrough. The raw `d` is
 * available via `routePath(from,to,routing)` for callers that need the geometry.
 * ACCESSIBILITY: decorative; relationships are named at the diagram level.
 * RESPONSIVE: unitless/scales; non-scaling stroke keeps it hairline.
 * ENGINEERING RATIONALE: octilinear routing is the anti-"bezier spaghetti" — it
 * makes a Tricognita diagram recognizable in pure wireframe (DLS §4.2).
 * PERFORMANCE: one `<path>`, pure. EXTENSION: an arrow/verified-tick terminal;
 * a `via` waypoint for routing around nodes.
 */
export interface EvidenceEdgeProps extends Omit<SVGProps<SVGGElement>, "from" | "to"> {
  from: Point;
  to: Point;
  routing?: Routing;
  strokeWidth?: number;
}

export function EvidenceEdge({
  from,
  to,
  routing = "octilinear",
  strokeWidth = 1,
  ...rest
}: EvidenceEdgeProps) {
  return (
    <g data-geo="evidence-edge" {...rest}>
      <path
        d={routePath(from, to, routing)}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        strokeLinecap="round"
        pathLength={1}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
