/**
 * PageRestrictedGuard — page-level RBAC gate.
 *
 * Renders a full-page restricted view with PageShell + RestrictedPlaceholder
 * when the current session role does not have the required capability.
 * Renders children normally when access is permitted.
 *
 * Single source of truth for "who can see this feature": derives the role
 * roster from lib/rbac.ts:CAPABILITIES if the caller omits `allowedRoles`.
 * Avoids the drift problem where each route declared its own role list.
 *
 * Usage (preferred):
 *   <PageRestrictedGuard
 *     capability="viewZeroTrust"
 *     title="Identity & Access Governance"
 *     description="..."
 *   >
 *     <YourPageContent />
 *   </PageRestrictedGuard>
 *
 * `allowedRoles` is still accepted for backward compat but typically can be
 * omitted — it will be auto-derived from rbac.ts.
 */

"use client";

import type { ReactNode } from "react";
import { useSession } from "@/lib/use-session";
import { canDo, type Capability } from "@/lib/rbac";
import { PageShell, Skeleton } from "@/lib/ui";
import { RestrictedPlaceholder } from "./RestrictedPlaceholder";
import { ROLES_BY_CAPABILITY } from "@/lib/rbac-roster";

interface Props {
  capability: Capability;
  title: string;
  description?: string;
  /**
   * Role labels shown to the user in the restricted view. If omitted, the
   * roster is derived from lib/rbac.ts CAPABILITIES — the canonical source.
   * Pass this only when you want to display a NARROWER set than rbac.ts
   * (e.g., when the page combines multiple capabilities).
   */
  allowedRoles?: string[];
  /** Page header subtitle (e.g. "API Keys"). Optional. */
  subtitle?: string;
  children: ReactNode;
}

export function PageRestrictedGuard({
  capability,
  title,
  description,
  allowedRoles,
  subtitle,
  children,
}: Props) {
  const { role, isLoading } = useSession();

  // While session is loading, render a skeleton instead of the children to
  // avoid briefly flashing unauthorized content for a fraction of a second
  // before the RBAC check resolves.
  if (isLoading) {
    return (
      <PageShell
        eyebrow={subtitle ?? "Loading"}
        title={title}
        description={description}
        width="default"
        density="tight"
      >
        <Skeleton variant="kpi" />
        <Skeleton variant="block" height="200px" />
      </PageShell>
    );
  }

  if (!canDo(role, capability)) {
    const roster = allowedRoles ?? ROLES_BY_CAPABILITY[capability] ?? [];
    return (
      <PageShell
        eyebrow={subtitle ?? "Restricted"}
        title={title}
        description={description}
        width="default"
        density="tight"
      >
        <RestrictedPlaceholder
          title={title}
          description={description}
          roles={roster}
          size="lg"
        />
      </PageShell>
    );
  }

  return <>{children}</>;
}
