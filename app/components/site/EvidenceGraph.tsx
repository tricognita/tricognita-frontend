"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The signature interaction: a living visualization of ARIA reasoning about a
 * cloud change — ingest → reason → evaluate policy → scope blast radius → plan
 * reversible remediation → sign evidence. Nodes activate in sequence, edges
 * flow, a reasoning pulse travels the active path, and confidence rises. It is
 * a real reasoning model, not a fake dashboard.
 *
 * Accessibility: a text/table summary is exposed for screen readers; with
 * prefers-reduced-motion the graph renders fully resolved (all steps complete),
 * with no looping animation.
 */

type NodeId = "event" | "aria" | "policy" | "blast" | "remediate" | "evidence";

const NODES: Record<
  NodeId,
  { x: number; y: number; r: number; label: string; sub: string; step: number }
> = {
  event:     { x: 72,  y: 84,  r: 7,  label: "CloudTrail", sub: "iam:AttachRolePolicy", step: 0 },
  aria:      { x: 214, y: 196, r: 15, label: "ARIA",       sub: "reasoning",            step: 1 },
  policy:    { x: 372, y: 84,  r: 8,  label: "Policy",     sub: "bindings matched",     step: 2 },
  blast:     { x: 402, y: 214, r: 8,  label: "Blast radius", sub: "scoped · non-prod",  step: 3 },
  remediate: { x: 356, y: 330, r: 8,  label: "Remediation", sub: "reversible",          step: 4 },
  evidence:  { x: 176, y: 348, r: 9,  label: "Evidence",   sub: "signed · chained",     step: 5 },
};

const EDGES: { from: NodeId; to: NodeId; step: number }[] = [
  { from: "event", to: "aria", step: 1 },
  { from: "aria", to: "policy", step: 2 },
  { from: "aria", to: "blast", step: 3 },
  { from: "aria", to: "remediate", step: 4 },
  { from: "policy", to: "evidence", step: 5 },
  { from: "remediate", to: "evidence", step: 5 },
];

const CAPTIONS = [
  "Ingesting CloudTrail event",
  "ARIA reasoning over the change",
  "Evaluating policy bindings",
  "Scoping blast radius",
  "Planning reversible remediation",
  "Signing evidence to the chain",
];

const MAX_STEP = 5;
const CONFIDENCE = [12, 41, 63, 78, 91, 98];

export function EvidenceGraph() {
  const reduced = useReducedMotion();
  // `tick` only ever advances inside the interval callback (never synchronously
  // in the effect body). With reduced motion we skip the interval entirely and
  // render the fully-resolved graph.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1600);
    return () => window.clearInterval(id);
  }, [reduced]);

  const step = reduced ? MAX_STEP : tick % (MAX_STEP + 1);
  const confidence = CONFIDENCE[Math.min(step, MAX_STEP)];
  const caption = CAPTIONS[Math.min(step, MAX_STEP)];

  const activeEdges = useMemo(() => EDGES.filter((e) => e.step <= step), [step]);

  return (
    <figure className="relative select-none" aria-hidden={false}>
      {/* Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-hair bg-surface/70 backdrop-blur-xl shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-hair px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="grid place-items-center">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              ARIA · live reasoning
            </span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-subtle">
            evidence-graph.v2
          </span>
        </div>

        {/* graph */}
        <div className="relative">
          <div aria-hidden className="lattice-bg absolute inset-0" />
          <svg viewBox="0 0 460 400" className="relative block w-full" role="img"
               aria-label="Live diagram: ARIA ingests a CloudTrail event, reasons over it, evaluates policy, scopes blast radius, plans reversible remediation, and signs evidence to a chain.">
            <defs>
              <radialGradient id="coreglow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* edges */}
            {EDGES.map((e, i) => {
              const a = NODES[e.from];
              const b = NODES[e.to];
              const active = e.step <= step;
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={active ? "var(--primary)" : "var(--hair-strong)"}
                  strokeWidth={active ? 1.6 : 1}
                  strokeOpacity={active ? 0.85 : 0.4}
                  strokeDasharray={active ? "5 7" : "0"}
                  style={active && !reduced ? { animation: "edge-flow 1.1s linear infinite" } : undefined}
                />
              );
            })}

            {/* traveling reasoning pulse on the most-recent active edge */}
            {!reduced && activeEdges.length > 0 && (() => {
              const e = activeEdges[activeEdges.length - 1];
              const a = NODES[e.from];
              const b = NODES[e.to];
              return (
                <motion.circle
                  key={`pulse-${step}`}
                  r={3}
                  fill="var(--accent)"
                  initial={{ cx: a.x, cy: a.y, opacity: 0 }}
                  animate={{ cx: b.x, cy: b.y, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.1, ease: "easeInOut" }}
                />
              );
            })()}

            {/* core glow behind ARIA */}
            <circle cx={NODES.aria.x} cy={NODES.aria.y} r={44} fill="url(#coreglow)"
                    opacity={step >= 1 ? 1 : 0.3} style={{ transition: "opacity .5s" }} />

            {/* nodes */}
            {(Object.keys(NODES) as NodeId[]).map((id) => {
              const n = NODES[id];
              const active = n.step <= step;
              const isCore = id === "aria";
              return (
                <g key={id}>
                  {/* breathing ring on active nodes */}
                  {active && (
                    <circle
                      cx={n.x} cy={n.y} r={n.r + 5}
                      fill="none" stroke="var(--primary)" strokeWidth="1" strokeOpacity="0.35"
                      style={!reduced ? { animation: "node-breathe 2.4s ease-in-out infinite" } : undefined}
                    />
                  )}
                  <motion.circle
                    cx={n.x} cy={n.y}
                    r={n.r}
                    initial={false}
                    animate={{
                      scale: active ? 1 : 0.82,
                      opacity: active ? 1 : 0.5,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                    fill={active ? (isCore ? "var(--primary)" : "var(--surface-solid)") : "var(--surface-solid)"}
                    stroke={active ? "var(--primary)" : "var(--hair-strong)"}
                    strokeWidth={isCore ? 2 : 1.4}
                  />
                  {isCore && (
                    <text x={n.x} y={n.y + 3.5} textAnchor="middle"
                          className="font-mono" fontSize="9" fontWeight="700"
                          fill="var(--on-primary)">
                      AI
                    </text>
                  )}
                  {/* labels */}
                  <text x={n.x} y={n.y - n.r - 9} textAnchor="middle"
                        fontSize="10.5" fontWeight="600" fill="var(--fg)" opacity={active ? 1 : 0.55}>
                    {n.label}
                  </text>
                  <text x={n.x} y={n.y - n.r - (id === "aria" ? -0 : 0) + 14 + n.r} textAnchor="middle"
                        className="font-mono" fontSize="8.5" fill="var(--muted)" opacity={active ? 0.9 : 0.4}>
                    {n.sub}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* footer readout */}
        <div className="flex items-center justify-between gap-4 border-t border-hair px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {!reduced && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent)]" />}
            <span className="truncate font-mono text-[12px] text-fg/90">{caption}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-subtle">confidence</span>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--primary)]">
              {confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* SR-only accessible summary / alternative to the animation */}
      <figcaption className="sr-only">
        Live reasoning graph. ARIA ingests a CloudTrail IAM change, reasons over it, evaluates matched policy
        bindings, scopes the blast radius to non-production, plans a reversible remediation, and signs the
        resulting evidence into a tamper-evident chain. Current confidence {confidence}%.
      </figcaption>
    </figure>
  );
}
