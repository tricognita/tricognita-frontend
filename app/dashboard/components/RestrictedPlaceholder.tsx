/**
 * RestrictedPlaceholder — intentional UI for RBAC-gated features.
 *
 * Replaces all "return null" guards so users always see _why_ a panel is
 * absent rather than experiencing a broken / empty layout.
 *
 * Usage:
 *   <RestrictedPlaceholder
 *     title="System Health"
 *     description="Real-time infrastructure diagnostics and subsystem status."
 *     roles={["ADMIN"]}
 *   />
 */

import { Lock } from "lucide-react";

// Human-readable role labels for display (never expose internal role IDs)
const ROLE_LABELS: Record<string, string> = {
  ADMIN:           "Administrator",
  SECOPS:          "Security Operations",
  SOC_LEAD:        "SOC Lead",
  DEVSECOPS:       "DevSecOps Engineer",
  AUDITOR:         "Auditor",
  CLOUD_ENGINEER:  "Cloud Engineer",
  FINOPS_ANALYST:  "FinOps Analyst",
  RED_TEAMER:      "Red Team",
};

function humanRole(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

interface Props {
  /** Panel title — e.g. "System Health" */
  title: string;
  /** Optional short description of what the feature does */
  description?: string;
  /** Internal role strings that CAN access this feature */
  roles: string[];
  /** Visual size variant */
  size?: "sm" | "md" | "lg";
  /** Optional extra class names */
  className?: string;
}

export function RestrictedPlaceholder({
  title,
  description,
  roles,
  size = "md",
  className = "",
}: Props) {
  const paddingMap = { sm: "p-6", md: "p-10", lg: "p-14" };
  const padding = paddingMap[size];

  const humanRoles = roles.map(humanRole).join(", ");

  return (
    <div
      className={`glass rounded-[var(--radius-lg)] border border-dashed ${padding} flex flex-col items-center justify-center text-center gap-3 ${className}`}
      style={{ borderColor: "var(--sage-soft)", background: "var(--moss)" }}
      role="region"
      aria-label={`${title} — restricted`}
    >
      {/* Lock icon */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "var(--sage-soft)" }}
      >
        <Lock className="w-5 h-5 text-stone-400" aria-hidden="true" />
      </div>

      {/* Title */}
      <div>
        <p className="text-sm font-semibold text-stone-300">{title}</p>
        {description && (
          <p className="text-xs text-stone-500 mt-1 max-w-xs">{description}</p>
        )}
      </div>

      {/* Role callout */}
      <p className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
        This feature is available to{" "}
        <span className="text-stone-300 font-medium">{humanRoles}</span>{" "}
        accounts. Contact your administrator to request access.
      </p>
    </div>
  );
}
