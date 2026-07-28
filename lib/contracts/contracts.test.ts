/**
 * Contract invariants — tests the pure logic of the State, Narrative, and Motion
 * contracts. No rendering. Run via `npm test`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  OperationalState,
  EvidenceState,
  isLegalOperationalTransition,
  isLegalEvidenceTransition,
  assertOperationalTransition,
  assertEvidenceTransition,
  StateTransitionError,
  isTerminalEvidence,
  EVIDENCE_TRANSITIONS,
  OPERATIONAL_COLOR,
} from "./state";
import {
  Beat,
  BEAT_ORDER,
  BEAT_COUNT,
  BEATS,
  deriveStatuses,
  timelineOf,
  isDeterministicReplay,
  assertBeatContract,
  assertMonotonic,
  DEFAULT_READONLY_SKIPS,
  NarrativeContractError,
} from "./narrative";
import {
  MotionPrimitive,
  MOTION_CONTRACTS,
  BEAT_MOTION,
  assertMotionContract,
  OPERATIONAL_ENTRY_MOTION,
  EVIDENCE_ENTRY_MOTION,
} from "./motion";

/* ── State ─────────────────────────────────────────────────────────────────── */

test("operational: legal transitions match the table; illegal ones are rejected", () => {
  assert.ok(isLegalOperationalTransition(OperationalState.Nominal, OperationalState.Engaged));
  assert.ok(isLegalOperationalTransition(OperationalState.Engaged, OperationalState.Reverted));
  assert.ok(isLegalOperationalTransition(OperationalState.Reverted, OperationalState.Nominal));
  // illegal: cannot un-decide (engaged → advisory); nothing to revert from nominal
  assert.ok(!isLegalOperationalTransition(OperationalState.Engaged, OperationalState.Advisory));
  assert.ok(!isLegalOperationalTransition(OperationalState.Nominal, OperationalState.Reverted));
  assert.ok(!isLegalOperationalTransition(OperationalState.Reverted, OperationalState.Engaged));
});

test("operational: assert throws StateTransitionError on an illegal move", () => {
  assert.doesNotThrow(() => assertOperationalTransition(OperationalState.Halt, OperationalState.Engaged));
  assert.throws(
    () => assertOperationalTransition(OperationalState.Reverted, OperationalState.Halt),
    StateTransitionError,
  );
});

test("evidence: strictly forward, no skipping, no going back", () => {
  assert.ok(isLegalEvidenceTransition(EvidenceState.Pending, EvidenceState.Unsigned));
  assert.ok(isLegalEvidenceTransition(EvidenceState.Sealed, EvidenceState.Verified));
  assert.ok(!isLegalEvidenceTransition(EvidenceState.Pending, EvidenceState.Sealed)); // skip
  assert.ok(!isLegalEvidenceTransition(EvidenceState.Sealed, EvidenceState.Unsigned)); // back
  assert.throws(
    () => assertEvidenceTransition(EvidenceState.Verified, EvidenceState.Sealed),
    StateTransitionError,
  );
});

test("evidence: archived is terminal (no outgoing transitions)", () => {
  assert.deepEqual(EVIDENCE_TRANSITIONS[EvidenceState.Archived], []);
  assert.ok(isTerminalEvidence(EvidenceState.Archived));
  assert.ok(!isTerminalEvidence(EvidenceState.Sealed));
});

test("every operational state maps to a color role (state grammar)", () => {
  for (const s of Object.values(OperationalState)) {
    assert.ok(OPERATIONAL_COLOR[s] !== undefined, `no color mapping for ${s}`);
  }
});

/* ── Narrative ─────────────────────────────────────────────────────────────── */

test("narrative: the arc is always exactly 10 contiguous beats", () => {
  assert.equal(BEAT_ORDER.length, BEAT_COUNT);
  assert.doesNotThrow(assertBeatContract);
  BEAT_ORDER.forEach((b, i) => assert.equal(BEATS[b].ordinal, i + 1));
});

test("deriveStatuses: current is current, earlier=completed, later=future", () => {
  const s = deriveStatuses({ mode: "live", current: Beat.PolicyDecision, skipped: [] });
  assert.equal(s[Beat.Observation], "completed");
  assert.equal(s[Beat.PolicyDecision], "current");
  assert.equal(s[Beat.Verification], "future");
});

test("deriveStatuses: skipped beats are marked skipped, never omitted or completed", () => {
  const s = deriveStatuses({ mode: "live", current: Beat.Verification, skipped: DEFAULT_READONLY_SKIPS });
  assert.equal(s[Beat.AutonomousExecution], "skipped");
  assert.equal(s[Beat.RollbackPath], "skipped");
  // a real earlier beat is still completed
  assert.equal(s[Beat.Observation], "completed");
  // every beat has a status (nothing omitted)
  assert.equal(Object.keys(s).length, BEAT_COUNT);
});

test("deriveStatuses: archived mode completes every non-skipped beat", () => {
  const s = deriveStatuses({ mode: "archived", current: null, skipped: [Beat.AutonomousExecution] });
  assert.equal(s[Beat.FinalArchivedState], "completed");
  assert.equal(s[Beat.Observation], "completed");
  assert.equal(s[Beat.AutonomousExecution], "skipped");
});

test("assertMonotonic: causal completion holds; is deterministic (pure)", () => {
  assert.doesNotThrow(() =>
    assertMonotonic({ mode: "live", current: Beat.EvidenceGeneration, skipped: DEFAULT_READONLY_SKIPS }),
  );
});

test("replay: same skips → identical timeline; determinism verifiable", () => {
  const a = timelineOf(DEFAULT_READONLY_SKIPS);
  const b = timelineOf(DEFAULT_READONLY_SKIPS);
  assert.ok(isDeterministicReplay(a, b));
  assert.equal(a.length, BEAT_COUNT - DEFAULT_READONLY_SKIPS.length);
  assert.ok(!isDeterministicReplay(a, timelineOf([]))); // different skips → different timeline
});

test("assertMonotonic passes for a not-started run; NarrativeContractError is well-formed", () => {
  assert.doesNotThrow(() => assertMonotonic({ mode: "live", current: null, skipped: [] }));
  const err = new NarrativeContractError("test");
  assert.match(err.message, /Narrative contract violated/);
  assert.equal(err.name, "NarrativeContractError");
});

/* ── Motion ────────────────────────────────────────────────────────────────── */

test("motion: every primitive has a complete, coherent contract", () => {
  assert.doesNotThrow(assertMotionContract);
  for (const p of Object.values(MotionPrimitive)) {
    const meta = MOTION_CONTRACTS[p];
    assert.equal(meta.primitive, p);
    assert.ok(meta.purpose.length > 0, `${p} missing purpose`);
    assert.ok(meta.constraints.length > 0, `${p} missing constraints`);
    assert.ok(meta.reducedMotion.length > 0, `${p} missing reduced-motion behavior`);
    assert.ok(meta.timing.duration && meta.timing.easing, `${p} missing timing`);
  }
});

test("motion: computation primitives are linear; settle primitives are not", () => {
  assert.ok(MOTION_CONTRACTS[MotionPrimitive.FlowSignal].linear);
  assert.ok(MOTION_CONTRACTS[MotionPrimitive.VerifyChain].linear);
  assert.ok(!MOTION_CONTRACTS[MotionPrimitive.SnapState].linear);
  assert.ok(!MOTION_CONTRACTS[MotionPrimitive.SealBlock].linear);
});

test("motion: composite primitives reference only real sub-primitives", () => {
  for (const p of Object.values(MotionPrimitive)) {
    const composed = MOTION_CONTRACTS[p].composedOf ?? [];
    for (const sub of composed) {
      assert.ok(MOTION_CONTRACTS[sub], `${p} composedOf unknown ${sub}`);
    }
  }
});

test("motion: BEAT_MOTION covers all 10 beats; each maps to a real primitive or null", () => {
  for (const beat of BEAT_ORDER) {
    assert.ok(beat in BEAT_MOTION, `beat ${beat} missing from BEAT_MOTION`);
    const prim = BEAT_MOTION[beat];
    assert.ok(prim === null || MOTION_CONTRACTS[prim], `beat ${beat} → unknown primitive`);
  }
  // the arc's signature seam: execution flows, rollback retraces
  assert.equal(BEAT_MOTION[Beat.AutonomousExecution], MotionPrimitive.FlowSignal);
  assert.equal(BEAT_MOTION[Beat.RollbackPath], MotionPrimitive.RetraceRollback);
  assert.equal(BEAT_MOTION[Beat.FinalArchivedState], MotionPrimitive.ArchiveBeat);
});

test("motion: every state has an entry-motion implication defined", () => {
  for (const s of Object.values(OperationalState)) {
    assert.ok(s in OPERATIONAL_ENTRY_MOTION, `no entry motion for operational ${s}`);
  }
  for (const s of Object.values(EvidenceState)) {
    assert.ok(s in EVIDENCE_ENTRY_MOTION, `no entry motion for evidence ${s}`);
  }
});
