/**
 * Product capability contract.
 *
 * The four product roles are a display mapping over ten session roles. This
 * test exists to stop the mapping quietly handing a read-only role the ability
 * to change a customer's cloud — the exact risk of grouping AUDITOR, VIEWER,
 * CLIENT, RED_TEAMER and FINOPS_ANALYST under one "Viewer" label.
 */
import test from "node:test";
import assert from "node:assert/strict";

import type { Role } from "@/lib/auth";
import { canDo, type Capability } from "@/lib/rbac";
import { ROLES_BY_CAPABILITY } from "@/lib/rbac-roster";
import { PRODUCT_ROLE_OF } from "@/lib/domain/roles";

/**
 * lib/auth pulls "server-only", which cannot load under the node test runner —
 * the same constraint lib/api-authz.ts was written around. The role list comes
 * from PRODUCT_ROLE_OF instead, which TypeScript already proves exhaustive
 * because it is typed Record<Role, ProductRole>.
 */
const ROLES = Object.keys(PRODUCT_ROLE_OF) as Role[];

const READ_ONLY_ROLES: Role[] = ["AUDITOR", "VIEWER", "CLIENT", "RED_TEAMER", "FINOPS_ANALYST"];

const MUTATION_CAPABILITIES: Capability[] = [
  "runVerification",
  "requestRemediation",
  "approveRemediation",
  "manageExceptions",
  "manageCloudAccounts",
  "manageAlertRoutes",
  "manageApiKeys",
  "manageUsers",
  "manageSettings",
];

const PRODUCT_READ_CAPABILITIES: Capability[] = ["viewControls", "viewEvidence", "exportReports"];

test("every session role maps to exactly one product role", () => {
  for (const role of ROLES) {
    assert.ok(PRODUCT_ROLE_OF[role], `${role} maps to a product role`);
  }
  assert.equal(new Set(ROLES).size, 11, "all eleven session roles are mapped");
});

test("read-only roles receive no mutation or administrative capability", () => {
  for (const role of READ_ONLY_ROLES) {
    assert.equal(PRODUCT_ROLE_OF[role], "VIEWER", `${role} is a Viewer`);
    for (const cap of MUTATION_CAPABILITIES) {
      assert.equal(canDo(role, cap), false, `${role} must not be able to ${cap}`);
    }
  }
});

test("DESIGNER (design review) receives no mutation or administrative capability", () => {
  assert.equal(PRODUCT_ROLE_OF.DESIGNER, "VIEWER");
  for (const cap of MUTATION_CAPABILITIES) assert.equal(canDo("DESIGNER", cap), false, `DESIGNER must not be able to ${cap}`);
});

test("read-only roles can still read and export the product", () => {
  for (const role of READ_ONLY_ROLES) {
    for (const cap of PRODUCT_READ_CAPABILITIES) {
      assert.equal(canDo(role, cap), true, `${role} can ${cap}`);
    }
  }
});

test("approval and risk acceptance stay with Security Operations and Admin", () => {
  for (const cap of ["approveRemediation", "manageExceptions"] as Capability[]) {
    const allowed = ROLES_BY_CAPABILITY[cap];
    assert.deepEqual([...allowed].sort(), ["ADMIN", "SECOPS", "SOC_LEAD"].sort(), `${cap} roles`);
    for (const role of allowed) {
      assert.ok(["ADMIN", "SECURITY_OPS"].includes(PRODUCT_ROLE_OF[role]), `${role} is Admin or SecOps`);
    }
  }
});

test("engineering can act on its own cloud but cannot approve or administer", () => {
  for (const role of ["DEVSECOPS", "CLOUD_ENGINEER"] as Role[]) {
    assert.equal(PRODUCT_ROLE_OF[role], "ENGINEERING");
    assert.equal(canDo(role, "runVerification"), true, `${role} can run verification`);
    assert.equal(canDo(role, "requestRemediation"), true, `${role} can request remediation`);
    assert.equal(canDo(role, "approveRemediation"), false, `${role} cannot approve`);
    assert.equal(canDo(role, "manageUsers"), false, `${role} cannot manage users`);
  }
});

test("administration capabilities belong to ADMIN alone", () => {
  for (const cap of ["manageCloudAccounts", "manageAlertRoutes", "manageApiKeys", "manageUsers"] as Capability[]) {
    assert.deepEqual(ROLES_BY_CAPABILITY[cap], ["ADMIN"], `${cap} is admin-only`);
  }
});

test("rbac.ts and rbac-roster.ts agree for every capability", () => {
  for (const [cap, roles] of Object.entries(ROLES_BY_CAPABILITY) as [Capability, Role[]][]) {
    for (const role of ROLES) {
      assert.equal(
        canDo(role, cap),
        roles.includes(role),
        `${role} / ${cap} must agree between the matrix and the roster`,
      );
    }
  }
});
