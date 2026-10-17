import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  Frame,
  TriangleBoundary,
  TrustBoundary,
  RadialEight,
  ExecutionRail,
  PolicyGate,
  LifecycleSpine,
  ProjectionGrid,
  DomainNode,
  EvidenceNode,
  EvidenceEdge,
  ConnectionPort,
  SignalNode,
  ObservationNode,
  ControlNode,
  AssertionNode,
  radialArmTips,
  evenStops,
} from "@/app/components/geometry";

/**
 * GEOMETRY PLAYGROUND — the verification surface (Phase 2.5).
 * Renders every primitive individually + key compositions. No animation, no
 * interaction, no color beyond inherited `currentColor`. Purpose: visual
 * regression, composition/responsive/accessibility verification.
 *
 * Dev-only: 404s in production so it never ships as a public route.
 */
export const metadata = { title: "Geometry Playground", robots: { index: false } };

function Fig({
  title,
  label,
  children,
}: {
  title: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <figure style={{ margin: 0, border: "1px solid currentColor", borderRadius: 4, padding: 12 }}>
      <div style={{ width: "100%", aspectRatio: "1 / 1", display: "grid", placeItems: "center" }}>
        {children}
      </div>
      <figcaption
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.02em",
          opacity: 0.7,
        }}
      >
        {title}
        <span className="sr-only"> — {label}</span>
      </figcaption>
    </figure>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 16,
  marginTop: 16,
};
const svg: React.CSSProperties = { width: "100%", height: "auto" };

export default function GeometryPlayground() {
  if (process.env.NODE_ENV === "production") notFound();

  const tips = radialArmTips(0, 0, 78);
  const chain = [-110, 0, 110];

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        color: "var(--fg)",
        background: "var(--substrate)",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Geometry Playground · currentColor only
      </h1>

      {/* ── Individual primitives ─────────────────────────────────────────── */}
      <section aria-label="Individual primitives">
        <div style={grid}>
          <Fig title="TriangleBoundary · up" label="Equilateral trust boundary, apex up">
            <Frame width={160} height={160} centered padding={12} role="img" aria-label="Equilateral triangle boundary, apex up" style={svg}>
              <TriangleBoundary size={70} />
            </Frame>
          </Fig>
          <Fig title="TriangleBoundary · down" label="Equilateral trust boundary, apex down">
            <Frame width={160} height={160} centered padding={12} role="img" aria-label="Equilateral triangle boundary, apex down" style={svg}>
              <TriangleBoundary size={70} orientation="down" />
            </Frame>
          </Fig>
          <Fig title="TrustBoundary · vertical + ticks" label="Sovereign divider, vertical with graticule ticks">
            <Frame width={160} height={160} centered padding={12} role="img" aria-label="Vertical trust boundary with ticks" style={svg}>
              <TrustBoundary length={120} angle={0} ticks={5} />
            </Frame>
          </Fig>
          <Fig title="TrustBoundary · 60° brand angle" label="Sovereign divider at the 60 degree brand framing angle">
            <Frame width={160} height={160} centered padding={12} role="img" aria-label="Trust boundary at 60 degrees" style={svg}>
              <TrustBoundary length={120} angle={60} />
            </Frame>
          </Fig>
          <Fig title="RadialEight" label="Control plane core with eight arms at 45 degrees">
            <Frame width={200} height={200} centered padding={10} role="img" aria-label="Radial eight-arm control plane" style={svg}>
              <RadialEight radius={82} coreRadius={14} />
            </Frame>
          </Fig>
          <Fig title="RadialEight · curl" label="Control plane with curled arm tips">
            <Frame width={200} height={200} centered padding={10} role="img" aria-label="Radial eight-arm control plane with curls" style={svg}>
              <RadialEight radius={82} coreRadius={14} curl />
            </Frame>
          </Fig>
          <Fig title="ExecutionRail · 3 stages" label="Deterministic pipeline rail with three stage detents">
            <Frame width={200} height={160} centered padding={10} role="img" aria-label="Execution rail with three stages" style={svg}>
              <ExecutionRail length={150} stages={3} />
            </Frame>
          </Fig>
          <Fig title="PolicyGate · open" label="Policy gate open, pass">
            <Frame width={120} height={120} centered padding={10} role="img" aria-label="Policy gate open" style={svg}>
              <PolicyGate open aperture={28} postLength={22} />
            </Frame>
          </Fig>
          <Fig title="PolicyGate · shut" label="Policy gate shut, fail or halt">
            <Frame width={120} height={120} centered padding={10} role="img" aria-label="Policy gate shut" style={svg}>
              <PolicyGate open={false} aperture={28} postLength={22} />
            </Frame>
          </Fig>
          <Fig title="LifecycleSpine · 10 beats" label="Ten-beat narrative spine, the you-are-here track">
            <Frame width={320} height={80} centered padding={10} role="img" aria-label="Ten-beat lifecycle spine" style={svg}>
              <LifecycleSpine length={280} beats={10} />
            </Frame>
          </Fig>
          <Fig title="ProjectionGrid" label="Graticule coordinate face">
            <Frame width={160} height={160} padding={4} aria-hidden style={svg}>
              <ProjectionGrid width={160} height={160} cell={20} />
            </Frame>
          </Fig>
          <Fig title="DomainNode · ports" label="Execution domain with four connection ports">
            <Frame width={120} height={120} centered padding={12} role="img" aria-label="Domain node with ports" style={svg}>
              <DomainNode size={48} ports={["n", "e", "s", "w"]} />
            </Frame>
          </Fig>
          <Fig title="EvidenceNode" label="Signed evidence block with hash-link notch">
            <Frame width={120} height={120} centered padding={12} role="img" aria-label="Evidence block" style={svg}>
              <EvidenceNode w={64} h={44} notch={12} />
            </Frame>
          </Fig>
          <Fig title="EvidenceEdge · octilinear" label="Connection routed at 45 and 90 degrees">
            <Frame width={160} height={120} centered padding={12} role="img" aria-label="Octilinear evidence edge" style={svg}>
              <EvidenceEdge from={{ x: -60, y: -30 }} to={{ x: 60, y: 30 }} />
            </Frame>
          </Fig>
          <Fig title="ConnectionPort" label="Anchor ring with a direction stub">
            <Frame width={100} height={100} centered padding={12} role="img" aria-label="Connection port" style={svg}>
              <ConnectionPort radius={5} stub={18} direction="e" />
            </Frame>
          </Fig>
          <Fig title="SignalNode" label="Signal graph node, directional triangle">
            <Frame width={80} height={80} centered padding={12} role="img" aria-label="Signal node" style={svg}>
              <SignalNode size={20} />
            </Frame>
          </Fig>
          <Fig title="ObservationNode" label="Observation graph node, aperture">
            <Frame width={80} height={80} centered padding={12} role="img" aria-label="Observation node" style={svg}>
              <ObservationNode size={18} />
            </Frame>
          </Fig>
          <Fig title="ControlNode" label="Control graph node, framed square with bar">
            <Frame width={80} height={80} centered padding={12} role="img" aria-label="Control node" style={svg}>
              <ControlNode size={34} />
            </Frame>
          </Fig>
          <Fig title="AssertionNode" label="Assertion graph node, diamond">
            <Frame width={80} height={80} centered padding={12} role="img" aria-label="Assertion node" style={svg}>
              <AssertionNode size={22} />
            </Frame>
          </Fig>
        </div>
      </section>

      {/* ── Compositions ──────────────────────────────────────────────────── */}
      <h2 style={{ marginTop: 32, fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>
        Compositions
      </h2>
      <div style={grid}>
        <Fig title="Control-plane schematic" label="Trust boundary, control plane, eight domains on the graticule">
          <Frame width={220} height={220} centered padding={12} role="img" aria-label="Control plane reaching eight execution domains inside a trust boundary" style={svg}>
            <ProjectionGrid width={220} height={220} originX={-110} originY={-110} cell={22} style={{ opacity: 0.25 }} />
            <TriangleBoundary size={104} style={{ opacity: 0.5 }} />
            <RadialEight radius={78} coreRadius={13} curl />
            {tips.map((t, i) => (
              <DomainNode key={i} cx={t.x} cy={t.y} size={16} />
            ))}
          </Frame>
        </Fig>
        <Fig title="Evidence chain" label="Three signed evidence blocks threaded by hash-link edges">
          <Frame width={320} height={80} centered padding={10} role="img" aria-label="Signed hash-linked evidence chain" style={svg}>
            {chain.map((x) => (
              <EvidenceNode key={x} cx={x} cy={0} w={64} h={44} notch={12} />
            ))}
            <EvidenceEdge from={{ x: chain[0] + 32, y: 0 }} to={{ x: chain[1] - 32, y: 0 }} />
            <EvidenceEdge from={{ x: chain[1] + 32, y: 0 }} to={{ x: chain[2] - 32, y: 0 }} />
          </Frame>
        </Fig>
        <Fig title="Pipeline + gates" label="Execution rail with a policy gate at each stage">
          <Frame width={260} height={120} centered padding={12} role="img" aria-label="Deterministic pipeline with policy gates" style={svg}>
            <ExecutionRail length={200} stages={3} />
            {evenStops({ x: -100, y: 0 }, { x: 100, y: 0 }, 3).map((s, i) => (
              <PolicyGate key={i} cx={s.x} cy={s.y} open={i !== 1} aperture={22} postLength={26} />
            ))}
          </Frame>
        </Fig>
        <Fig title="Typed graph nodes" label="The five Evidence Graph node types, distinguished by silhouette">
          <Frame width={300} height={80} centered padding={10} role="img" aria-label="Signal, Observation, Control, Assertion, Evidence node glyphs" style={svg}>
            <SignalNode cx={-120} cy={0} size={16} />
            <ObservationNode cx={-60} cy={0} size={14} />
            <ControlNode cx={0} cy={0} size={28} />
            <AssertionNode cx={60} cy={0} size={18} />
            <EvidenceNode cx={120} cy={0} w={44} h={30} notch={8} />
          </Frame>
        </Fig>
        <Fig title="Lifecycle spine" label="Ten-beat spine with the you-are-here track">
          <Frame width={320} height={60} centered padding={10} role="img" aria-label="Ten beat lifecycle spine" style={svg}>
            <LifecycleSpine length={280} beats={10} nodeRadius={4} />
          </Frame>
        </Fig>
      </div>
    </main>
  );
}
