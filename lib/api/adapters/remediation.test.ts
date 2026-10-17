/**
 * Remediation adapter behaviour. The rule under test throughout: the product may
 * never say a fix worked unless a fresh control evaluation said so.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { toRemediation, toRemediationOffer } from "./remediation";
import type { RemediationDTO, RemediationActionDTO } from "../dto/remediation";

function dto(over: Partial<RemediationDTO> = {}): RemediationDTO {
  return {
    id: "r1",
    controlId: "TC-DATA-02",
    action: "aws.s3.block_public_access",
    summary: "Enable Block Public Access on this bucket at bucket level.",
    state: "SUCCEEDED",
    outcome: "REMEDIATED",
    requestedBy: "a@b.c",
    requestedAt: "2026-09-20T00:00:00Z",
    ...over,
  };
}

test("a successful write is never mapped to COMPLETED", () => {
  // The backend is explicit that SUCCEEDED means the provider accepted the
  // call, not that the control passes. COMPLETED would put that conflation back
  // the moment the data crossed into the UI, so this adapter never emits it.
  const r = toRemediation(dto({ outcome: "NOT_EFFECTIVE" }));
  assert.equal(r.state, "APPLIED");
  assert.notEqual(r.state, "COMPLETED");
});

test("the write's state and the customer's verdict stay apart", () => {
  const r = toRemediation(dto({ state: "SUCCEEDED", outcome: "NOT_EFFECTIVE" }));
  assert.equal(r.state, "APPLIED");
  assert.equal(r.verdict, "NOT_EFFECTIVE");
});

test("every state the API can return is mapped", () => {
  const expected: Record<string, string> = {
    REQUESTED: "PENDING_APPROVAL",
    APPROVED: "APPROVED",
    EXECUTING: "EXECUTING",
    SUCCEEDED: "APPLIED",
    FAILED: "FAILED",
    REJECTED: "REJECTED",
    EXPIRED: "EXPIRED",
  };
  for (const [wire, want] of Object.entries(expected)) {
    assert.equal(toRemediation(dto({ state: wire })).state, want, `state ${wire}`);
  }
});

test("an unrecognised state is not treated as progress", () => {
  assert.equal(toRemediation(dto({ state: "TOTALLY_NEW" })).state, "NOT_STARTED");
});

test("a verdict never defaults to REMEDIATED", () => {
  // The one claim that must be earned is the one a default may not grant.
  assert.equal(toRemediation(dto({ outcome: "" })).verdict, "UNVERIFIED");
  assert.equal(toRemediation(dto({ outcome: "SOMETHING_ELSE" })).verdict, "UNVERIFIED");
});

test("a fixed verdict carries the run that justifies it", () => {
  const r = toRemediation(dto({ outcome: "REMEDIATED", verificationRunId: "run-7" }));
  assert.equal(r.verdict, "REMEDIATED");
  assert.equal(r.verificationRunId, "run-7");
});

test("optional fields are undefined rather than empty strings", () => {
  const r = toRemediation(dto());
  assert.equal(r.approvedBy, undefined);
  assert.equal(r.verificationRunId, undefined);
});

// ── offers ──────────────────────────────────────────────────────────────────

function offer(over: Partial<RemediationActionDTO> = {}): RemediationActionDTO {
  return {
    action: "aws.s3.block_public_access",
    controlId: "TC-DATA-02",
    summary: "Enable Block Public Access on this bucket at bucket level.",
    rollback: "Remove the bucket-level public access block.",
    enabled: true,
    ...over,
  };
}

test("an unavailable offer carries the reason", () => {
  const o = toRemediationOffer(offer({ enabled: false, reason: "not switched on" }));
  assert.equal(o.enabled, false);
  assert.equal(o.reason, "not switched on");
});

test("an offer defaults to unavailable rather than available", () => {
  // A missing flag must not read as "you may change the customer's cloud".
  const o = toRemediationOffer(offer({ enabled: undefined as unknown as boolean }));
  assert.equal(o.enabled, false);
});

test("required params are always an array", () => {
  assert.deepEqual(toRemediationOffer(offer()).requiredParams, []);
});
