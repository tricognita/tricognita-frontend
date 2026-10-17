"use client";

import { useState } from "react";
import { Frame } from "@/app/components/geometry";
import {
  CloudControlPlane,
  LifecycleSpine,
  EvidenceChain,
  VerificationPanel,
  EvidenceTimeline,
  ReplayTimeline,
} from "@/app/components/product";
import { ALL_SCENARIOS, SCENARIOS_BY_ID } from "@/lib/mock";

/**
 * SCENARIO VALIDATION — renders each deterministic Mock Runtime dataset through the
 * product components. Proves the frontend works with realistic production data.
 * Dev-only.
 */
const svg: React.CSSProperties = { width: "100%", height: "auto" };
const clamp = (n: number, max: number) => Math.min(n, max);

export default function ScenariosPage() {
  const [id, setId] = useState(ALL_SCENARIOS[0].id);
  if (process.env.NODE_ENV === "production") return <main className="p-6 text-fg">Not available in production.</main>;

  const s = SCENARIOS_BY_ID[id];
  const chainCount = clamp(s.evidence.count, 12);

  return (
    <main className="mx-auto min-h-screen max-w-[1000px] bg-substrate p-6 text-bone">
      <h1 className="font-mono text-sm uppercase tracking-[0.14em]">Scenario validation · Mock Runtime</h1>

      <label className="mt-4 flex items-center gap-3 font-mono text-xs">
        <span className="uppercase tracking-[0.1em] text-bone-muted">Dataset</span>
        <select value={id} onChange={(e) => setId(e.target.value)} className="rounded-panel border border-graticule bg-panel px-2 py-1 text-bone">
          {ALL_SCENARIOS.map((sc) => (
            <option key={sc.id} value={sc.id}>{sc.title}</option>
          ))}
        </select>
        <span className="text-bone-muted">outcome: {s.outcome} · {s.evidence.count} evidence · {s.domains.length} domains</span>
      </label>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <figure className="m-0 rounded-panel border border-graticule p-3">
          <figcaption className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-bone-muted">Cloud control plane</figcaption>
          <Frame width={240} height={240} centered role="img" aria-label="Control plane for scenario" style={svg}>
            <CloudControlPlane size={100} domains={s.domains.slice(0, 8)} />
          </Frame>
        </figure>

        <figure className="m-0 rounded-panel border border-graticule p-3">
          <figcaption className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-bone-muted">Evidence chain + lifecycle spine</figcaption>
          <Frame width={chainCount * 92} height={80} centered role="img" aria-label="Evidence chain" style={svg}>
            <EvidenceChain count={chainCount} sealedUpTo={clamp(s.evidence.sealedUpTo, chainCount - 1)} verifiedUpTo={clamp(s.evidence.verifiedUpTo, chainCount - 1)} archived={s.evidence.archived} />
          </Frame>
          <Frame width={320} height={50} centered role="img" aria-label="Lifecycle spine" style={svg}>
            <LifecycleSpine length={300} progress={{ mode: s.narrative.archived ? "archived" : "live", current: s.narrative.current, skipped: s.narrative.skipped }} />
          </Frame>
        </figure>

        <figure className="m-0 rounded-panel border border-graticule p-3">
          <figcaption className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-bone-muted">Verification</figcaption>
          <VerificationPanel links={clamp(s.verification.links, 6)} breakAt={s.verification.breakAt} />
        </figure>

        <figure className="m-0 rounded-panel border border-graticule p-3">
          <figcaption className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-bone-muted">Evidence timeline</figcaption>
          <EvidenceTimeline records={s.timeline.slice(0, 8)} />
          <div className="mt-3"><ReplayTimeline skipped={s.narrative.skipped} /></div>
        </figure>
      </div>
    </main>
  );
}
