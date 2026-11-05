/**
 * Customer-applied change adapter and lifecycle helpers. The rules: approval
 * and the customer's statement never make a change Fixed, the lifecycle never
 * skips a step, and the execution is always the customer's statement.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { toManualRemediation } from "./manual-remediation";
import type { ManualRemediationDTO } from "../dto/manual-remediation";
import { manualNextStep, isManualRemediationOpen } from "@/lib/domain";

function dto(over: Partial<ManualRemediationDTO> = {}): ManualRemediationDTO {
  return {
    id: "3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b",
    controlId: "TC-NET-01",
    resourceId: "res-abc123",
    resourceLabel: "sg-web",
    state: "PROPOSED",
    proposal: {
      change: "Remove the 0.0.0.0/0 rule on port 22.",
      scope: "One resource: sg-web, region ap-south-1, account •••• 9012",
      expectedResult: "No administration port is open to the internet.",
      rollback: "Re-add the rule.",
      proposedBy: "engineer@example.com",
      proposedAt: "2026-09-24T09:00:00Z",
    },
    approval: null,
    execution: null,
    verification: null,
    outcome: "PENDING",
    ...over,
  };
}

const approved = { approvedBy: "cto@example.com", approvedAt: "2026-09-24T09:10:00Z" };
const stated = {
  basis: "CUSTOMER_STATED",
  executor: "Priya",
  method: "CLI",
  executedAt: "2026-09-24T09:20:00Z",
  recordedBy: "cto@example.com",
  recordedAt: "2026-09-24T09:21:00Z",
};

test("the lifecycle moves one step at a time: approve → applied → verify → done", () => {
  assert.equal(manualNextStep(toManualRemediation(dto())), "approve");
  assert.equal(manualNextStep(toManualRemediation(dto({ state: "APPROVED", approval: approved }))), "applied");
  const applied = dto({ state: "APPLIED", approval: approved, execution: stated, outcome: "NOT_VERIFIED" });
  assert.equal(manualNextStep(toManualRemediation(applied)), "verify");
  const done = toManualRemediation({
    ...applied,
    verification: { status: "PASS", verifiedAt: "2026-09-24T09:30:00Z" },
    outcome: "FIXED",
  });
  assert.equal(manualNextStep(done), null);
  assert.equal(isManualRemediationOpen(done), false);
});

test("approval does not mean Fixed", () => {
  const r = toManualRemediation(dto({ state: "APPROVED", approval: approved, outcome: "FIXED" }));
  assert.notEqual(r.outcome, "FIXED");
});

test("the customer's 'applied' statement does not mean Fixed", () => {
  const r = toManualRemediation(dto({ state: "APPLIED", approval: approved, execution: stated, outcome: "FIXED" }));
  assert.equal(r.outcome, "NOT_VERIFIED");
  assert.equal(r.statement?.appliedBy, "Priya");
  assert.equal(r.statement?.method, "CLI");
});

test("only a passing verification is Fixed; a failing one shows the failure", () => {
  const base = dto({ state: "APPLIED", approval: approved, execution: stated });
  const pass = toManualRemediation({ ...base, verification: { status: "PASS", verifiedAt: "t" }, outcome: "FIXED" });
  assert.equal(pass.outcome, "FIXED");
  const fail = toManualRemediation({ ...base, verification: { status: "FAIL", verifiedAt: "t" }, outcome: "DID_NOT_FIX" });
  assert.equal(fail.outcome, "DID_NOT_FIX");
  assert.equal(fail.verification?.status, "FAIL");
  assert.equal(manualNextStep(fail), null, "a failed verdict is final; a retry is a new proposal");
});

test("a NOT_ASSESSED check may be re-run and is never Fixed", () => {
  const r = toManualRemediation(
    dto({
      state: "APPLIED",
      approval: approved,
      execution: stated,
      verification: { status: "NOT_ASSESSED", verifiedAt: "t" },
      outcome: "NOT_VERIFIED",
    }),
  );
  assert.equal(manualNextStep(r), "verify");
  assert.notEqual(r.outcome, "FIXED");
});

test("unknown words never advance the lifecycle or pass a check", () => {
  const r = toManualRemediation(
    dto({ state: "DONE", verification: { status: "LOOKS_GOOD", verifiedAt: "t" }, outcome: "SHIPPED" }),
  );
  assert.equal(r.state, "PROPOSED");
  assert.equal(r.verification?.status, "NOT_ASSESSED");
  assert.equal(r.outcome, "NOT_VERIFIED");
});

test("the domain object carries no Tricognita executor", () => {
  const r = toManualRemediation(
    dto({ state: "APPLIED", approval: approved, execution: { ...stated, basis: "RECORDED_BY_TRICOGNITA", method: "TRICOGNITA_AUTOMATED_FIX" } }),
  );
  // There is no basis field to forge: the statement is only ever the customer's.
  assert.ok(!("basis" in (r.statement ?? {})));
  assert.equal(r.statement?.method, "OTHER");
});
