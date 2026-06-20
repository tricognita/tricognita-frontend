"use client";

import * as React from "react";
import { AlertTriangle, WifiOff, ShieldAlert } from "lucide-react";
import { cn } from "./cn";

/**
 * ErrorState — standardized error / degraded / partial-failure placeholder.
 *
 * Sibling to EmptyState. Use this whenever a request failed, an upstream is
 * unreachable, an action returned an error, or a panel is showing partial /
 * cached data because the live source is down.
 *
 * Tone matters here. The default copy is "Something went wrong" — caller
 * should override with a SPECIFIC explanation ("Backend unreachable",
 * "Failed to load scan results", "ARIA queue is degraded — retrying"). Vague
 * errors erode trust; specific errors build it.
 *
 * Variants:
 *   default   — neutral error card with retry slot
 *   degraded  — amber, for "we're still working but in reduced capacity"
 *   offline   — gray, for "we couldn't reach the backend at all"
 *   denied    — rose, for "you don't have access to this resource"
 *
 * Density:
 *   inline   — small, fits inside a Card body or table row
 *   panel    — full panel with bordered surface and centered layout
 */

export type ErrorStateVariant = "default" | "degraded" | "offline" | "denied";
export type ErrorStateDensity = "inline" | "panel";

interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ErrorStateVariant;
  density?: ErrorStateDensity;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** Optional technical detail (request ID, status code) shown in mono below. */
  detail?: React.ReactNode;
}

const VARIANT_DEFAULTS: Record<ErrorStateVariant, { title: string; icon: React.ReactNode; iconColor: string; surface: string }> = {
  default: {
    title: "Something went wrong",
    icon: <AlertTriangle size={20} />,
    iconColor: "text-[var(--amber-clay)]",
    surface: "bg-[var(--moss-rise)] border border-[var(--sage-soft)]",
  },
  degraded: {
    title: "Service degraded",
    icon: <AlertTriangle size={20} />,
    iconColor: "text-[var(--amber-clay)]",
    surface:
      "bg-[color-mix(in_oklch,var(--amber-clay)_6%,var(--moss-rise))] border border-[color-mix(in_oklch,var(--amber-clay)_24%,var(--sage-soft))]",
  },
  offline: {
    title: "Backend unreachable",
    icon: <WifiOff size={20} />,
    iconColor: "text-[var(--stone-400)]",
    surface: "bg-[var(--moss-rise)] border border-[var(--sage-soft)]",
  },
  denied: {
    title: "Access denied",
    icon: <ShieldAlert size={20} />,
    iconColor: "text-[var(--ember-glow)]",
    surface:
      "bg-[color-mix(in_oklch,var(--ember)_6%,var(--moss-rise))] border border-[color-mix(in_oklch,var(--ember)_24%,var(--sage-soft))]",
  },
};

const DENSITY_CLASSES: Record<ErrorStateDensity, string> = {
  inline: "px-4 py-3 rounded-[var(--radius)]",
  panel: "px-6 py-10 rounded-[var(--radius)] text-center",
};

export function ErrorState({
  title,
  description,
  variant = "default",
  density = "panel",
  icon,
  action,
  detail,
  className,
  ...rest
}: ErrorStateProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const resolvedIcon = icon ?? defaults.icon;
  const resolvedTitle = title ?? defaults.title;
  const isPanel = density === "panel";

  return (
    <div
      role="alert"
      className={cn(defaults.surface, DENSITY_CLASSES[density], className)}
      {...rest}
    >
      {isPanel ? (
        <div className="flex flex-col items-center gap-3">
          <span className={cn("inline-flex", defaults.iconColor)}>{resolvedIcon}</span>
          <div>
            <p className="text-sm font-semibold text-[var(--stone-100)]">{resolvedTitle}</p>
            {description && (
              <p className="text-xs text-[var(--stone-400)] mt-1 max-w-md mx-auto leading-relaxed">
                {description}
              </p>
            )}
            {detail && (
              <p className="text-[10px] font-mono text-[var(--stone-600)] mt-2">
                {detail}
              </p>
            )}
          </div>
          {action && <div className="mt-2">{action}</div>}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <span className={cn("inline-flex shrink-0 mt-0.5", defaults.iconColor)}>
            {resolvedIcon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--stone-100)]">{resolvedTitle}</p>
            {description && (
              <p className="text-xs text-[var(--stone-400)] mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
            {detail && (
              <p className="text-[10px] font-mono text-[var(--stone-600)] mt-1">
                {detail}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
    </div>
  );
}
