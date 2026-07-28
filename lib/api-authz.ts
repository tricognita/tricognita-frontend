/**
 * lib/api-authz.ts — canonical authorization policy for every /api route.
 *
 * This module is intentionally dependency-free (only a compile-time
 * `import type`) so it can be unit-tested without the Next.js runtime
 * (see frontend/test-authz-boundary.ts). It is imported by middleware.ts,
 * which remains the single enforcement point.
 *
 * GOVERNANCE: this file defines the edge authorization boundary. It is owned
 * by CODEOWNERS (`* @NITHISH282620`) and MUST be added to the
 * auth-boundary-guard blocking check's PROTECTED list
 * (.github/workflows/frontend-pr.yml) alongside middleware.ts.
 *
 * Batch 2.1 change: the classifier now FAILS CLOSED — a route that matches no
 * list returns "deny" (previously it returned "any", an implicit default-allow).
 * Every /api route must be classified into exactly one list below.
 */
import type { Role } from "./auth";

// Public API paths — no auth required.
export const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/bootstrap-reset",
  "/api/marketing/contact",
  "/api/contact",
  "/api/healthz",
  "/api/leads",                 // marketing-site lead capture (rate-limited)
];

// API paths requiring ADMIN.
export const ADMIN_API = [
  "/api/auth/users",
  "/api/aria/config/settings",
  "/api/aria/config/healing-mode",
  "/api/guard/policies",  // policy write operations
  "/api/admin/feedback",  // cross-tenant feedback inbox (per-handler also checks)
  "/api/admin/insights",  // product telemetry rollup (per-handler also checks)
  "/api/admin/commercial",  // cross-tenant commercial view (per-handler also checks)
  "/api/admin/demo-reset",  // demo-mode only; per-handler returns 404 outside demo
  "/api/admin/leads",       // founder leads inbox (per-handler also checks)
  "/api/admin/pilot-health",// per-tenant pilot health rollup (per-handler also checks)
  // ── Batch 2.1: operator/admin endpoints that previously fell through to the
  // implicit default-allow. Safe to tighten — the dashboard already gates these
  // pages to ADMIN, so no non-admin role ever calls them.
  "/api/auth/admin-reset-password", // resets OTHER users' passwords → ADMIN only
  "/api/admin/ops",
  "/api/admin/platform",
  "/api/admin/webhook",             // covers /admin/webhooks and /admin/webhook-drain
  "/api/admin/health-aggregate",
  "/api/admin/deployment-verify",
  "/api/admin/exports",             // SIEM export (/admin/exports/siem.ndjson)
  // ── RBAC drift fix (LOOP2-A): these handlers enforce `session.role !== "ADMIN"`
  // → 403 on EVERY method, so their classification must be ADMIN (was AUTHENTICATED,
  // i.e. middleware looser than the handler). Verified per-method; narrow-only, no
  // behavioural change (non-admins were already 403'd by the handler).
  "/api/admin/incidents",           // handler is ADMIN-only on GET/POST/PATCH (the
                                    // old "SOC/Queue consumes it for non-admins"
                                    // comment was STALE — the handler 403s them; see
                                    // finding LOOP2-A-1)
  "/api/organizations",             // GET/POST both `!== ADMIN` → 403
  "/api/datasets",                  // requireDatasetAccess() returns 401 for non-ADMIN
                                    // (covers /api/datasets/export via prefix)
];

// API paths whose handler enforces exactly { ADMIN, SECOPS } on every method.
// A precise bucket is required because ADMIN_API would drop SECOPS (regression) and
// SECOPS_API would admit 5 roles the handler rejects (drift). RBAC drift fix (LOOP2-A).
export const ADMIN_SECOPS_API = [
  "/api/marketing/leads",           // handler: `!== ADMIN && !== SECOPS` → 403
];

// API paths requiring ADMIN or SECOPS-tier.
export const SECOPS_API = [
  "/api/scan",
  "/api/remediate",
  "/api/aria/actions",
  "/api/aria/stream",
  "/api/aria/predictions",
  "/api/aria/rca",
  "/api/aria/zero-trust",
  "/api/approvals",
  "/api/aria/finops",
  "/api/aria/ai-security",
  "/api/guard/proxy",    // AI proxy forwarding
  "/api/cloud/scan",
  "/api/dspm/assets",
  "/api/iac/scan",
  "/api/threatintel/lookup",
  "/api/k8s/audit",
  "/api/credentials",
];

// API paths requiring ADMIN, SECOPS, or AUDITOR (read-only compliance).
export const AUDITOR_API = [
  "/api/guard/stats",
  "/api/guard/interactions",
  "/api/guard/report",
  "/api/audit-trail",
  "/api/findings",
  "/api/cloud/resources",
  "/api/compliance/score",
  "/api/compliance/controls",
  "/api/assurance/control-posture",
  "/api/assurance/coverage",
  "/api/assurance/ledger",
  "/api/assurance/verify",
  "/api/assurance/evidence",
];

// API paths accessible to ANY authenticated role. These are self-service
// account routes, telemetry sinks, and broadly-readable feature endpoints that
// intentionally have no role restriction. Listing them EXPLICITLY (rather than
// relying on a default) is what lets the router below fail closed: anything not
// named in one of these lists is denied. When adding a new /api route, classify
// it into exactly one list — an unlisted route returns 403 by design.
export const AUTHENTICATED_API = [
  // self-service account management (a user acting on their own account)
  "/api/auth/account",
  "/api/auth/me",
  "/api/auth/mfa",
  "/api/auth/password",
  "/api/auth/refresh",
  "/api/auth/reset-password",
  // telemetry / platform sinks
  "/api/audit/client-event",
  "/api/telemetry",
  "/api/notifications",
  "/api/feedback",
  "/api/version",
  "/api/system-health",             // NOTE: handler enforces ADMIN, but kept here
                                    // because /api/system-health/e2e (a sub-path)
                                    // is intentionally any-auth; prefix-matching
                                    // can't split them. Handler is the real gate.
  "/api/email-logs",
  "/api/usage",
  // broadly-readable feature endpoints (current behaviour preserved; candidates
  // for per-route tightening in a later milestone)
  "/api/age/graph",
  "/api/alert-routes",
  "/api/api-keys",
  "/api/aria/audit-trail",
  "/api/aria/graph",
  "/api/aria/jobs",
  "/api/aria/status",
  "/api/aria/threat-intel",
  "/api/export",
];

/**
 * apiRequiredRoles — the single authorization policy for every /api route.
 *
 * Returns:
 *   "public" — no auth required
 *   Role[]   — authenticated AND role must be in the list
 *   "any"    — authenticated, any role (explicitly listed)
 *   "deny"   — no policy matched → FAIL CLOSED (Batch 2.1). Previously this
 *              returned "any" (implicit default-allow); an unclassified route
 *              is now denied even to authenticated users.
 */
export function apiRequiredRoles(path: string): Role[] | "any" | "public" | "deny" {
  if (PUBLIC_API.some(p => path.startsWith(p)))   return "public";
  if (ADMIN_API.some(p => path.startsWith(p)))    return ["ADMIN"];
  if (ADMIN_SECOPS_API.some(p => path.startsWith(p))) return ["ADMIN", "SECOPS"];
  // SECOPS_API contains state-changing and SECOPS-tier read paths. CLIENT and
  // AUDITOR are intentionally excluded here (they get read-only access via
  // AUDITOR_API), matching lib/rbac.ts.
  if (SECOPS_API.some(p => path.startsWith(p)))   return ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "RED_TEAMER", "FINOPS_ANALYST", "CLOUD_ENGINEER"];
  if (AUDITOR_API.some(p => path.startsWith(p)))  return ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT", "VIEWER"];
  if (AUTHENTICATED_API.some(p => path.startsWith(p))) return "any"; // authenticated, any role
  return "deny"; // Batch 2.1: fail closed — no policy matched
}
