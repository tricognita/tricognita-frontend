/**
 * test-authz-boundary.ts — Batch 2.1 authorization verification.
 *
 * Run from frontend/:  npx tsx test-authz-boundary.ts
 *
 * The repo has no unit-test runner; ad-hoc verification scripts are the
 * convention (see CLAUDE.md). This asserts the middleware authorization
 * policy after the Batch 2.1 default-deny change:
 *   1. every real /api route has an explicit policy (never "deny")
 *   2. unclassified routes fail closed ("deny")
 *   3. sensitive admin/operator routes are ADMIN-only
 *   4. public + authenticated any-role routes preserved
 *   5. feature role matrix (findings / scan / credentials)
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { apiRequiredRoles } from "./lib/api-authz";

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error("FAIL: " + name);
  }
}

// ── 1. every real BFF route has an explicit policy (never "deny") ──
function walk(dir: string, base = "/api"): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      let seg = e.name;
      if (seg.startsWith("[[")) seg = "__catchall__";
      else if (seg.startsWith("[")) seg = "sampleId";
      out.push(...walk(join(dir, e.name), `${base}/${seg}`));
    } else if (e.name === "route.ts") {
      out.push(base);
    }
  }
  return out;
}
const routes = walk("app/api");
check("discovered a realistic number of routes", routes.length > 80);
for (const r of routes) {
  // catch-all routes ([[...path]]) are exercised via explicit subpaths below,
  // because a generic path under them SHOULD fail closed.
  if (r.includes("__catchall__")) continue;
  check(`policy exists (not deny): ${r}`, apiRequiredRoles(r) !== "deny");
}

// ── 2. fail-closed for unclassified routes ──
check("unclassified → deny", apiRequiredRoles("/api/definitely-not-real") === "deny");
check("new aria endpoint → deny", apiRequiredRoles("/api/aria/brand-new-secret") === "deny");
check("unknown guard subpath → deny", apiRequiredRoles("/api/guard/unknown-op") === "deny");

// ── 3. sensitive admin/operator routes → ADMIN only ──
const adminOnly = [
  "/api/auth/admin-reset-password",
  "/api/auth/users",
  "/api/admin/ops",
  "/api/admin/platform",
  "/api/admin/webhooks",
  "/api/admin/webhook-drain",
  "/api/admin/health-aggregate",
  "/api/admin/deployment-verify",
  "/api/admin/exports/siem.ndjson",
  "/api/aria/config/healing-mode",
];
for (const p of adminOnly) {
  const r = apiRequiredRoles(p);
  check(`ADMIN-only: ${p}`, Array.isArray(r) && r.length === 1 && r[0] === "ADMIN");
}

// ── 4. public routes preserved ──
for (const p of ["/api/auth/login", "/api/healthz", "/api/leads", "/api/marketing/contact"]) {
  check(`public: ${p}`, apiRequiredRoles(p) === "public");
}

// ── 5. authenticated any-role routes preserved ──
for (const p of ["/api/auth/me", "/api/usage", "/api/notifications", "/api/admin/incidents", "/api/version"]) {
  check(`any-role: ${p}`, apiRequiredRoles(p) === "any");
}

// ── 6. feature role matrix ──
function roles(p: string): string[] {
  const r = apiRequiredRoles(p);
  return Array.isArray(r) ? r : [];
}
check("findings readable by AUDITOR", roles("/api/findings").includes("AUDITOR"));
check("findings readable by VIEWER", roles("/api/findings").includes("VIEWER"));
check("scan requires SECOPS-tier", roles("/api/scan").includes("SECOPS"));
check("scan excludes VIEWER", !roles("/api/scan").includes("VIEWER"));
check("scan excludes AUDITOR", !roles("/api/scan").includes("AUDITOR"));
check("credentials excludes VIEWER", roles("/api/credentials").length > 0 && !roles("/api/credentials").includes("VIEWER"));

if (failures > 0) {
  console.error(`\n${failures} authorization assertion(s) FAILED`);
  process.exit(1);
}
console.log("PASS: all authorization boundary assertions passed.");
