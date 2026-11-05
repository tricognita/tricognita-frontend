"use client";

import { useRef, useState } from "react";
import { Frame, EvidenceEdge, radialArmTips } from "@/app/components/geometry";
import {
  flowSignal,
  drawEvidence,
  snapState,
  sealBlock,
  verifyChain,
  archiveBeat,
  retraceRollback,
  orderedMotion,
} from "@/lib/motion";
import { Beat, BEATS, type NarrativeProgress } from "@/lib/contracts/narrative";
import { OperationalState } from "@/lib/contracts/state";
import { CloudControlPlane } from "./CloudControlPlane";
import { PolicyGate } from "./PolicyGate";
import { EvidenceChain } from "./EvidenceChain";
import { LifecycleSpine } from "./LifecycleSpine";

/**
 * AutonomousRemediationView — THE reference implementation: one complete workflow,
 * Observation → Evaluation → Policy → Execution → Evidence → Verification →
 * Rollback → Archive. Composes CloudControlPlane + PolicyGate + EvidenceChain +
 * LifecycleSpine and drives the ten beats with the Motion Engine, honoring the
 * Narrative + State contracts. This is the canonical Tricognita engineering
 * experience; every other capability inherits this template.
 *
 * PUBLIC API: no required props (self-contained demo of the workflow).
 * COMPOSITION: consumes only geometry + motion + contracts (+ product components
 * built from them). RESPONSIVE: the Frame scales; controls wrap. ACCESSIBILITY:
 * an aria-live beat readout (what/why), keyboard-operable controls, reduced-motion
 * safe (motion renders truthful final state). PERFORMANCE: one animation per real
 * event; nothing decorative moves.
 */
const DOMAINS = [
  { label: "aws", state: OperationalState.Nominal },
  { label: "azure", state: OperationalState.Nominal },
  { label: "gcp", state: OperationalState.Nominal },
  { label: "k8s", state: OperationalState.Nominal },
  { label: "edge", state: OperationalState.Nominal },
] as const;

const CP = { cx: 0, cy: -34, size: 104 };
const REACH = CP.size * 0.82;
const ACTED = 2; // the domain we remediate

export function AutonomousRemediationView() {
  const host = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<Beat | null>(null);
  const [sealedUpTo, setSealedUpTo] = useState(-1);
  const [verifiedUpTo, setVerifiedUpTo] = useState(-1);
  const [archived, setArchived] = useState(false);
  const [ran, setRan] = useState(false);
  const [busy, setBusy] = useState(false);

  const progress: NarrativeProgress = { mode: archived ? "archived" : "live", current, skipped: [] };
  const tips = radialArmTips(CP.cx, CP.cy, REACH, DOMAINS.length);
  const acted = tips[ACTED];

  const q = (sel: string) => host.current?.querySelector<SVGElement>(sel) ?? null;
  const qa = (sel: string) => Array.from(host.current?.querySelectorAll<SVGElement>(sel) ?? []);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function run() {
    if (busy) return;
    setBusy(true);
    setArchived(false);
    setSealedUpTo(-1);
    setVerifiedUpTo(-1);
    for (const step of orderedMotion()) {
      setCurrent(step.beat);
      switch (step.beat) {
        case Beat.Observation:
          await flowSignal(q("[data-role=observe] path"), { path: { from: acted, to: { x: CP.cx, y: CP.cy } } }).finished;
          break;
        case Beat.DeterministicEvaluation:
          await snapState(q("[data-role=core]"), { from: OperationalState.Nominal, to: OperationalState.Engaged }).finished;
          break;
        case Beat.PolicyDecision:
          await snapState(q("[data-role=gate]"), { from: OperationalState.Advisory, to: OperationalState.Engaged }).finished;
          break;
        case Beat.AutonomousExecution:
          await flowSignal(q("[data-role=execute] path"), { path: { from: { x: CP.cx, y: CP.cy }, to: acted } }).finished;
          await snapState(q(`[data-role=domain-${ACTED}]`), { from: OperationalState.Nominal, to: OperationalState.Engaged }).finished;
          break;
        case Beat.EvidenceGeneration:
          await drawEvidence(q("[data-role=edge-0] path")).finished;
          await drawEvidence(q("[data-role=edge-1] path")).finished;
          for (const node of qa("[data-geo=product-evidence-chain] [data-geo=evidence-node]")) {
            await sealBlock(node).finished;
          }
          setSealedUpTo(2);
          break;
        case Beat.Verification:
          await verifyChain(qa("[data-geo=product-evidence-chain] [data-geo=evidence-node]"), { links: 3 }).finished;
          setVerifiedUpTo(2);
          break;
        case Beat.FinalArchivedState:
          await archiveBeat(q("[data-geo=product-evidence-chain]")).finished;
          setArchived(true);
          break;
      }
      await wait(140);
    }
    setCurrent(null);
    setRan(true);
    setBusy(false);
  }

  async function rollback() {
    if (busy || !ran) return;
    setBusy(true);
    setCurrent(Beat.RollbackPath);
    // Retrace the exact execution path; APPEND a reverted record (never delete).
    await retraceRollback(
      { path: q("[data-role=execute] path"), revertedEdge: q("[data-role=edge-1] path") },
      { executedPath: { from: { x: CP.cx, y: CP.cy }, to: acted } },
    ).finished;
    await snapState(q(`[data-role=domain-${ACTED}]`), { from: OperationalState.Engaged, to: OperationalState.Reverted }).finished;
    setCurrent(null);
    setBusy(false);
  }

  return (
    <div className="text-bone">
      <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-xs">
        <button type="button" onClick={run} disabled={busy} className="focus-ring rounded-panel border border-graticule px-3 py-1 uppercase tracking-[0.1em] hover:border-bone-muted disabled:opacity-45">
          Run remediation
        </button>
        <button type="button" onClick={rollback} disabled={busy || !ran} className="focus-ring rounded-panel border border-graticule px-3 py-1 uppercase tracking-[0.1em] hover:border-bone-muted disabled:opacity-45">
          Rollback
        </button>
        <span aria-live="polite" className="text-bone-muted">
          {current ? `${BEATS[current].ordinal}. ${BEATS[current].key} — ${BEATS[current].question}` : archived ? "archived · all systems nominal" : "idle"}
        </span>
      </div>

      <div ref={host} className="max-w-[560px]">
        <Frame width={360} height={420} centered role="img" aria-label="Autonomous Remediation: a control plane observing, deciding, executing, proving, and archiving" style={{ width: "100%", height: "auto" }}>
          <CloudControlPlane cx={CP.cx} cy={CP.cy} size={CP.size} domains={DOMAINS} />
          <PolicyGate cx={CP.cx} cy={CP.cy - CP.size - 18} state={OperationalState.Nominal} />
          <EvidenceEdge data-role="observe" from={acted} to={{ x: CP.cx, y: CP.cy }} className="text-advisory" />
          <EvidenceEdge data-role="execute" from={{ x: CP.cx, y: CP.cy }} to={acted} className="text-engaged" />
          <EvidenceChain cx={0} cy={120} count={3} sealedUpTo={sealedUpTo} verifiedUpTo={verifiedUpTo} archived={archived} />
          <LifecycleSpine cx={0} cy={180} length={300} progress={progress} />
        </Frame>
      </div>
    </div>
  );
}
