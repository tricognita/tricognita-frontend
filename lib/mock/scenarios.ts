/**
 * MOCK RUNTIME — deterministic datasets representing real executions.
 * Pure data (no React, no rendering, no network). Every scenario is reproducible:
 * the same inputs always yield the same dataset (determinism is the product thesis).
 * These feed the product components with realistic production-shaped data so the
 * frontend is validated before any cloud provider is integrated.
 *
 * Relative imports so the tsx test runner resolves the contract values.
 */
import { Beat } from "../contracts/narrative";
import { OperationalState, EvidenceState } from "../contracts/state";

export type Outcome =
  | "success"
  | "denied"
  | "verification-failure"
  | "rolled-back"
  | "archived"
  | "partial"
  | "interrupted";

/** A cloud execution domain (structurally compatible with product DomainSpec). */
export interface DomainDatum {
  readonly label: string;
  readonly state: OperationalState;
  readonly cloud: "aws" | "azure" | "gcp" | "k8s" | "edge";
  readonly account: string;
}

/** An evidence ledger row (structurally compatible with product EvidenceRecord). */
export interface EvidenceRow {
  readonly id: string;
  readonly label: string;
  readonly state: EvidenceState;
}

/** A complete, deterministic execution dataset — exercises every component. */
export interface Scenario {
  readonly id: string;
  readonly title: string;
  readonly outcome: Outcome;
  /** LifecycleSpine / ReplayTimeline. */
  readonly narrative: { readonly current: Beat | null; readonly skipped: readonly Beat[]; readonly archived: boolean };
  /** EvidenceChain. */
  readonly evidence: { readonly count: number; readonly sealedUpTo: number; readonly verifiedUpTo: number; readonly archived: boolean };
  /** VerificationPanel (breakAt !== null = tampered/corrupt). */
  readonly verification: { readonly links: number; readonly breakAt: number | null };
  /** CloudControlPlane / DomainTopology. */
  readonly domains: readonly DomainDatum[];
  /** EvidenceTimeline. */
  readonly timeline: readonly EvidenceRow[];
}

/** Deterministic PRNG (mulberry32) — seeded so datasets are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLOUDS = ["aws", "azure", "gcp", "k8s", "edge"] as const;

function domains(states: readonly OperationalState[], seed = 1): DomainDatum[] {
  const rnd = mulberry32(seed);
  return states.map((state, i) => ({
    label: `${CLOUDS[i % CLOUDS.length]}-${(i + 1).toString().padStart(2, "0")}`,
    state,
    cloud: CLOUDS[i % CLOUDS.length],
    account: `acct-${Math.floor(rnd() * 9000 + 1000)}`,
  }));
}

function evId(i: number): string {
  return `ev-${(i + 1).toString().padStart(4, "0")}`;
}

/** Build an evidence timeline of `count` rows with states derived from progress. */
function timeline(count: number, sealedUpTo: number, verifiedUpTo: number, archived: boolean): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  for (let i = 0; i < count; i++) {
    const state = archived
      ? EvidenceState.Archived
      : i <= verifiedUpTo
        ? EvidenceState.Verified
        : i <= sealedUpTo
          ? EvidenceState.Sealed
          : i === sealedUpTo + 1
            ? EvidenceState.Unsigned
            : EvidenceState.Pending;
    rows.push({ id: evId(i), label: `record ${i + 1}`, state });
  }
  return rows;
}

const N = OperationalState.Nominal;
const A = OperationalState.Advisory;
const E = OperationalState.Engaged;
const H = OperationalState.Halt;
const R = OperationalState.Reverted;

/* ── The eleven canonical scenarios ────────────────────────────────────────── */

export const successfulRemediation: Scenario = {
  id: "successful-remediation",
  title: "Successful remediation",
  outcome: "success",
  narrative: { current: null, skipped: [], archived: false },
  evidence: { count: 3, sealedUpTo: 2, verifiedUpTo: 2, archived: false },
  verification: { links: 3, breakAt: null },
  domains: domains([N, N, N, N, N], 11),
  timeline: timeline(3, 2, 2, false),
};

export const policyDenial: Scenario = {
  id: "policy-denial",
  title: "Policy denial",
  outcome: "denied",
  narrative: { current: Beat.PolicyDecision, skipped: [Beat.AutonomousExecution, Beat.RollbackPath], archived: false },
  evidence: { count: 1, sealedUpTo: 0, verifiedUpTo: 0, archived: false },
  verification: { links: 1, breakAt: null },
  domains: domains([N, A, H, N, N], 12),
  timeline: timeline(1, 0, 0, false),
};

export const verificationFailure: Scenario = {
  id: "verification-failure",
  title: "Verification failure (tamper)",
  outcome: "verification-failure",
  narrative: { current: Beat.Verification, skipped: [], archived: false },
  evidence: { count: 4, sealedUpTo: 3, verifiedUpTo: 1, archived: false },
  verification: { links: 4, breakAt: 2 },
  domains: domains([N, N, H, N, N], 13),
  timeline: timeline(4, 3, 1, false),
};

export const rolledBack: Scenario = {
  id: "rolled-back",
  title: "Rollback",
  outcome: "rolled-back",
  narrative: { current: Beat.RollbackPath, skipped: [], archived: false },
  evidence: { count: 4, sealedUpTo: 3, verifiedUpTo: 3, archived: false },
  verification: { links: 3, breakAt: null },
  domains: domains([N, N, R, N, N], 14),
  timeline: [
    ...timeline(3, 2, 2, false),
    { id: evId(3), label: "reverted", state: EvidenceState.Sealed },
  ],
};

export const archived: Scenario = {
  id: "archived",
  title: "Archive",
  outcome: "archived",
  narrative: { current: null, skipped: [], archived: true },
  evidence: { count: 3, sealedUpTo: 2, verifiedUpTo: 2, archived: true },
  verification: { links: 3, breakAt: null },
  domains: domains([N, N, N, N, N], 15),
  timeline: timeline(3, 2, 2, true),
};

export const partialExecution: Scenario = {
  id: "partial-execution",
  title: "Partial execution",
  outcome: "partial",
  narrative: { current: Beat.AutonomousExecution, skipped: [], archived: false },
  evidence: { count: 3, sealedUpTo: 0, verifiedUpTo: -1, archived: false },
  verification: { links: 3, breakAt: null },
  domains: domains([E, N, E, A, N], 16),
  timeline: timeline(3, 0, -1, false),
};

export const multipleCloudAccounts: Scenario = {
  id: "multiple-cloud-accounts",
  title: "Multiple cloud accounts",
  outcome: "success",
  narrative: { current: null, skipped: [], archived: false },
  evidence: { count: 5, sealedUpTo: 4, verifiedUpTo: 4, archived: false },
  verification: { links: 5, breakAt: null },
  domains: domains([N, N, N, N, N, N, N, N, N, N], 17),
  timeline: timeline(5, 4, 4, false),
};

export const crossCloudOrchestration: Scenario = {
  id: "cross-cloud-orchestration",
  title: "Cross-cloud orchestration",
  outcome: "success",
  narrative: { current: Beat.AutonomousExecution, skipped: [], archived: false },
  evidence: { count: 6, sealedUpTo: 2, verifiedUpTo: -1, archived: false },
  verification: { links: 6, breakAt: null },
  domains: domains([E, E, E, E, N, N], 18),
  timeline: timeline(6, 2, -1, false),
};

export const evidenceCorruption: Scenario = {
  id: "evidence-corruption",
  title: "Evidence corruption",
  outcome: "verification-failure",
  narrative: { current: Beat.Verification, skipped: [], archived: false },
  evidence: { count: 8, sealedUpTo: 7, verifiedUpTo: 3, archived: false },
  verification: { links: 8, breakAt: 4 },
  domains: domains([N, N, H, N, N], 19),
  timeline: timeline(8, 7, 3, false),
};

export const interruptedExecution: Scenario = {
  id: "interrupted-execution",
  title: "Interrupted execution",
  outcome: "interrupted",
  narrative: { current: Beat.AutonomousExecution, skipped: [], archived: false },
  evidence: { count: 2, sealedUpTo: -1, verifiedUpTo: -1, archived: false },
  verification: { links: 2, breakAt: null },
  domains: domains([E, N, N, N, N], 20),
  timeline: timeline(2, -1, -1, false),
};

/** A scaled chain for stress testing — `count` evidence blocks, N domains. */
export function largeEvidenceChain(count: number, seed = 42): Scenario {
  const sealedUpTo = count - 1;
  const verifiedUpTo = Math.floor(count * 0.9);
  const domainCount = Math.min(24, Math.max(5, Math.floor(count / 64)));
  const rnd = mulberry32(seed);
  const states = Array.from({ length: domainCount }, () => {
    const r = rnd();
    return r < 0.8 ? N : r < 0.9 ? E : r < 0.96 ? A : H;
  });
  return {
    id: `large-${count}`,
    title: `Large evidence chain (${count})`,
    outcome: "success",
    narrative: { current: null, skipped: [], archived: false },
    evidence: { count, sealedUpTo, verifiedUpTo, archived: false },
    verification: { links: Math.min(count, 64), breakAt: null },
    domains: domains(states, seed),
    timeline: timeline(count, sealedUpTo, verifiedUpTo, false),
  };
}

/** Every canonical scenario, in a stable order. */
export const ALL_SCENARIOS: readonly Scenario[] = [
  successfulRemediation,
  policyDenial,
  verificationFailure,
  rolledBack,
  archived,
  partialExecution,
  multipleCloudAccounts,
  crossCloudOrchestration,
  evidenceCorruption,
  interruptedExecution,
  largeEvidenceChain(100),
];

export const SCENARIOS_BY_ID: Readonly<Record<string, Scenario>> = Object.fromEntries(
  ALL_SCENARIOS.map((s) => [s.id, s]),
);
