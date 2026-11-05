/**
 * Product navigation — the locked information architecture
 * (FRONTEND_ROUTE_MAP.md).
 *
 * One declaration drives the sidebar, the mobile drawer and breadcrumb labels.
 * Every item names the capability that gates it; the Sidebar hides what the
 * role cannot do. Hiding is presentation only — the backend authorises.
 *
 * Control domains are query filters on one Controls list, not seven routes.
 */

import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bell,
  Building2,
  ClipboardList,
  Cloud,
  FileText,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  ShieldAlert,
  Users,
  Wrench,
} from "lucide-react";
import type { Capability } from "@/lib/rbac";
import { CONTROL_DOMAINS, CONTROL_DOMAIN_LABEL } from "@/lib/domain";

export interface NavItem {
  label: string;
  href: string;
  /**
   * Rail icon. Required on top-level items: between lg and xl the sidebar is a
   * 64px rail where the icon is the only thing a reader can see, so an item
   * without one is unidentifiable. Sub-items never appear in the rail.
   */
  icon?: LucideIcon;
  capability?: Capability;
  /** Marks the item active for any URL under this prefix. */
  matchPrefix?: string;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  /** Section heading; omitted for the first, unlabelled group. */
  title?: string;
  items: NavItem[];
}

export const PRODUCT_BASE = "/dashboard";

export const PRODUCT_NAV: NavSection[] = [
  {
    id: "main",
    items: [
      { label: "Overview", href: `${PRODUCT_BASE}/overview`, icon: LayoutDashboard, capability: "viewControls" },
      {
        label: "Controls",
        href: `${PRODUCT_BASE}/controls`,
        icon: ListChecks,
        matchPrefix: `${PRODUCT_BASE}/controls`,
        capability: "viewControls",
        children: CONTROL_DOMAINS.map((d) => ({
          label: CONTROL_DOMAIN_LABEL[d],
          href: `${PRODUCT_BASE}/controls?domain=${d.toLowerCase()}`,
          capability: "viewControls" as Capability,
        })),
      },
      {
        label: "Findings",
        href: `${PRODUCT_BASE}/findings`,
        icon: ShieldAlert,
        matchPrefix: `${PRODUCT_BASE}/findings`,
        capability: "viewFindings",
      },
      {
        label: "Assurance",
        href: `${PRODUCT_BASE}/assurance`,
        icon: BadgeCheck,
        matchPrefix: `${PRODUCT_BASE}/assurance`,
        capability: "viewControls",
        children: [
          { label: "Verification", href: `${PRODUCT_BASE}/assurance/verification`, capability: "viewControls" },
          { label: "History", href: `${PRODUCT_BASE}/assurance/history`, capability: "viewControls" },
          { label: "Drift", href: `${PRODUCT_BASE}/assurance/drift`, capability: "viewControls" },
          { label: "Exceptions", href: `${PRODUCT_BASE}/assurance/exceptions`, capability: "viewControls" },
        ],
      },
      {
        label: "Reports",
        href: `${PRODUCT_BASE}/reports`,
        icon: FileText,
        matchPrefix: `${PRODUCT_BASE}/reports`,
        capability: "exportReports",
        children: [
          { label: "Monthly assurance", href: `${PRODUCT_BASE}/reports/monthly`, capability: "exportReports" },
          { label: "Customer review", href: `${PRODUCT_BASE}/reports/customer-review`, capability: "exportReports" },
          { label: "Evidence", href: `${PRODUCT_BASE}/reports/evidence`, capability: "viewEvidence" },
        ],
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      { label: "Operations", href: `${PRODUCT_BASE}/operations`, icon: ClipboardList, capability: "viewOperations" },
      {
        label: "Remediation",
        href: `${PRODUCT_BASE}/remediation`,
        icon: Wrench,
        matchPrefix: `${PRODUCT_BASE}/remediation`,
        capability: "requestRemediation",
      },
      { label: "Cloud accounts", href: `${PRODUCT_BASE}/cloud-accounts`, icon: Cloud, capability: "viewCloudResources" },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    items: [
      { label: "Audit trail", href: `${PRODUCT_BASE}/audit-trail`, icon: ScrollText, capability: "viewAuditTrail" },
      { label: "Users", href: `${PRODUCT_BASE}/admin/users`, icon: Users, capability: "manageUsers" },
      { label: "Alert routes", href: `${PRODUCT_BASE}/admin/alert-routes`, icon: Bell, capability: "manageAlertRoutes" },
      { label: "API keys", href: `${PRODUCT_BASE}/admin/api-keys`, icon: KeyRound, capability: "manageApiKeys" },
      { label: "Settings", href: `${PRODUCT_BASE}/admin/settings`, icon: Building2, capability: "manageSettings" },
    ],
  },
];

/** True when `pathname` should mark `item` as the current page. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.matchPrefix) return pathname === item.matchPrefix || pathname.startsWith(`${item.matchPrefix}/`);
  return pathname === item.href;
}
