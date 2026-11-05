/**
 * lib/dashboard-authz.ts — who may open which /dashboard page.
 *
 * Dependency-free (only a compile-time `import type`) so it can be unit-tested
 * without the Next.js runtime, like lib/api-authz.ts. lib/auth.ts re-exports
 * isRoleAllowed; middleware.ts is the single enforcement point, so a direct
 * URL request is decided here, never by menu visibility.
 *
 * GOVERNANCE: part of the edge authorization boundary alongside
 * lib/api-authz.ts and middleware.ts.
 */
import type { Role } from "./auth";

/**
 * Internal platform roles: everyone except the read-only customer-facing roles
 * (VIEWER, AUDITOR, CLIENT) and DESIGNER. The same set apiRequiredRoles grants
 * for SECOPS_API, which holds every /api/aria/* E2 route — so a page that
 * shows E2 content is open to exactly the roles that may read E2 data.
 */
export const INTERNAL_ROLES: Role[] = ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "RED_TEAMER", "FINOPS_ANALYST", "CLOUD_ENGINEER"];

/** Read-only and customer roles: never E2, autonomous or internal operations. */
export const LOW_PRIVILEGE_ROLES: Role[] = ["VIEWER", "AUDITOR", "CLIENT"];

/** Every role that uses the customer dashboard. DESIGNER is deliberately absent. */
const ALL_ROLES: Role[] = ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "SOC_LEAD", "DEVSECOPS", "RED_TEAMER", "FINOPS_ANALYST", "CLOUD_ENGINEER", "CLIENT"];

// ── Zero-Trust Route → Role Map ─────────────────────────────────────────────
// A route listed here requires one of the listed roles. Routes NOT listed are
// open to any authenticated role except DESIGNER (see DESIGNER_ROUTES).
export const ROLE_ROUTES: Array<{ prefix: string; allow: Role[] }> = [
  // ── Admin-only ────────────────────────────────────────────────────────────
  { prefix: "/dashboard/users",                  allow: ["ADMIN"] },
  { prefix: "/dashboard/admin",                  allow: ["ADMIN"] },
  { prefix: "/dashboard/settings",               allow: ["ADMIN", "SECOPS"] },
  // Dataset viewer: backed by the ADMIN-only /api/datasets; shows FinOps terminate records.
  { prefix: "/dashboard/datasets",               allow: ["ADMIN"] },
  // ── Admin + SecOps write operations ──────────────────────────────────────
  { prefix: "/dashboard/guard/policies",         allow: ["ADMIN", "SECOPS", "SOC_LEAD"] },
  { prefix: "/dashboard/zero-trust",             allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] },

  // ── E2 / autonomous / FinOps / internal operations ───────────────────────
  // Legacy pages that show the internal E2 engine, autonomous or FinOps
  // content, or call internal operations APIs. Read-only and customer roles
  // (and DESIGNER) must not open them, including by direct URL. Each keeps
  // its previous internal roles; only VIEWER, AUDITOR and CLIENT were removed.
  { prefix: "/dashboard/executive",              allow: INTERNAL_ROLES },
  { prefix: "/dashboard/plan",                   allow: INTERNAL_ROLES },
  { prefix: "/dashboard/attack-graph",           allow: INTERNAL_ROLES },
  { prefix: "/dashboard/ai-security",            allow: INTERNAL_ROLES },
  { prefix: "/dashboard/threat-intel",           allow: INTERNAL_ROLES },
  { prefix: "/dashboard/finops-security",        allow: INTERNAL_ROLES },
  { prefix: "/dashboard/incidents",              allow: INTERNAL_ROLES },
  { prefix: "/dashboard/queue",                  allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/soc",                    allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/audit-trail-legacy",     allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },

  // ── Broad access: all internal roles + clients get read-only view ─────────
  { prefix: "/dashboard/exports",                allow: ALL_ROLES },
  { prefix: "/dashboard/services",               allow: ALL_ROLES },
  { prefix: "/dashboard/audit-trail",            allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/compliance",             allow: ALL_ROLES },
  { prefix: "/dashboard/findings",               allow: ALL_ROLES },
  { prefix: "/dashboard/dspm",                   allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS", "CLOUD_ENGINEER"] },
  { prefix: "/dashboard/iac",                    allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/k8s",                    allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/credentials",            allow: ["ADMIN", "SECOPS", "CLOUD_ENGINEER", "DEVSECOPS"] },
  { prefix: "/onboarding",                       allow: ALL_ROLES },
  { prefix: "/dashboard/guard/reports",          allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD"] },
  { prefix: "/dashboard/guard",                  allow: ["ADMIN", "SECOPS", "AUDITOR", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/aria",                   allow: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
  { prefix: "/dashboard/alert-routes",           allow: ["ADMIN", "SECOPS"] },
  { prefix: "/dashboard/api-keys",               allow: ["ADMIN"] },
];

/**
 * DESIGNER (future design-review account) is deny-by-default: it may open
 * only these product surfaces, read-only. "/dashboard" is listed exactly
 * because it is the sign-in front door that middleware redirects to
 * /dashboard/overview after authorization; without it a denied DESIGNER
 * request would loop. Legacy pages, onboarding, admin, credentials, E2 and
 * settings are never listed.
 */
export const DESIGNER_ROUTES: Array<{ path: string; exact?: boolean }> = [
  { path: "/dashboard", exact: true },
  { path: "/dashboard/overview" },
  { path: "/dashboard/controls" },
  { path: "/dashboard/findings" },
  { path: "/dashboard/remediation" },
  { path: "/dashboard/assurance" },
  { path: "/dashboard/reports" },
  { path: "/dashboard/audit-trail" },
  { path: "/dashboard/cloud-accounts" },
];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");

/**
 * Operator consoles. Each is a page of the platform operator's own tooling whose data comes from
 * /api/admin/*, which middleware already refuses to any tenant but the platform's. The role map
 * above only says "ADMIN", which every customer's administrator holds, so without this a customer
 * admin could open the shell of a console that can show them nothing. The customer-facing admin
 * pages (users, alert-routes, api-keys, settings) are deliberately NOT in this list.
 */
export const PLATFORM_ONLY_PAGES = [
  "/dashboard/admin/commercial",
  "/dashboard/admin/feedback",
  "/dashboard/admin/insights",
  "/dashboard/admin/leads",
  "/dashboard/admin/operations",
  "/dashboard/admin/pilot-health",
  "/dashboard/admin/platform",
  "/dashboard/admin/trace",
];

export function isPlatformOnlyPage(pathname: string): boolean {
  return PLATFORM_ONLY_PAGES.some((p) => under(pathname, p));
}

export function isRoleAllowed(pathname: string, role: Role): boolean {
  if (role === "DESIGNER") {
    return DESIGNER_ROUTES.some((r) => (r.exact ? pathname === r.path : under(pathname, r.path)));
  }
  for (const rule of ROLE_ROUTES) {
    if (under(pathname, rule.prefix)) return rule.allow.includes(role);
  }
  // Default: allow any authenticated customer-dashboard role
  return true;
}
