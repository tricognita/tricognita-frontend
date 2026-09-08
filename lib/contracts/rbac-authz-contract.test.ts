/**
 * RBAC middleware↔handler authorization contract test (LOOP2-A).
 *
 * Invariant: the middleware classification (lib/api-authz.ts → apiRequiredRoles)
 * must NEVER admit a role that the route handler rejects on every method. i.e.
 * middleware-admitted-roles ⊆ handler-allowed-roles. If middleware is looser than
 * the handler, a future dropped handler-check becomes a silent privilege escalation.
 *
 * The handler is the source of truth. This test statically scans every
 * app/api/ ** /route.ts, derives each method's `session.role !== "X"` guard, and
 * fails whenever the middleware class is looser than a uniformly-gated handler.
 *
 * Runs in CI via the `test` script glob (lib/contracts/*.test.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { apiRequiredRoles } from "../api-authz";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const API_DIR = join(HERE, "..", "..", "app", "api");
const FRONTEND = join(HERE, "..", "..");

// Routes intentionally exempt from the ⊆ invariant, WITH the reason. Keep tiny.
const EXCEPTIONS: Record<string, string> = {
  // handler enforces ADMIN, but the sub-path /api/system-health/e2e is
  // intentionally any-auth; prefix classification cannot split parent/child.
  "/api/system-health": "sub-path /e2e is any-auth; handler is the real gate",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e === "route.ts") out.push(p);
  }
  return out;
}

// filesystem path → route path, resolving Next dynamic segments ([id] → :id ignored)
function routePath(file: string): string {
  const rel = relative(API_DIR, file).replace(/\/route\.ts$/, "");
  return "/api/" + rel;
}

const HTTP = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** roles a method's in-body guard ALLOWS, or "any" if it has no session.role guard. */
function methodAllowed(body: string): Set<string> | "any" {
  // match: if (session.role !== "A" [&& session.role !== "B" ...]) { ... 403 ... }
  const m = body.match(/session\.role\s*!==\s*"([A-Z_]+)"(?:\s*&&\s*session\.role\s*!==\s*"([A-Z_]+)")*/);
  if (!m) return "any";
  const roles = new Set<string>();
  for (const r of body.matchAll(/session\.role\s*!==\s*"([A-Z_]+)"/g)) roles.add(r[1]);
  // guard must actually deny (return 403) to count
  return /403/.test(body.slice(body.indexOf("session.role"))) ? roles : "any";
}

function methodBodies(src: string): string[] {
  const bodies: string[] = [];
  for (const name of HTTP) {
    const re = new RegExp(`export\\s+(?:const\\s+${name}\\s*=|async\\s+function\\s+${name})`);
    const idx = src.search(re);
    if (idx === -1) continue;
    // body = from this export to the next export or EOF (approx, good enough for guards)
    const rest = src.slice(idx + 10);
    const next = rest.search(/export\s+(?:const\s+(?:GET|POST|PUT|PATCH|DELETE)|async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE))/);
    bodies.push(next === -1 ? rest : rest.slice(0, next));
  }
  return bodies;
}

test("RBAC: middleware class ⊆ handler role gate (no looser-than-handler drift)", () => {
  const violations: string[] = [];
  for (const file of walk(API_DIR)) {
    const src = readFileSync(file, "utf8");
    const path = routePath(file);
    const bodies = methodBodies(src);
    if (bodies.length === 0) continue;

    // uniform handler gate: every method shares the SAME explicit allowed set
    const sets = bodies.map(methodAllowed);
    if (sets.some(s => s === "any")) continue;         // a method is open → not uniformly gated
    const first = sets[0] as Set<string>;
    const uniform = sets.every(s => s !== "any" && s.size === first.size && [...s].every(r => first.has(r)));
    if (!uniform) continue;                            // mixed per-method → handler-protected, skip

    if (EXCEPTIONS[path]) continue;

    const mw = apiRequiredRoles(path);
    const mwAdmits = mw === "public" || mw === "any"
      ? "ALL"
      : mw === "deny" ? [] : (mw as string[]);
    if (mwAdmits === "ALL") {
      violations.push(`${path}: handler gates to {${[...first]}} but middleware admits ANY authenticated role`);
    } else {
      const outside = (mwAdmits as string[]).filter(r => !first.has(r));
      if (outside.length) violations.push(`${path}: handler gates to {${[...first]}} but middleware also admits {${outside}}`);
    }
  }
  assert.equal(violations.length, 0, "RBAC drift (middleware looser than handler):\n  " + violations.join("\n  "));
});

// Explicit regression locks for the LOOP2-A fixes + the intentionally-open routes.
test("RBAC: LOOP2-A fixed classifications are exact", () => {
  assert.deepEqual(apiRequiredRoles("/api/admin/incidents"), ["ADMIN"]);
  assert.deepEqual(apiRequiredRoles("/api/organizations"), ["ADMIN"]);
  assert.deepEqual(apiRequiredRoles("/api/datasets"), ["ADMIN"]);
  assert.deepEqual(apiRequiredRoles("/api/datasets/export"), ["ADMIN"]); // via prefix
  assert.deepEqual(apiRequiredRoles("/api/marketing/leads"), ["ADMIN", "SECOPS"]);
  // unchanged (no handler gate → correctly any-auth; NOT narrowed):
  assert.equal(apiRequiredRoles("/api/export"), "any");
  assert.equal(apiRequiredRoles("/api/notifications"), "any");
  assert.equal(apiRequiredRoles("/api/email-logs"), "any");
});
