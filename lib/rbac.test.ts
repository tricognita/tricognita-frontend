/**
 * Capability-gating behaviour for the on-demand verification and remediation
 * request surfaces — "can this role do X", checked without rendering
 * anything. Hiding a control is never the security boundary (the BFF and the
 * Go API re-check independently), but the frontend must still agree with
 * itself about who it offers a button to.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { canDo } from "./rbac";

test("runVerification is offered to operational roles, not read-only ones", () => {
  for (const role of ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] as const) {
    assert.equal(canDo(role, "runVerification"), true, role);
  }
  for (const role of ["AUDITOR", "VIEWER", "CLIENT", "FINOPS_ANALYST", "RED_TEAMER"] as const) {
    assert.equal(canDo(role, "runVerification"), false, role);
  }
});

test("requestRemediation is offered to the same operational roles as runVerification", () => {
  for (const role of ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] as const) {
    assert.equal(canDo(role, "requestRemediation"), true, role);
  }
  assert.equal(canDo("AUDITOR", "requestRemediation"), false);
});

test("approveRemediation is a stricter set than requestRemediation — DEVSECOPS/CLOUD_ENGINEER may ask, not approve", () => {
  assert.equal(canDo("DEVSECOPS", "requestRemediation"), true);
  assert.equal(canDo("DEVSECOPS", "approveRemediation"), false);
  assert.equal(canDo("CLOUD_ENGINEER", "requestRemediation"), true);
  assert.equal(canDo("CLOUD_ENGINEER", "approveRemediation"), false);
  for (const role of ["ADMIN", "SECOPS", "SOC_LEAD"] as const) {
    assert.equal(canDo(role, "approveRemediation"), true, role);
  }
});

test("an unknown or missing role gets nothing — fail closed, not fail open", () => {
  assert.equal(canDo(undefined, "runVerification"), false);
  assert.equal(canDo(null, "runVerification"), false);
  assert.equal(canDo("NOT_A_REAL_ROLE" as never, "runVerification"), false);
});
