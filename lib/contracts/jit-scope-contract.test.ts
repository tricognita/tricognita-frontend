/**
 * JIT scope contract — the downstream half of the pact begun in
 * product-api-authz-contract.test.ts.
 *
 * That file pins the frontend edge (api-authz.ts) to the product capability
 * roster. It says nothing about what happens next: the BFF route that edge
 * check admits still mints its own JIT token for the Go API, and that token
 * carries a *tier* (frontend/lib/jit-token.ts's tierForRole), not the route
 * list. If a role's tier lacks a scope the Go API requires for a route
 * api-authz.ts already promised that role, the browser sees a 200 from the
 * edge and a 403 from the BFF — exactly the AUDITOR/VIEWER -> /api/evidence
 * bug the NEON2 rehearsal found (frontend/lib/api-authz.ts's AUDITOR_API
 * list admitted them; their AUTO tier lacked audit:read in
 * api/signing.go's tierScopes).
 *
 * The Go side of this contract lives in Go and can't be imported here, so
 * GO_TIER_SCOPES and ROLE_TIER below are explicit, commented mirrors of
 * api/signing.go's tierScopes and jit-token.ts's (unexported) tierForRole.
 * This is deliberate cross-language pinning, not shared logic: if either
 * source changes, this file and api/authz_matrix_test.go's
 * TestScopeMatrix_EndToEnd must both be updated, and a mismatch here is
 * exactly the signal that they drifted.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// getRequiredEnv (pulled in transitively via jit-token -> env) validates the
// *entire* REQUIRED_SERVER_ENV list on first call, not just the requested
// key, so all of it must be present here even though only SENTINEL_JIT_SECRET
// is actually read by getJitToken.
process.env.SENTINEL_JIT_SECRET = "jit-scope-contract-test-secret-32-bytes!";
process.env.SESSION_SECRET ??= "jit-scope-contract-test-session-32-bytes!";
process.env.BOOTSTRAP_RESET_TOKEN ??= "jit-scope-contract-test-reset-24b!";
process.env.SENTINEL_API_URL ??= "http://localhost:0";
process.env.DEMO_ADMIN_PASSWORD ??= "jit-scope-contract-test-pw!";

// lib/env.ts does `import "server-only"`, and that package's real
// implementation unconditionally throws — its "no-op on the server" behavior
// only exists because Next.js's bundler aliases it away for server bundles.
// Outside that bundler (this plain node --test run) it throws on require, so
// no file that imports lib/env.ts has ever been importable from a test here.
// Pre-seed Node's CJS module cache with an inert stub for it before jit-token
// (which imports env.ts) is loaded. This is test-process-local only — it
// does not touch tsconfig or any Next.js build config, so the real package
// still enforces the server/client boundary in the actual app.
//
// Static `import` statements are hoisted and evaluated before any other
// top-level code regardless of source order, so a static import of
// ../jit-token here would run before this seeding ever executed. It must be
// a dynamic import, performed after the seed below.
{
  const req = createRequire(import.meta.url);
  const resolved = req.resolve("server-only");
  const Module = req("node:module");
  (Module as any)._cache[resolved] = { id: resolved, exports: {}, loaded: true };
}

import type { Role } from "@/lib/auth";
import { apiRequiredRoles } from "../api-authz";

// Dynamic (not static) import: must run after the module-cache seed above,
// and top-level await isn't available under this file's CJS transform, so
// this is loaded once, lazily, on first use.
let jitTokenModule: typeof import("../jit-token") | null = null;
async function loadGetJitToken() {
  jitTokenModule ??= await import("../jit-token");
  return jitTokenModule.getJitToken;
}

// Mirrors api/signing.go's tierScopes.
const GO_TIER_SCOPES = {
  AUTO: new Set(["scan:read", "alerts:read", "audit:read"]),
  OPERATOR: new Set(["scan:read", "scan:execute", "alerts:read", "remediate:execute", "audit:read"]),
  DUAL_CONTROL: new Set(["scan:read", "scan:execute", "alerts:read", "remediate:execute", "audit:read"]),
  CISO: new Set(["admin:all"]),
} as const;
type GoTier = keyof typeof GO_TIER_SCOPES;

// Mirrors jit-token.ts's tierForRole. jit-token.ts does not export that
// function — its actual behavior is exercised below via getJitToken's minted
// `tier` claim, not via this map. This map only computes, per test case,
// which tier a role SHOULD land in, so failures name the role, not just
// a tier mismatch.
const ROLE_TIER: Record<Role, GoTier> = {
  ADMIN: "OPERATOR",
  SECOPS: "OPERATOR",
  SOC_LEAD: "OPERATOR",
  DEVSECOPS: "OPERATOR",
  CLOUD_ENGINEER: "OPERATOR",
  AUDITOR: "AUTO",
  RED_TEAMER: "AUTO",
  FINOPS_ANALYST: "AUTO",
  CLIENT: "AUTO",
  VIEWER: "AUTO",
  DESIGNER: "AUTO",
};

// Routes governed by AUDITOR_API in api-authz.ts and the Go scope each
// requires (api/main.go's requireScope call for that handler).
const ROUTE_SCOPE: Array<{ path: string; scope: string }> = [
  { path: "/api/evidence", scope: "audit:read" },
  { path: "/api/controls", scope: "scan:read" },
  { path: "/api/verification-runs", scope: "scan:read" },
  { path: "/api/cloud-accounts", scope: "scan:read" },
];

function decodeTier(token: string): string {
  const parts = token.split(".");
  const json = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(json).tier;
}

test("every role api-authz.ts admits to a route can actually reach it downstream", () => {
  for (const { path, scope } of ROUTE_SCOPE) {
    const required = apiRequiredRoles(path);
    if (!Array.isArray(required)) continue; // "any"/"public"/"deny" — not this contract's concern
    for (const role of required) {
      const tier = ROLE_TIER[role];
      assert.ok(
        GO_TIER_SCOPES[tier].has(scope),
        `${role} (tier ${tier}) is admitted to ${path} by api-authz.ts, but that tier ` +
          `lacks "${scope}" in api/signing.go's tierScopes — the BFF would 403 downstream`,
      );
    }
  }
});

test("AUDITOR's minted token carries a tier that includes audit:read", async () => {
  const getJitToken = await loadGetJitToken();
  const token = await getJitToken({ sub: "auditor@example.com", role: "AUDITOR", tenantId: "t" });
  const tier = decodeTier(token);
  assert.equal(tier, "AUTO");
  assert.ok(GO_TIER_SCOPES[tier as GoTier].has("audit:read"));
});

test("VIEWER's minted token carries a tier that includes audit:read, matching the evidence contract", async () => {
  // Only asserted because api-authz.ts's AUDITOR_API list includes VIEWER for
  // /api/evidence today. If that contract narrows to exclude VIEWER, this
  // test's premise (checked below) goes false and it must be updated too.
  const required = apiRequiredRoles("/api/evidence");
  assert.ok(
    Array.isArray(required) && required.includes("VIEWER"),
    "VIEWER is no longer listed for /api/evidence in api-authz.ts — this test's premise is stale",
  );
  const getJitToken = await loadGetJitToken();
  const token = await getJitToken({ sub: "viewer@example.com", role: "VIEWER", tenantId: "t" });
  assert.equal(decodeTier(token), "AUTO");
});

test("SECOPS and ADMIN are unaffected — still OPERATOR", async () => {
  const getJitToken = await loadGetJitToken();
  for (const role of ["SECOPS", "ADMIN"] as const) {
    const token = await getJitToken({ sub: `${role}@example.com`, role, tenantId: "t" });
    assert.equal(decodeTier(token), "OPERATOR");
  }
});

test("AUTO tier never carries execute or admin scopes — the fix is additive-read-only", () => {
  const auto = GO_TIER_SCOPES.AUTO;
  assert.equal(auto.has("scan:execute"), false);
  assert.equal(auto.has("remediate:execute"), false);
  assert.equal(auto.has("admin:all"), false);
});

test("a forged tier/scope field on the options object cannot change the minted tier", async () => {
  // JITOptions has no `tier` field — this simulates a caller bypassing the
  // type system (or a future refactor loosening it) to inject one directly.
  const forged = {
    sub: "attacker@example.com",
    role: "AUDITOR",
    tenantId: "t",
    tier: "CISO",
    scope: "admin:all",
  } as any;
  const getJitToken = await loadGetJitToken();
  const token = await getJitToken(forged);
  assert.equal(
    decodeTier(token),
    "AUTO",
    "tier must be derived from the verified session role, never from caller-supplied fields",
  );
});

test("an unknown/unlisted role falls back to the safest tier", async () => {
  const getJitToken = await loadGetJitToken();
  const token = await getJitToken({ sub: "u@example.com", role: "NOT_A_REAL_ROLE", tenantId: "t" });
  assert.equal(decodeTier(token), "AUTO");
});
