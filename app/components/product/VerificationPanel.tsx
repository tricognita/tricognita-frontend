"use client";

import { useRef, useState } from "react";
import { Frame, EvidenceNode } from "@/app/components/geometry";
import { verifyChain } from "@/lib/motion";

/**
 * VerificationPanel (product) — demonstrates the proof: a chain that VERIFIES link
 * by link (verifyChain motion), or HALTS at the exact broken link. Proof is shown
 * running, never asserted with a badge (EVL §8).
 *
 * PUBLIC API: links, breakAt (null = sound chain). COMPOSITION: consumes geometry
 * EvidenceNode + motion verifyChain. RESPONSIVE: SVG scales; controls wrap.
 * ACCESSIBILITY: a button + an aria-live status readout (not color-only).
 * PERFORMANCE: one animation per link; honors reduced motion. No duplication.
 */
export interface VerificationPanelProps {
  links?: number;
  breakAt?: number | null;
}

type Status = "unverified" | "verifying" | "verified" | "halt";

export function VerificationPanel({ links = 3, breakAt = null }: VerificationPanelProps) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("unverified");
  const gap = 92;
  const half = ((links - 1) * gap) / 2;

  async function verify() {
    if (!host.current || status === "verifying") return;
    const nodes = Array.from(host.current.querySelectorAll<SVGElement>("[data-geo=evidence-node]"));
    setStatus("verifying");
    await verifyChain(nodes, { links, breakAt }).finished;
    setStatus(breakAt == null ? "verified" : "halt");
  }

  return (
    <div className="text-bone">
      <div ref={host}>
        <Frame width={links * gap + 40} height={70} centered role="img" aria-label="Evidence chain verification" style={{ width: "100%", height: "auto" }}>
          {Array.from({ length: links }, (_, i) => (
            <EvidenceNode key={i} cx={-half + i * gap} cy={0} w={56} h={40} notch={10} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
          ))}
        </Frame>
      </div>
      <div className="mt-2 flex items-center gap-3 font-mono text-xs">
        <button type="button" onClick={verify} className="focus-ring rounded-panel border border-graticule px-3 py-1 uppercase tracking-[0.1em] hover:border-bone-muted">
          Verify chain
        </button>
        <span aria-live="polite" className={status === "halt" ? "text-halt" : status === "verified" ? "text-nominal" : "text-bone-muted"}>
          {status === "halt" ? `HALT @ link ${breakAt}` : status}
        </span>
      </div>
    </div>
  );
}
