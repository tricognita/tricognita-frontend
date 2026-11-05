import type { SVGProps } from "react";

/**
 * ProjectionGrid — the graticule / coordinate system (DLS §4; EVL §0.5, §7).
 *
 * PURPOSE: the platform's coordinate face — structure, not texture. Everything
 * aligns to it like an instrument. Also the surface the Evidence Graph (CQRS
 * projection) precipitates onto.
 *
 * CONSTRUCTION: evenly spaced vertical + horizontal hairlines across `width`×
 * `height` at `cell` spacing (default 32, mirroring `--grid-cell`). Emitted in a
 * single `<path>` for cheapness. Faintness is applied by the rendering layer via
 * `strokeOpacity`/utility — geometry only sets `currentColor`.
 *
 * PUBLIC PROPS: width, height, cell, originX, originY, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: always decorative — pass `aria-hidden` at the Frame.
 * RESPONSIVE: `cell` is a fixed cadence; the surface crops to width×height.
 * ENGINEERING RATIONALE: a real coordinate grid signals precision the engine
 * actually has; off-grid geometry would imply imprecision it does not.
 * PERFORMANCE: ONE `<path>` for all lines — no per-line nodes. Pure/SSR-safe.
 * EXTENSION: add a `subdivisions` minor grid; a radial variant for the core.
 */
export interface ProjectionGridProps extends SVGProps<SVGGElement> {
  width?: number;
  height?: number;
  cell?: number;
  originX?: number;
  originY?: number;
  strokeWidth?: number;
}

export function ProjectionGrid({
  width = 320,
  height = 320,
  cell = 32,
  originX = 0,
  originY = 0,
  strokeWidth = 1,
  ...rest
}: ProjectionGridProps) {
  const segs: string[] = [];
  for (let x = originX; x <= originX + width + 0.001; x += cell) {
    segs.push(`M ${x} ${originY} L ${x} ${originY + height}`);
  }
  for (let y = originY; y <= originY + height + 0.001; y += cell) {
    segs.push(`M ${originX} ${y} L ${originX + width} ${y}`);
  }
  return (
    <g data-geo="projection-grid" {...rest}>
      <path
        d={segs.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        shapeRendering="crispEdges"
      />
    </g>
  );
}
