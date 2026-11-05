/**
 * BFF rules for customer-applied remediation: who may do which step, and what
 * the browser is allowed to send the backend.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { canDo } from "./rbac";
import { roleMayCallApi } from "./api-authz";
import {
  MANUAL_STEP_CAPABILITY,
  isRemediationId,
  manualRequestBody,
  manualStepFromVerb,
  type ManualStep,
} from "./manual-remediation-policy";

const may = (role: string, step: ManualStep) =>
  canDo(role as Parameters<typeof canDo>[0], MANUAL_STEP_CAPABILITY[step]);

test("admin and security operations may do every step", () => {
  for (const role of ["ADMIN", "SECOPS"]) {
    for (const step of ["propose", "approve", "applied", "verify"] as ManualStep[]) {
      assert.ok(may(role, step), `${role} ${step}`);
    }
  }
});

test("engineering may propose, record and verify — but not approve", () => {
  for (const role of ["DEVSECOPS", "CLOUD_ENGINEER"]) {
    assert.ok(may(role, "propose"));
    assert.ok(may(role, "applied"));
    assert.ok(may(role, "verify"));
    assert.ok(!may(role, "approve"), `${role} must not approve`);
  }
});

test("viewer and auditor are read-only for every step", () => {
  for (const role of ["VIEWER", "AUDITOR", "CLIENT"]) {
    for (const step of ["propose", "approve", "applied", "verify"] as ManualStep[]) {
      assert.ok(!may(role, step), `${role} ${step}`);
    }
  }
});

test("no role at all may do nothing", () => {
  for (const step of ["propose", "approve", "applied", "verify"] as ManualStep[]) {
    assert.equal(canDo(null, MANUAL_STEP_CAPABILITY[step]), false);
  }
});

test("the edge lets remediation roles reach the manual routes and keeps read-only roles out", () => {
  assert.ok(roleMayCallApi("ADMIN", "/api/remediation/manual"));
  assert.ok(roleMayCallApi("DEVSECOPS", "/api/remediation/manual"));
  assert.ok(!roleMayCallApi("VIEWER", "/api/remediation/manual"));
  assert.ok(!roleMayCallApi("AUDITOR", "/api/remediation/manual/00000000-0000-0000-0000-000000000000/approve"));
});

test("only the three step verbs are forwarded", () => {
  assert.equal(manualStepFromVerb("approve"), "approve");
  assert.equal(manualStepFromVerb("applied"), "applied");
  assert.equal(manualStepFromVerb("verify"), "verify");
  for (const bad of ["execute", "reject", "delete", "APPROVE", "", "../approve"]) {
    assert.equal(manualStepFromVerb(bad), null, bad);
  }
});

test("only a UUID is accepted as a remediation id", () => {
  assert.ok(isRemediationId("3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b"));
  for (const bad of ["manual", "1", "../../api/admin", "3f2a9c1e-8b7d-4e6f-9a0b-1c2d3e4f5a6b/x", ""]) {
    assert.equal(isRemediationId(bad), false, bad);
  }
});

test("tenant, account and resource identifiers never reach the backend from the browser", () => {
  const forged = {
    controlId: "TC-DATA-02",
    resourceId: "res-abc123",
    proposedChange: "Turn on Block Public Access",
    expectedResult: "Blocked",
    rollback: "Turn it off",
    tenantId: "other-tenant",
    tenant_id: "other-tenant",
    cloudAccountId: "123456789012",
    resourceUrn: "arn:aws:s3:::someone-else",
    proposedBy: "ceo@example.com",
  };
  assert.deepEqual(manualRequestBody("propose", forged), {
    controlId: "TC-DATA-02",
    resourceId: "res-abc123",
    proposedChange: "Turn on Block Public Access",
    expectedResult: "Blocked",
    rollback: "Turn it off",
  });
});

test("approval and verification forward nothing; the actor is the signed-in user", () => {
  assert.deepEqual(manualRequestBody("approve", { approvedBy: "someone-else@example.com", tenantId: "x" }), {});
  assert.deepEqual(manualRequestBody("verify", { status: "PASS" }), {});
  assert.deepEqual(manualRequestBody("verify", null), {});
});

test("the applied statement forwards only the customer's statement fields", () => {
  assert.deepEqual(
    manualRequestBody("applied", {
      appliedBy: "Priya",
      method: "CLI",
      appliedAt: "2026-09-24T10:00:00Z",
      executor: "Tricognita",
      basis: "RECORDED_BY_TRICOGNITA",
      tenantId: "x",
    }),
    { appliedBy: "Priya", method: "CLI", appliedAt: "2026-09-24T10:00:00Z" },
  );
});

test("a non-object body for a step with fields is refused", () => {
  assert.equal(manualRequestBody("propose", "controlId=TC-DATA-02"), null);
  assert.equal(manualRequestBody("applied", [1, 2]), null);
});
