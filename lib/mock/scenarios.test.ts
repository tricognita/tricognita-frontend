/**
 * Mock Runtime — dataset validation. Proves the datasets are deterministic and
 * shaped to exercise every product component. Run via `npm test`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Beat } from "../contracts/narrative";
import { OperationalState } from "../contracts/state";
import {
  ALL_SCENARIOS,
  SCENARIOS_BY_ID,
  largeEvidenceChain,
  mulberry32,
  type Scenario,
} from "./scenarios";

const REQUIRED = [
  "successful-remediation", "policy-denial", "verification-failure", "rolled-back",
  "archived", "partial-execution", "multiple-cloud-accounts", "cross-cloud-orchestration",
  "evidence-corruption", "interrupted-execution",
];

test("all required execution scenarios exist", () => {
  for (const id of REQUIRED) assert.ok(SCENARIOS_BY_ID[id], `missing scenario ${id}`);
  assert.ok(ALL_SCENARIOS.length >= 11);
});

test("every scenario exercises every component (has all prop groups, valid shape)", () => {
  for (const s of ALL_SCENARIOS) {
    // LifecycleSpine / ReplayTimeline
    assert.ok(s.narrative, `${s.id} narrative`);
    // EvidenceChain
    assert.ok(s.evidence.count >= 1, `${s.id} evidence count`);
    assert.ok(s.evidence.sealedUpTo >= -1 && s.evidence.sealedUpTo < s.evidence.count, `${s.id} sealedUpTo bounds`);
    assert.ok(s.evidence.verifiedUpTo <= s.evidence.sealedUpTo, `${s.id} verified ≤ sealed (monotonic)`);
    // VerificationPanel
    assert.ok(s.verification.links >= 1, `${s.id} verification links`);
    // CloudControlPlane / DomainTopology
    assert.ok(s.domains.length >= 1, `${s.id} domains`);
    // EvidenceTimeline
    assert.equal(s.timeline.length >= s.evidence.count, true, `${s.id} timeline`);
  }
});

test("datasets are deterministic (same inputs → identical output)", () => {
  assert.deepEqual(largeEvidenceChain(100), largeEvidenceChain(100));
  assert.deepEqual(largeEvidenceChain(1000, 7), largeEvidenceChain(1000, 7));
  // a different seed yields a different (but still deterministic) dataset
  assert.notDeepEqual(largeEvidenceChain(100, 1).domains, largeEvidenceChain(100, 2).domains);
});

test("mulberry32 is a deterministic PRNG in [0,1)", () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  for (let i = 0; i < 5; i++) {
    const x = a();
    assert.equal(x, b());
    assert.ok(x >= 0 && x < 1);
  }
});

test("tamper scenarios carry a break; policy denial skips execution + rollback", () => {
  assert.notEqual(SCENARIOS_BY_ID["verification-failure"].verification.breakAt, null);
  assert.notEqual(SCENARIOS_BY_ID["evidence-corruption"].verification.breakAt, null);
  const denial = SCENARIOS_BY_ID["policy-denial"];
  assert.ok(denial.narrative.skipped.includes(Beat.AutonomousExecution));
  assert.ok(denial.narrative.skipped.includes(Beat.RollbackPath));
});

test("rollback scenario shows a reverted domain and appends (never deletes) evidence", () => {
  const s = SCENARIOS_BY_ID["rolled-back"];
  assert.ok(s.domains.some((d) => d.state === OperationalState.Reverted));
  assert.ok(s.timeline.some((r) => r.label === "reverted"));
  // the ledger GREW (timeline longer than the pre-rollback evidence count)
  assert.ok(s.timeline.length > 3);
});

test("multi-account + cross-cloud scenarios span several clouds/accounts", () => {
  const multi = SCENARIOS_BY_ID["multiple-cloud-accounts"];
  assert.ok(multi.domains.length >= 10);
  assert.ok(new Set(multi.domains.map((d) => d.account)).size > 1);
  const cross = SCENARIOS_BY_ID["cross-cloud-orchestration"];
  assert.ok(new Set(cross.domains.map((d) => d.cloud)).size >= 3);
});

test("largeEvidenceChain scales the chain and caps domains/links sensibly", () => {
  const big = largeEvidenceChain(10000);
  assert.equal(big.evidence.count, 10000);
  assert.equal(big.timeline.length, 10000);
  assert.ok(big.domains.length <= 24, "domain count is capped");
  assert.ok(big.verification.links <= 64, "verification links are capped");
});
