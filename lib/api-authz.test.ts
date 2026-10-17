import test from "node:test";
import assert from "node:assert/strict";

import { apiRequiredRoles, roleMayCallApi } from "./api-authz";

// The UI uses roleMayCallApi to avoid issuing requests the edge would refuse
// (an AUDITOR's remediation reads were a 403 on every page). It must agree with
// apiRequiredRoles exactly — it is a mirror of the edge rule, never a looser one.

test("AUDITOR may not read remediation; operational roles may", () => {
  assert.equal(roleMayCallApi("AUDITOR", "/api/remediation"), false);
  assert.equal(roleMayCallApi("AUDITOR", "/api/remediation/actions"), false);
  for (const role of ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"]) {
    assert.equal(roleMayCallApi(role, "/api/remediation"), true, role);
  }
});

test("it agrees with apiRequiredRoles for every role on the remediation paths", () => {
  const roles = ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "CLIENT", "SOC_LEAD", "DEVSECOPS",
    "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST"];
  for (const path of ["/api/remediation", "/api/remediation/actions"]) {
    const required = apiRequiredRoles(path);
    assert.ok(Array.isArray(required), `${path} is role-gated`);
    for (const role of roles) {
      assert.equal(roleMayCallApi(role, path), (required as string[]).includes(role), `${role} ${path}`);
    }
  }
});

test("no role and unclassified paths fail closed", () => {
  assert.equal(roleMayCallApi(null, "/api/remediation"), false);
  assert.equal(roleMayCallApi(undefined, "/api/controls"), false);
  assert.equal(roleMayCallApi("ADMIN", "/api/definitely-not-a-classified-route"), false);
});
