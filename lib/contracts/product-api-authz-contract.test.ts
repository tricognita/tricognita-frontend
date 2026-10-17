/**
 * Product read-surface authorization contract.
 *
 * Two lists decide whether a customer can see their own control state: the
 * capability roster (lib/rbac-roster.ts), which the pages consult, and the
 * middleware classification (lib/api-authz.ts), which the network enforces. If
 * they disagree, one of two bad things happens — a role sees a screen whose
 * data request 403s, or a role is handed data the roster says it may not read.
 *
 * This test pins them together for the product's read routes. It is separate
 * from rbac-authz-contract.test.ts, which checks middleware against each
 * handler's own guard; this one checks middleware against the product's
 * capability model.
 */
import test from "node:test";
import assert from "node:assert/strict";

import type { Role } from "@/lib/auth";
import type { Capability } from "@/lib/rbac";
import { ROLES_BY_CAPABILITY } from "@/lib/rbac-roster";
import { apiRequiredRoles } from "../api-authz";

// Each product read route and the capability that governs the screen it feeds.
const READ_ROUTES: Array<{ path: string; capability: Capability }> = [
  { path: "/api/controls", capability: "viewControls" },
  { path: "/api/controls/TC-IAM-01/results", capability: "viewControls" },
  { path: "/api/controls/TC-IAM-01/history", capability: "viewControls" },
  { path: "/api/verification-runs", capability: "viewControls" },
  { path: "/api/cloud-accounts", capability: "viewControls" },
  { path: "/api/evidence", capability: "viewEvidence" },
];

function sorted(roles: readonly Role[]): Role[] {
  return [...roles].sort();
}

test("every product read route is classified — none falls through to deny", () => {
  for (const { path } of READ_ROUTES) {
    const required = apiRequiredRoles(path);
    assert.notEqual(required, "deny", `${path} has no authorization policy`);
    assert.notEqual(required, "public", `${path} must not be public — it returns tenant data`);
  }
});

test("the network admits exactly the roles the capability roster admits", () => {
  for (const { path, capability } of READ_ROUTES) {
    const required = apiRequiredRoles(path);
    assert.ok(Array.isArray(required), `${path} should name its roles, got ${required}`);
    assert.deepEqual(
      sorted(required as Role[]),
      sorted(ROLES_BY_CAPABILITY[capability]),
      `${path} and ${capability} disagree about who may read it`,
    );
  }
});

test("evidence is readable by the same roles as controls, and by no more", () => {
  // The Evidence screen is the proof behind the Controls screen. A role that
  // can see a verdict must be able to see what backs it; a role that cannot see
  // the verdict must not learn it from the evidence list.
  assert.deepEqual(
    sorted(apiRequiredRoles("/api/evidence") as Role[]),
    sorted(apiRequiredRoles("/api/controls") as Role[]),
  );
});

test("a route nobody classified fails closed", () => {
  assert.equal(apiRequiredRoles("/api/not-a-real-product-route"), "deny");
  assert.equal(apiRequiredRoles("/api/proof"), "deny");
});

test("classification is by prefix, which a sibling route name can inherit", () => {
  // apiRequiredRoles matches with startsWith, so "/api/evidence" also claims
  // "/api/evidence-exports" and every other path beginning with those
  // characters. That is how the whole list has always worked — "/api/controls"
  // claims "/api/controls/TC-IAM-01/results", which is the point — but it means
  // a NEW route whose name merely starts with an existing entry is classified
  // by accident rather than failing closed.
  //
  // This test exists so that inheritance is a decision someone made, not a
  // surprise. If you add a route whose path extends one of these, classify it
  // deliberately: give it its own entry, or confirm the inherited roles are
  // right for it.
  assert.deepEqual(
    sorted(apiRequiredRoles("/api/evidence-exports") as Role[]),
    sorted(apiRequiredRoles("/api/evidence") as Role[]),
    "a sibling of /api/evidence inherits its roles — classify it deliberately",
  );
});
