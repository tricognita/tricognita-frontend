/**
 * lib/rbac-roster — exports the CAPABILITIES role map from rbac.ts as a
 * lookup table for UI display.
 *
 * Mirrors the CAPABILITIES matrix in lib/rbac.ts. Kept here (rather than
 * exported from rbac.ts directly) so that:
 *   - rbac.ts stays a pure capability checker — no UI/display concerns.
 *   - This file can add display order, grouping, role-name humanization,
 *     etc. without bloating the auth-critical module.
 *
 * If you add a capability to lib/rbac.ts, ALSO add it here. The compiler
 * will help: `Record<Capability, Role[]>` enforces exhaustiveness.
 */

import type { Role } from "./auth";
import type { Capability } from "./rbac";

export const ROLES_BY_CAPABILITY: Record<Capability, Role[]> = {
  // ADMIN-only
  manageUsers:        ["ADMIN"],
  manageSettings:     ["ADMIN"],
  viewSystemHealth:   ["ADMIN", "SECOPS", "DEVSECOPS", "SOC_LEAD", "AUDITOR", "CLIENT", "VIEWER"],
  viewApiKeys:        ["ADMIN"],

  // ADMIN + SECOPS
  viewAlertRoutes:    ["ADMIN", "SECOPS"],
  managePolicies:     ["ADMIN", "SECOPS", "SOC_LEAD"],

  // SECOPS-tier
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

  // AUDITOR-tier
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
