"use client";

import type { ReactNode } from "react";
import { Frame } from "@/app/components/geometry";
import {
  TrustBoundary,
  PolicyGate,
  ExecutionRail,
  LifecycleSpine,
  EvidenceChain,
  DomainTopology,
  CloudControlPlane,
  EvidenceTimeline,
  VerificationPanel,
  ReplayTimeline,
  AutonomousRemediationView,
} from "@/app/components/product";
import { OperationalState, EvidenceState } from "@/lib/contracts/state";
import { Beat } from "@/lib/contracts/narrative";

/**
 * PRODUCT PLAYGROUND / storybook (Phase: Feature Complete). Renders every product
 * component, then the Autonomous Remediation reference. Dev-only (hidden in prod).
 */
const DOMAINS = [
  { label: "aws", state: OperationalState.Nominal },
  { label: "azure", state: OperationalState.Advisory },
  { label: "gcp", state: OperationalState.Engaged },
  { label: "k8s", state: OperationalState.Nominal },
  { label: "edge", state: OperationalState.Halt },
];

const svg: React.CSSProperties = { width: "100%", height: "auto" };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="m-0 rounded-panel border border-graticule p-3">
      <figcaption className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-bone-muted">{title}</figcaption>
      {children}
    </figure>
  );
}

export default function ProductPlayground() {
  if (process.env.NODE_ENV === "production") {
    return <main className="p-6 text-fg">Not available in production.</main>;
  }
  return (
    <main className="mx-auto min-h-screen max-w-[1200px] bg-substrate p-6 text-bone">
      <h1 className="font-mono text-sm uppercase tracking-[0.14em]">Product Components · Feature Complete v1</h1>

      <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        <Card title="TrustBoundary">
          <Frame width={200} height={200} centered padding={16} role="img" aria-label="Trust boundary" style={svg}>
            <TrustBoundary length={150} />
          </Frame>
        </Card>
        <Card title="PolicyGate (nominal / halt)">
          <Frame width={160} height={120} centered role="img" aria-label="Policy gates" style={svg}>
            <PolicyGate cx={-40} state={OperationalState.Nominal} />
            <PolicyGate cx={40} state={OperationalState.Halt} />
          </Frame>
        </Card>
        <Card title="ExecutionRail">
          <Frame width={200} height={140} centered role="img" aria-label="Execution rail" style={svg}>
            <ExecutionRail length={150} stages={4} />
          </Frame>
        </Card>
        <Card title="DomainTopology">
          <Frame width={220} height={220} centered role="img" aria-label="Domain topology" style={svg}>
            <DomainTopology radius={80} domains={DOMAINS} />
          </Frame>
        </Card>
        <Card title="CloudControlPlane">
          <Frame width={240} height={240} centered role="img" aria-label="Cloud control plane" style={svg}>
            <CloudControlPlane size={100} domains={DOMAINS} />
          </Frame>
        </Card>
        <Card title="EvidenceChain (0..1 sealed, 0 verified)">
          <Frame width={320} height={80} centered role="img" aria-label="Evidence chain" style={svg}>
            <EvidenceChain count={3} sealedUpTo={1} verifiedUpTo={0} />
          </Frame>
        </Card>
        <Card title="LifecycleSpine (current = beat 5)">
          <Frame width={340} height={60} centered role="img" aria-label="Lifecycle spine" style={svg}>
            <LifecycleSpine length={300} progress={{ mode: "live", current: Beat.PolicyDecision, skipped: [] }} />
          </Frame>
        </Card>
        <Card title="EvidenceTimeline">
          <EvidenceTimeline
            records={[
              { id: "ev-001", label: "observation ingested", state: EvidenceState.Verified },
              { id: "ev-002", label: "remediation applied", state: EvidenceState.Sealed },
              { id: "ev-003", label: "reverted", state: EvidenceState.Unsigned },
            ]}
          />
        </Card>
        <Card title="VerificationPanel (sound)">
          <VerificationPanel links={3} />
        </Card>
        <Card title="VerificationPanel (tampered @1)">
          <VerificationPanel links={3} breakAt={1} />
        </Card>
        <Card title="ReplayTimeline">
          <ReplayTimeline />
        </Card>
      </div>

      <h2 className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-bone-muted">
        Reference · Autonomous Remediation
      </h2>
      <div className="mt-3">
        <AutonomousRemediationView />
      </div>
    </main>
  );
}
