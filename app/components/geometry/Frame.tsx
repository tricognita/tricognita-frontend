import type { ReactNode, SVGProps } from "react";

/**
 * Frame — the coordinate surface. Engine infrastructure, not a primitive.
 *
 * PURPOSE: the ONE element that emits an `<svg>`. Every primitive renders a `<g>`,
 * so composition happens inside a single Frame. It also makes any primitive
 * "independently renderable": `<Frame width={200} height={200}>…</Frame>`.
 *
 * CONSTRUCTION: sets `viewBox` from `width`/`height` (+ optional `padding`), and
 * `fill="none"` as the geometry default. `centered` shifts the origin to the
 * middle so radial primitives can be placed at (0,0).
 *
 * COLOR: sets nothing but inherits `currentColor`. The rendering layer sets the
 * color by putting a Phase-1 role utility on Frame or a child (e.g. `text-graticule`).
 *
 * ACCESSIBILITY: a meaningful diagram passes `role="img"` + `aria-label`; a purely
 * decorative one passes `aria-hidden`. Frame forwards both via `...rest`.
 *
 * RESPONSIVE: unitless user-space; the SVG scales fluidly to its box. Pair with
 * `preserveAspectRatio` (default "xMidYMid meet") and CSS width/height.
 *
 * PERFORMANCE: no state, no effects — a static DOM subtree; SSR/RSC-safe.
 */
export interface FrameProps extends Omit<SVGProps<SVGSVGElement>, "viewBox"> {
  width: number;
  height: number;
  padding?: number;
  centered?: boolean;
  children: ReactNode;
}

export function Frame({
  width,
  height,
  padding = 0,
  centered = false,
  children,
  fill = "none",
  ...rest
}: FrameProps) {
  const minX = (centered ? -width / 2 : 0) - padding;
  const minY = (centered ? -height / 2 : 0) - padding;
  const w = width + padding * 2;
  const h = height + padding * 2;
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} fill={fill} {...rest}>
      {children}
    </svg>
  );
}
