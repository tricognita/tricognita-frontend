"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  Frame,
  TriangleBoundary,
  RadialEight,
  DomainNode,
  EvidenceNode,
  EvidenceEdge,
  PolicyGate,
  LifecycleSpine,
  SignalNode,
  ObservationNode,
  ControlNode,
  AssertionNode,
  radialArmTips,
} from "@/app/components/geometry";
import {
  flowSignal,
  drawEvidence,
  snapState,
  sealBlock,
  verifyChain,
  replayProjection,
  retraceRollback,
  archiveBeat,
  bootSequence,
  orderedMotion,
} from "@/lib/motion";
import { OperationalState, EvidenceState } from "@/lib/contracts/state";
import { Beat, BEATS } from "@/lib/contracts/narrative";

/**
 * MOTION PLAYGROUND (Phase 3, Step 2 verification). Every primitive individually,
 * then composed into the Autonomous Remediation reference narrative. Dev-only:
 * this route 404s in production. Motion honors prefers-reduced-motion automatically.
 */

const q = (host: HTMLElement | null, sel: string) => host?.querySelector<SVGElement>(sel) ?? null;
const qa = (host: HTMLElement | null, sel: string) =>
  Array.from(host?.querySelectorAll<SVGElement>(sel) ?? []);

const centered: React.CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };
const svg: React.CSSProperties = { width: "100%", height: "auto" };

function Specimen({
  title,
  children,
  onReplay,
}: {
  title: string;
  children: ReactNode;
  onReplay: (host: HTMLDivElement) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  return (
    <figure style={{ margin: 0, border: "1px solid currentColor", borderRadius: 4, padding: 12 }}>
      <div ref={host} style={{ aspectRatio: "1 / 1", display: "grid", placeItems: "center" }}>
        {children}
      </div>
      <figcaption style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.8 }}>
        <span>{title}</span>
        <button
          type="button"
          onClick={() => host.current && onReplay(host.current)}
          className="focus-ring"
          style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", border: "1px solid currentColor", borderRadius: 2, padding: "2px 8px", background: "transparent", color: "inherit", cursor: "pointer" }}
        >
          Replay
        </button>
      </figcaption>
    </figure>
  );
}

export default function MotionPlayground() {
  if (process.env.NODE_ENV === "production") {
    return <main style={{ padding: 24, color: "var(--fg)" }}>Not available in production.</main>;
  }
  return <Playground />;
}

function Playground() {
  const tips = radialArmTips(0, 0, 78);
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24, color: "var(--fg)", background: "var(--substrate)", minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Motion Playground · engineering motion
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16, marginTop: 16 }}>
        <Specimen title="flowSignal" onReplay={(h) => flowSignal(q(h, "[data-geo=evidence-edge] path"), { path: { from: { x: -60, y: 0 }, to: { x: 60, y: 0 } } })}>
          <Frame width={160} height={80} centered role="img" aria-label="flowSignal specimen" style={svg}>
            <EvidenceEdge from={{ x: -60, y: 0 }} to={{ x: 60, y: 0 }} />
          </Frame>
        </Specimen>

        <Specimen title="drawEvidence" onReplay={(h) => drawEvidence(q(h, "[data-geo=evidence-edge] path"))}>
          <Frame width={160} height={100} centered role="img" aria-label="drawEvidence specimen" style={svg}>
            <EvidenceEdge from={{ x: -60, y: -30 }} to={{ x: 60, y: 30 }} />
          </Frame>
        </Specimen>

        <Specimen title="snapState" onReplay={(h) => snapState(q(h, "[data-geo=domain-node]"), { from: OperationalState.Nominal, to: OperationalState.Engaged })}>
          <Frame width={120} height={120} centered role="img" aria-label="snapState specimen" style={svg}>
            <DomainNode size={48} style={centered} />
          </Frame>
        </Specimen>

        <Specimen title="sealBlock" onReplay={(h) => sealBlock(q(h, "[data-geo=evidence-node]"))}>
          <Frame width={120} height={120} centered role="img" aria-label="sealBlock specimen" style={svg}>
            <EvidenceNode w={64} h={44} notch={12} style={centered} />
          </Frame>
        </Specimen>

        <Specimen title="verifyChain" onReplay={(h) => verifyChain(qa(h, "[data-geo=evidence-node]"), { links: 3 })}>
          <Frame width={300} height={80} centered role="img" aria-label="verifyChain specimen" style={svg}>
            {[-100, 0, 100].map((x) => (
              <EvidenceNode key={x} cx={x} cy={0} w={56} h={40} notch={10} style={centered} />
            ))}
          </Frame>
        </Specimen>

        <Specimen title="replayProjection" onReplay={(h) => replayProjection(qa(h, "[data-geo$=-node]"), { eventCount: 4 })}>
          <Frame width={300} height={80} centered role="img" aria-label="replayProjection specimen" style={svg}>
            <SignalNode cx={-105} cy={0} size={14} style={centered} />
            <ObservationNode cx={-35} cy={0} size={13} style={centered} />
            <ControlNode cx={35} cy={0} size={26} style={centered} />
            <AssertionNode cx={105} cy={0} size={16} style={centered} />
          </Frame>
        </Specimen>

        <Specimen
          title="retraceRollback"
          onReplay={(h) => {
            const edges = qa(h, "[data-geo=evidence-edge] path");
            retraceRollback({ path: edges[0], revertedEdge: edges[1] }, { executedPath: { from: { x: -70, y: 0 }, to: { x: 70, y: 0 } } });
          }}
        >
          <Frame width={180} height={100} centered role="img" aria-label="retraceRollback specimen" style={svg}>
            <EvidenceEdge from={{ x: -70, y: -18 }} to={{ x: 70, y: -18 }} />
            <EvidenceEdge from={{ x: -70, y: 18 }} to={{ x: 70, y: 18 }} />
          </Frame>
        </Specimen>

        <Specimen title="archiveBeat" onReplay={(h) => archiveBeat(q(h, "[data-geo=evidence-node]"))}>
          <Frame width={120} height={120} centered role="img" aria-label="archiveBeat specimen" style={svg}>
            <EvidenceNode w={64} h={44} notch={12} style={centered} />
          </Frame>
        </Specimen>

        <Specimen
          title="bootSequence"
          onReplay={(h) =>
            bootSequence({
              boundary: q(h, "[data-geo=triangle-boundary]"),
              core: q(h, "[data-geo=radial-eight] path"),
              arms: qa(h, "[data-geo=radial-eight] [data-arm]"),
              status: q(h, "[data-geo=domain-node]"),
            })
          }
        >
          <Frame width={200} height={200} centered role="img" aria-label="bootSequence specimen" style={svg}>
            <TriangleBoundary size={92} style={centered} />
            <RadialEight radius={72} coreRadius={12} style={centered} />
            <DomainNode cx={0} cy={92} size={14} style={centered} />
          </Frame>
        </Specimen>
      </div>

      <ReferenceNarrative tips={tips} />
    </main>
  );
}

/* ── The Autonomous Remediation reference narrative (composition) ─────────────── */

function ReferenceNarrative({ tips }: { tips: { x: number; y: number }[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [running, setRunning] = useState(false);
  const target = tips[2]; // one domain we act on

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function run() {
    const h = host.current;
    if (!h || running) return;
    setRunning(true);
    // orderedMotion drives the label sequence; the body plays the matching motion.
    for (const step of orderedMotion()) {
      setBeat(step.beat);
      switch (step.beat) {
        case Beat.Observation:
          await flowSignal(q(h, "[data-role=observe] path"), { path: { from: target, to: { x: 0, y: 0 } } }).finished;
          break;
        case Beat.DeterministicEvaluation:
          await snapState(q(h, "[data-role=core]"), { from: OperationalState.Nominal, to: OperationalState.Engaged }).finished;
          break;
        case Beat.PolicyDecision:
          await snapState(q(h, "[data-role=gate]"), { from: OperationalState.Advisory, to: OperationalState.Engaged }).finished;
          break;
        case Beat.AutonomousExecution:
          await flowSignal(q(h, "[data-role=execute] path"), { path: { from: { x: 0, y: 0 }, to: target } }).finished;
          await snapState(q(h, "[data-role=domain]"), { from: OperationalState.Nominal, to: OperationalState.Engaged }).finished;
          break;
        case Beat.EvidenceGeneration:
          await drawEvidence(q(h, "[data-role=evidence-edge] path")).finished;
          await sealBlock(q(h, "[data-role=evidence]")).finished;
          break;
        case Beat.Verification:
          await verifyChain(qa(h, "[data-role=chain] [data-geo=evidence-node]"), { links: 3 }).finished;
          break;
        case Beat.FinalArchivedState:
          await archiveBeat(q(h, "[data-role=chain]")).finished;
          break;
      }
      await wait(120);
    }
    setBeat(null);
    setRunning(false);
  }

  async function rollback() {
    const h = host.current;
    if (!h || running) return;
    setRunning(true);
    setBeat(Beat.RollbackPath);
    await retraceRollback(
      { path: q(h, "[data-role=execute] path"), revertedEdge: q(h, "[data-role=evidence-edge] path") },
      { executedPath: { from: { x: 0, y: 0 }, to: target } },
    ).finished;
    await snapState(q(h, "[data-role=domain]"), { from: OperationalState.Engaged, to: OperationalState.Reverted }).finished;
    setBeat(null);
    setRunning(false);
  }

  return (
    <section style={{ marginTop: 32 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, margin: 0 }}>
          Reference narrative · Autonomous Remediation
        </h2>
        <button type="button" onClick={run} disabled={running} className="focus-ring" style={btn}>Run</button>
        <button type="button" onClick={rollback} disabled={running} className="focus-ring" style={btn}>Rollback</button>
        <span aria-live="polite" style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.9 }}>
          {beat ? `${BEATS[beat].ordinal}. ${BEATS[beat].key} — ${BEATS[beat].question}` : "idle"}
        </span>
      </div>

      <div ref={host} style={{ marginTop: 12, maxWidth: 520 }}>
        <Frame width={360} height={300} centered role="img" aria-label="Autonomous Remediation reference narrative" style={svg}>
          <TriangleBoundary size={140} style={{ ...centered, opacity: 0.5 }} />
          <RadialEight data-role="core" radius={96} coreRadius={14} curl style={centered} />
          {tips.map((t, i) => (
            <DomainNode key={i} data-role={i === 2 ? "domain" : undefined} cx={t.x * 1.15} cy={t.y * 1.15} size={16} style={centered} />
          ))}
          <PolicyGate data-role="gate" cx={0} cy={-70} open aperture={22} postLength={20} style={centered} />
          {/* observation inbound + execution outbound to the acted domain */}
          <EvidenceEdge data-role="observe" from={{ x: target.x * 1.15, y: target.y * 1.15 }} to={{ x: 0, y: 0 }} />
          <EvidenceEdge data-role="execute" from={{ x: 0, y: 0 }} to={{ x: target.x * 1.15, y: target.y * 1.15 }} />
          {/* evidence chain below */}
          <g data-role="chain" style={centered}>
            <EvidenceEdge data-role="evidence-edge" from={{ x: -70, y: 120 }} to={{ x: -14, y: 120 }} />
            {[-100, -20, 60].map((x, i) => (
              <EvidenceNode key={x} data-role={i === 0 ? "evidence" : undefined} cx={x} cy={120} w={48} h={32} notch={8} style={centered} />
            ))}
          </g>
          <LifecycleSpine cx={0} cy={-120} length={300} beats={10} nodeRadius={3} style={{ opacity: 0.6 }} />
        </Frame>
      </div>
    </section>
  );
}

const btn: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  border: "1px solid currentColor",
  borderRadius: 2,
  padding: "4px 12px",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};
