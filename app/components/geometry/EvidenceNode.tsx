import type { SVGProps } from "react";
import { assertPositiveNotch } from "./invariants";

/**
 * EvidenceNode — a signed evidence block (EVL §2, §8; the Evidence node type §7).
 *
 * PURPOSE: the heavy, permanent record glyph. A hairline block with a clipped
 * corner — the corner notch is the hash-link anchor (where the thread to the
 * previous block attaches). Sealed/open (the seal) is state, applied later.
 *
 * CONSTRUCTION: a rectangle `w`×`h` centered at (cx,cy) with the top-left corner
 * chamfered by `notch` — a beveled block, distinct from a plain DomainNode square.
 * The chamfer point `(x+notch, y)`/`(x, y+notch)` is exposed as `data-anchor`.
 *
 * PUBLIC PROPS: cx, cy, w, h, notch, strokeWidth + SVG passthrough.
 * ACCESSIBILITY: decorative; the digest/label is content added by the render layer.
 * RESPONSIVE: unitless/scales. ENGINEERING RATIONALE: evidence must read as
 * *heavier and more permanent* than a UI card; the chamfer gives it a record/seal
 * silhouette and a real anchor for the chain thread. PERFORMANCE: one `<path>`,
 * pure. EXTENSION: a `sealed` seal glyph variant; a stacked/compacted form for
 * history (EVL §2 "compacts upward, never deleted").
 */
export interface EvidenceNodeProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  w?: number;
  h?: number;
  notch?: number;
  strokeWidth?: number;
}

export function EvidenceNode({
  cx = 0,
  cy = 0,
  w = 44,
  h = 32,
  notch = 8,
  strokeWidth = 1,
  ...rest
}: EvidenceNodeProps) {
  assertPositiveNotch(notch, w, h); // fail fast — the hash-link anchor must exist (EVL §8)
  const x = cx - w / 2;
  const y = cy - h / 2;
  // Chamfered top-left corner (the hash-link anchor).
  const d =
    `M ${x + notch} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} ` +
    `L ${x} ${y + notch} Z`;
  return (
    <g data-geo="evidence-node" data-anchor={`${x},${y + notch}`} {...rest}>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
