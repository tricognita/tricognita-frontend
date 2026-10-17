/**
 * Session role → product role mapping — FRONTEND_ARCHITECTURE.md §6.
 *
 * The session keeps ten historical roles. The product speaks four. This module
 * maps between them for display only.
 *
 * Authorization is NEVER decided here: components call canDo(role, capability)
 * from lib/rbac.ts, and the backend remains authoritative.
 */

import type { Role } from "@/lib/auth";
import type { ProductRole } from "./entities";

export const PRODUCT_ROLE_OF: Record<Role, ProductRole> = {
  ADMIN: "ADMIN",
  SECOPS: "SECURITY_OPS",
  SOC_LEAD: "SECURITY_OPS",
  DEVSECOPS: "ENGINEERING",
  CLOUD_ENGINEER: "ENGINEERING",
  AUDITOR: "VIEWER",
  VIEWER: "VIEWER",
  CLIENT: "VIEWER",
  RED_TEAMER: "VIEWER",
  FINOPS_ANALYST: "VIEWER",
  DESIGNER: "VIEWER",
};

export const PRODUCT_ROLE_LABEL: Record<ProductRole, string> = {
  ADMIN: "Administrator",
  SECURITY_OPS: "Security operations",
  ENGINEERING: "Engineering",
  VIEWER: "Viewer",
};

export function productRoleOf(role: Role | null | undefined): ProductRole | null {
  if (!role) return null;
  return PRODUCT_ROLE_OF[role] ?? null;
}
