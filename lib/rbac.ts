/**
 * lib/rbac.ts — Frontend RBAC capability matrix
 *
 * Single source of truth for "can this role do X?" decisions.
 * Mirrors the backend middleware permission sets (middleware.ts ADMIN_API /
 * SECOPS_API / AUDITOR_API) so the frontend never calls an endpoint the
 * backend will reject.
 *
 * Rules:
 *  - Never weakens backend auth — this is purely additive suppression.
 *  - All capability checks are pure functions (no side effects, no fetches).
 *  - Derived exclusively from the role string in the session token.
 */

import type { Role } from "./auth";

// ─── Plan tiers (matches lib/users.ts:UserPlan) ─────────────────────────────
export type Plan = "free" | "starter" | "professional" | "enterprise";

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
};

// Minimum plan required for each capability. Capabilities not listed are
// available on every plan (defaults to "free"). ADMIN bypasses all plan gates.
const MIN_PLAN: Partial<Record<Capability, Plan>> = {
  viewFinOps:        "starter",
  viewDSPM:          "starter",
  viewIaC:           "professional",
  viewK8s:           "professional",
  viewZeroTrust:     "professional",
  viewAiSecurity:    "professional",
  managePolicies:    "enterprise",
  viewApiKeys:       "enterprise",
  viewAlertRoutes:   "enterprise",
};

// ─── Capability Definitions ────────────────────────────────────────────────
//
// Each capability maps to one or more backend API paths.
// Keep in sync with middleware.ts ADMIN_API / SECOPS_API / AUDITOR_API.

export type Capability =
  // ADMIN-only (middleware ADMIN_API)
  | "manageUsers"          // /api/auth/users
  | "manageSettings"       // /api/aria/config/settings, /api/aria/config/healing-mode
  | "viewSystemHealth"     // /api/system-health/e2e (ADMIN=full, SECOPS=internal, CLIENT=tenant)
  | "viewApiKeys"          // /api/api-keys
  // ADMIN + SECOPS (write operations)
  | "viewAlertRoutes"      // /api/alert-routes
  | "managePolicies"       // /api/guard/policies
  // SECOPS-tier (ADMIN + SECOPS + SOC_LEAD + DEVSECOPS + ...)
  | "triggerScan"          // /api/scan, /api/cloud/scan
  | "triggerRemediate"     // /api/remediate
  | "viewAria"             // /api/aria/actions, /api/aria/stream, /api/aria/predictions, /api/aria/rca
  | "viewFinOps"           // /api/aria/finops/summary, /api/aria/finops/findings
  | "viewCredentials"      // /api/credentials
  | "viewDSPM"             // /api/dspm/assets
  | "viewIaC"              // /api/iac/scan
  | "viewK8s"              // /api/k8s/audit
  | "viewZeroTrust"        // /api/aria/zero-trust
  // AUDITOR-tier (ADMIN + SECOPS + AUDITOR + SOC_LEAD + DEVSECOPS + CLIENT + VIEWER)
  | "viewAuditTrail"       // /api/audit-trail, /api/aria/rca (in audit context)
  | "viewFindings"         // /api/findings
  | "viewCompliance"       // /api/compliance/score, /api/compliance/controls
  | "viewCloudResources"   // /api/cloud/resources
  // Any authenticated user
  | "viewAriaStatus"       // /api/aria/status (middleware: any authenticated)
  | "viewGuardStats"       // /api/guard/stats, /api/guard/interactions, /api/guard/report
  | "viewNotifications"    // /api/notifications
  | "viewAttackGraph"      // /api/aria/graph (any authenticated)
  | "viewThreatIntel"      // /api/threatintel (any authenticated)
  | "viewIncidents"        // /api/aria/actions (read-only incident list — SECOPS tier)
  | "viewAiSecurity";      // /api/aria/... ai-security endpoints (SECOPS tier)

// ─── Permission Matrix ─────────────────────────────────────────────────────

const CAPABILITIES: Record<Capability, Role[]> = {
  // ADMIN-only
  manageUsers:        ["ADMIN"],
  manageSettings:     ["ADMIN"],
  // viewSystemHealth is open to all roles — the backend returns role-scoped data:
  //   ADMIN   → full infra check
  //   SECOPS/DEVSECOPS/SOC_LEAD → internal-only checks
  //   CLIENT/VIEWER/AUDITOR → tenant-scoped posture/compliance/findings
  viewSystemHealth:   ["ADMIN", "SECOPS", "DEVSECOPS", "SOC_LEAD", "AUDITOR", "CLIENT", "VIEWER"],
  viewApiKeys:        ["ADMIN"],

  // ADMIN + SECOPS
  viewAlertRoutes:    ["ADMIN", "SECOPS"],
  managePolicies:     ["ADMIN", "SECOPS", "SOC_LEAD"],

  // SECOPS-tier (matches middleware SECOPS_API allowed roles)
  triggerScan:        ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"],
  triggerRemediate:   ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"],
  viewAria:           ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"],
  viewFinOps:         ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "FINOPS_ANALYST"],
  viewCredentials:    ["ADMIN", "SECOPS", "CLOUD_ENGINEER", "DEVSECOPS"],
  viewDSPM:           ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"],
  viewIaC:            ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"],
  viewK8s:            ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"],
  viewZeroTrust:      ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"],
  viewIncidents:      ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "RED_TEAMER"],
  viewAiSecurity:     ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"],

  // AUDITOR-tier (all internal roles + CLIENT can read compliance/findings)
  viewAuditTrail:     ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"],
  viewFindings:       ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT", "VIEWER"],
  viewCompliance:     ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT", "VIEWER"],
  viewCloudResources: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLIENT", "VIEWER"],
  viewGuardStats:     ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"],

  // Any authenticated user
  viewAriaStatus:     ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "DEVSECOPS", "SOC_LEAD", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT"],
  viewNotifications:  ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "DEVSECOPS", "SOC_LEAD", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT"],
  viewAttackGraph:    ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "DEVSECOPS", "SOC_LEAD", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT"],
  viewThreatIntel:    ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "DEVSECOPS", "SOC_LEAD", "CLOUD_ENGINEER", "RED_TEAMER", "FINOPS_ANALYST", "CLIENT"],
};

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * canDo(role, capability) — returns true if `role` is allowed to perform
 * `capability`. Returns false if role is undefined (not yet loaded).
 *
 * Usage in components:
 *   const key = canDo(role, "viewFinOps") ? "/api/aria/finops/summary" : null;
 *   const { data } = useSWR(key, fetcher);
 */
export function canDo(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return CAPABILITIES[capability].includes(role);
}

/**
 * isAdminRole — convenience helper for ADMIN-only blocks.
 */
export function isAdminRole(role: Role | undefined | null): boolean {
  return role === "ADMIN";
}

/**
 * isClientRole — read-only external client (most restricted internal role).
 */
export function isClientRole(role: Role | undefined | null): boolean {
  return role === "CLIENT" || role === "VIEWER";
}

/**
 * canUsePlan(plan, capability) — returns true if `plan` meets the minimum
 * tier required for `capability`. Capabilities with no MIN_PLAN entry are
 * always allowed.
 */
export function canUsePlan(plan: Plan | undefined | null, capability: Capability): boolean {
  const min = MIN_PLAN[capability];
  if (!min) return true;
  if (!plan) return false;
  return PLAN_RANK[plan] >= PLAN_RANK[min];
}

/**
 * canUseModule(modules, module) — returns true if `module` is in the user's
 * assigned modules array. If `modules` is null/undefined, all modules are
 * permitted (used for ADMIN and pre-modules accounts).
 */
export function canUseModule(modules: string[] | undefined | null, module: string): boolean {
  if (!modules) return true;
  return modules.includes(module);
}

/**
 * canAccess(user, capability) — combined RBAC + plan check.
 * ADMIN bypasses plan gates. Other roles must satisfy both checks.
 */
export function canAccess(
  user: { role?: Role | null; plan?: Plan | null } | null | undefined,
  capability: Capability,
): boolean {
  if (!user || !user.role) return false;
  if (!canDo(user.role, capability)) return false;
  if (user.role === "ADMIN") return true;
  return canUsePlan(user.plan ?? "free", capability);
}

/**
 * swrKey(condition, key) — returns the SWR key only if condition is true.
 * Passing null to SWR disables the fetch entirely (no HTTP request made).
 *
 * Usage:
 *   const { data } = useSWR(swrKey(canDo(role, "viewFinOps"), "/api/aria/finops/summary"), fetcher);
 */
export function swrKey(condition: boolean, key: string): string | null {
  return condition ? key : null;
}
