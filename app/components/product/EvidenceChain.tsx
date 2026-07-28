import type { SVGProps } from "react";
import { EvidenceNode, EvidenceEdge } from "@/app/components/geometry";
import { evidenceStateAt, evidenceClass } from "./viewmodel";

/**
 * EvidenceChain (product) — signed, hash-linked evidence blocks, colored by their
 * append-only state. Composes geometry `EvidenceNode` + `EvidenceEdge`; each block's
 * `EvidenceState` derived from `sealedUpTo`/`verifiedUpTo` (monotonic, pure).
 *
 * PUBLIC API: cx, cy, count, gap, sealedUpTo, verifiedUpTo, archived + group props.
 * Nodes/edges carry `data-role="node-i"/"edge-i"` for the motion layer (drawEvidence,
 * sealBlock, verifyChain). COMPOSITION: parent drives motion via those hooks.
 * RESPONSIVE: unitless/scales. ACCESSIBILITY: decorative; digests/labels added by
 * context. PERFORMANCE: N nodes + N-1 edges; pure. No duplicated geometry.
 */
export interface EvidenceChainProps extends SVGProps<SVGGElement> {
  cx?: number;
  cy?: number;
  count?: number;
  gap?: number;
  /** Highest index that has sealed / verified (-1 = none yet). */
  sealedUpTo?: number;
  verifiedUpTo?: number;
  archived?: boolean;
}

export function EvidenceChain({
  cx = 0,
  cy = 0,
  count = 3,
  gap = 92,
  sealedUpTo = -1,
  verifiedUpTo = -1,
  archived = false,
  ...rest
}: EvidenceChainProps) {
  const half = ((count - 1) * gap) / 2;
  const xs = Array.from({ length: count }, (_, i) => cx - half + i * gap);
  const NODE_HALF = 28;

  return (
    <g data-geo="product-evidence-chain" {...rest}>
      {xs.slice(1).map((x, i) => (
        <EvidenceEdge
          key={`e${i}`}
          data-role={`edge-${i}`}
          from={{ x: xs[i] + NODE_HALF, y: cy }}
          to={{ x: x - NODE_HALF, y: cy }}
          className="text-bone-muted"
        />
      ))}
      {xs.map((x, i) => (
        <EvidenceNode
          key={`n${i}`}
          data-role={`node-${i}`}
          cx={x}
          cy={cy}
          w={56}
          h={40}
          notch={10}
          className={evidenceClass(evidenceStateAt(i, sealedUpTo, verifiedUpTo, archived))}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      ))}
    </g>
  );
}
