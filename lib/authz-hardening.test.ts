/**
 * Authorization hardening (design-review readiness).
 *
 * Pins the fixes for four confirmed weaknesses:
 *   1. alert-route mutations were open to read-only roles;
 *   2. /api/aria/* E2 reads were open to any signed-in role;
 *   3. legacy E2 / autonomous / FinOps / internal-operations pages were
 *      default-allow for signed-in roles;
 *   4. there was no deny-by-default role for a future design reviewer.
 * The policy modules are dependency-free, so these run under node --test.
 * middleware.ts enforces both, and the Go API decides independently.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Role } from "./auth";
import { apiRequiredRoles, DESIGNER_API, MUTATION_POLICY, roleMayCallApi } from "./api-authz";
import { DESIGNER_ROUTES, INTERNAL_ROLES, isRoleAllowed, ROLE_ROUTES } from "./dashboard-authz";

const ROOT = process.cwd();
const MUTATIONS = ["POST", "PUT", "PATCH", "DELETE"];
const LOW: Role[] = ["VIEWER", "AUDITOR", "CLIENT"];
const E2_READERS: Role[] = ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "RED_TEAMER", "FINOPS_ANALYST", "CLOUD_ENGINEER"];

/** Every real /api/aria/* route, from the filesystem, with [params] filled in. */
function ariaRoutes(): string[] {
  const out: string[] = [];
  const walk = (dir: string, base: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${base}/${e.name.replace(/^\[.*\]$/, "x")}`);
      else if (e.name === "route.ts") out.push(base);
    }
  };
  walk(join(ROOT, "app", "api", "aria"), "/api/aria");
  return out.sort();
}

/** Legacy pages that expose E2, autonomous or FinOps content, or internal operations. */
const PROTECTED_PAGES = [
  "/dashboard/aria",
  "/dashboard/executive",
  "/dashboard/plan",
  "/dashboard/attack-graph",
  "/dashboard/ai-security",
  "/dashboard/threat-intel",
  "/dashboard/finops-security",
  "/dashboard/incidents",
  "/dashboard/queue",
  "/dashboard/soc",
  "/dashboard/audit-trail-legacy",
  "/dashboard/datasets",
  "/dashboard/settings",
  "/dashboard/credentials",
  "/dashboard/users",
  "/dashboard/admin",
  "/dashboard/admin/platform",
  "/dashboard/alert-routes",
  "/dashboard/api-keys",
];

const DENIED_ACTIONS: [string, string][] = [
  ["POST", "/api/remediation"],
  ["POST", "/api/remediation/actions"],
  ["POST", "/api/remediation/rem-1/execute"],
  ["POST", "/api/remediate"],
  ["POST", "/api/approvals"],
  ["POST", "/api/approvals/a-1/approve"],
  ["GET", "/api/credentials"],
  ["POST", "/api/credentials"],
  ["POST", "/api/scan"],
  ["POST", "/api/cloud/scan"],
  ["POST", "/api/aria/actions/x/approve"],
  ["POST", "/api/aria/finops/x/terminate"],
  ["POST", "/api/aria/config/healing-mode"],
];

// ── 1. Alert routes ────────────────────────────────────────────────────────

test("alert-route mutations need ADMIN or SECOPS; listing keeps its read policy", () => {
  for (const path of ["/api/alert-routes", "/api/alert-routes/r-1"]) {
    for (const m of MUTATIONS) {
      assert.deepEqual(apiRequiredRoles(path, m), ["ADMIN", "SECOPS"], `${m} ${path}`);
      for (const role of [...LOW, "DESIGNER", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST"] as Role[]) {
        assert.equal(roleMayCallApi(role, path, m), false, `${role} ${m} ${path}`);
      }
      assert.equal(roleMayCallApi("ADMIN", path, m), true);
      assert.equal(roleMayCallApi("SECOPS", path, m), true);
    }
  }
  assert.equal(apiRequiredRoles("/api/alert-routes", "GET"), "any", "listing kept its read policy");
});

// The Go API lives beside this app only in the monorepo; the standalone
// frontend repository skips this cross-check and the monorepo enforces it.
const GO_MAIN = join(ROOT, "..", "api", "main.go");
test("the Go API also requires OPERATOR to create alert routes", { skip: !existsSync(GO_MAIN) && "Go API source is not in this repository" }, () => {
  const go = readFileSync(GO_MAIN, "utf8");
  assert.ok(go.includes('mux.HandleFunc("/api/alert-routes", tierByMethod(TierAuto, TierOperator, handleAlertRoutes(db)))'), "Go lets the read tier create alert routes");
});

// ── 2. API keys ────────────────────────────────────────────────────────────

test("only ADMIN may create or delete API keys", () => {
  for (const path of ["/api/api-keys", "/api/api-keys/k-1"]) {
    for (const m of MUTATIONS) {
      assert.deepEqual(apiRequiredRoles(path, m), ["ADMIN"], `${m} ${path}`);
      for (const role of ["VIEWER", "AUDITOR", "CLIENT", "DESIGNER", "SECOPS", "SOC_LEAD", "DEVSECOPS"] as Role[]) {
        assert.equal(roleMayCallApi(role, path, m), false, `${role} ${m} ${path}`);
      }
      assert.equal(roleMayCallApi("ADMIN", path, m), true);
    }
  }
  assert.deepEqual(MUTATION_POLICY.map((p) => p.prefix).sort(), ["/api/alert-routes", "/api/api-keys"]);
});

// ── 3. E2 / ARIA internal routes ───────────────────────────────────────────

test("no /api/aria/* E2 route is reachable by VIEWER, AUDITOR, CLIENT or DESIGNER", () => {
  const routes = ariaRoutes();
  assert.ok(routes.length >= 15, `only ${routes.length} E2 routes found`);
  for (const path of routes) {
    const required = apiRequiredRoles(path);
    assert.ok(Array.isArray(required), `${path} is ${JSON.stringify(required)}, not role-gated`);
    for (const role of [...LOW, "DESIGNER"] as Role[]) {
      for (const m of ["GET", "POST"]) assert.equal(roleMayCallApi(role, path, m), false, `${role} ${m} ${path}`);
    }
  }
});

test("legitimate E2 readers keep their access; configuration stays ADMIN-only", () => {
  for (const path of ["/api/aria/status", "/api/aria/jobs/x", "/api/aria/graph", "/api/aria/audit-trail", "/api/aria/threat-intel", "/api/aria/finops/summary", "/api/aria/predictions"]) {
    for (const role of E2_READERS) assert.equal(roleMayCallApi(role, path), true, `${role} lost ${path}`);
  }
  assert.deepEqual(apiRequiredRoles("/api/aria/config/healing-mode", "POST"), ["ADMIN"]);
  assert.deepEqual(apiRequiredRoles("/api/aria/config/settings"), ["ADMIN"]);
});

// ── 4. Legacy dashboard pages (direct navigation) ──────────────────────────

test("protected legacy pages refuse direct navigation by VIEWER, AUDITOR, CLIENT and DESIGNER", () => {
  for (const page of PROTECTED_PAGES) {
    for (const role of [...LOW, "DESIGNER"] as Role[]) {
      assert.equal(isRoleAllowed(page, role), false, `${role} can open ${page}`);
      assert.equal(isRoleAllowed(`${page}/deep/link`, role), false, `${role} can open ${page}/deep/link`);
    }
  }
});

test("internal roles keep the legacy pages they had", () => {
  for (const page of ["/dashboard/executive", "/dashboard/plan", "/dashboard/attack-graph", "/dashboard/ai-security", "/dashboard/threat-intel", "/dashboard/finops-security", "/dashboard/incidents"]) {
    for (const role of INTERNAL_ROLES) assert.equal(isRoleAllowed(page, role), true, `${role} lost ${page}`);
  }
  for (const page of ["/dashboard/queue", "/dashboard/soc", "/dashboard/audit-trail-legacy", "/dashboard/aria"]) {
    for (const role of ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] as Role[]) assert.equal(isRoleAllowed(page, role), true, `${role} lost ${page}`);
  }
  assert.equal(isRoleAllowed("/dashboard/datasets", "ADMIN"), true);
  assert.equal(isRoleAllowed("/dashboard/admin/platform", "ADMIN"), true);
});

test("customer roles keep the product dashboard", () => {
  for (const page of ["/dashboard", "/dashboard/overview", "/dashboard/controls", "/dashboard/findings", "/dashboard/remediation", "/dashboard/assurance", "/dashboard/reports/evidence", "/dashboard/cloud-accounts", "/dashboard/compliance"]) {
    for (const role of LOW) assert.equal(isRoleAllowed(page, role), true, `${role} lost ${page}`);
  }
  assert.equal(isRoleAllowed("/dashboard/audit-trail", "AUDITOR"), true);
  assert.equal(isRoleAllowed("/dashboard/findings-legacy", "CLIENT"), true, "findings-legacy shows no E2 content");
});

// ── Low-privilege roles: remediation, approvals, credentials, scans ───────

test("VIEWER, AUDITOR, CLIENT and DESIGNER cannot execute, approve, scan or reach credentials", () => {
  for (const role of [...LOW, "DESIGNER"] as Role[]) {
    for (const [m, path] of DENIED_ACTIONS) assert.equal(roleMayCallApi(role, path, m), false, `${role} ${m} ${path}`);
  }
  for (const [m, path] of DENIED_ACTIONS.filter(([, p]) => !p.includes("/aria/config"))) {
    assert.equal(roleMayCallApi("SECOPS", path, m), true, `SECOPS lost ${m} ${path}`);
  }
});

// ── DESIGNER ───────────────────────────────────────────────────────────────

test("DESIGNER is deny-by-default on pages and never equivalent to ADMIN", () => {
  const allowed = ["/dashboard", "/dashboard/overview", "/dashboard/controls/c-1", "/dashboard/findings", "/dashboard/remediation", "/dashboard/assurance/drift", "/dashboard/reports/monthly", "/dashboard/audit-trail", "/dashboard/cloud-accounts"];
  for (const p of allowed) assert.equal(isRoleAllowed(p, "DESIGNER"), true, p);
  const denied = ["/onboarding", "/dashboard/findings-legacy", "/dashboard/compliance", "/dashboard/exports", "/dashboard/services", "/dashboard/operations", "/dashboard/control-posture", "/dashboard/assurance-legacy", "/dashboard/guard", "/dashboard/dspm", "/dashboard/iac", "/dashboard/k8s", "/dashboard/zero-trust", "/dashboard/anything-new"];
  for (const p of denied) assert.equal(isRoleAllowed(p, "DESIGNER"), false, `DESIGNER can open ${p}`);
  // "/dashboard" is exact: it must not become a prefix that opens everything.
  assert.deepEqual(DESIGNER_ROUTES.filter((r) => r.exact).map((r) => r.path), ["/dashboard"]);
  for (const r of ROLE_ROUTES) {
    if (!r.allow.includes("VIEWER")) assert.equal(isRoleAllowed(r.prefix, "DESIGNER"), r.prefix === "/dashboard/audit-trail", `DESIGNER can open ${r.prefix}`);
  }
});

test("DESIGNER API access is its allowlist only: no admin, E2, mutation or any-role routes", () => {
  for (const [m, path] of [["GET", "/api/controls"], ["GET", "/api/findings"], ["GET", "/api/evidence"], ["GET", "/api/assurance/ledger"], ["GET", "/api/auth/me"], ["POST", "/api/auth/password"]]) {
    assert.equal(roleMayCallApi("DESIGNER", path, m), true, `${m} ${path}`);
  }
  for (const [m, path] of [
    ["POST", "/api/controls/c-1/verify"], ["DELETE", "/api/auth/account"], ["GET", "/api/auth/users"], ["POST", "/api/auth/users"],
    ["GET", "/api/api-keys"], ["GET", "/api/alert-routes"], ["GET", "/api/export"], ["GET", "/api/usage"], ["GET", "/api/notifications"],
    ["GET", "/api/audit-trail"], ["GET", "/api/cloud/resources"], ["GET", "/api/admin/leads"], ["GET", "/api/datasets"],
    ["GET", "/api/organizations"], ["POST", "/api/feedback"], ["GET", "/api/system-health"], ["GET", "/api/email-logs"],
  ]) {
    assert.equal(roleMayCallApi("DESIGNER", path, m), false, `DESIGNER ${m} ${path}`);
  }
  for (const d of DESIGNER_API) {
    for (const m of d.methods) if (m !== "GET") assert.ok(/^\/api\/(auth|telemetry|audit\/client-event)/.test(d.prefix), `DESIGNER may ${m} ${d.prefix}`);
  }
});

test("middleware enforces the method-aware decision", () => {
  const mw = readFileSync(join(ROOT, "middleware.ts"), "utf8");
  assert.ok(mw.includes("apiRequiredRoles(pathname, req.method)"), "middleware ignores the request method");
  assert.ok(mw.includes("!roleMayCallApi(session.role, pathname, req.method)"), "middleware does not use the shared decision");
  assert.ok(mw.includes("if (!isRoleAllowed(pathname, session.role))"), "middleware does not gate dashboard pages");
  const auth = readFileSync(join(ROOT, "lib", "auth.ts"), "utf8");
  assert.ok(auth.includes('export { isRoleAllowed } from "./dashboard-authz";'));
});
