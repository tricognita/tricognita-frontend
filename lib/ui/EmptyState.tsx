"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * EmptyState — standardized empty/no-data placeholder for lists, tables, panels.
 *
 * Replaces the ad-hoc "No findings match the current filters" / "No records yet"
 * one-off blocks scattered through dashboard pages. Every list / table / drawer
 * that can render zero items should render this instead.
 *
 * Variants control the visual weight, not the semantic intent:
 *   default   — quiet, gray, fits inside a Card body or table row
 *   bordered  — adds a dashed border + extra padding for "this is a whole zone"
 *   compact   — single line, for sidebar / drawer empties
 *
 * Intent tinted glow comes from the optional `icon` color; pass a Lucide icon
 * with an explicit text-[var(--matcha-300)] etc. class to add a subtle accent.
 *
 * Examples:
 *   <EmptyState
 *     title="No active findings in this scan cycle."
 *     description="Your environment is clean against the current policy set."
 *   />
 *
 *   <EmptyState
 *     variant="bordered"
 *     icon={<Shield className="text-[var(--matcha-300)]" size={28} />}
 *     title="Audit chain is empty"
 *     description="Records appear here after the first approved action."
 *     action={<Button onClick={runScan}>Run scan</Button>}
 *   />
 */

export type EmptyStateVariant = "default" | "bordered" | "compact";

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: EmptyStateVariant;
}

const VARIANT_CLASSES: Record<EmptyStateVariant, string> = {
  default: "py-10 px-6 text-center",
  bordered:
    "py-14 px-6 text-center border border-dashed border-[var(--sage-soft)] rounded-[var(--radius)]",
  compact: "py-6 px-4 text-center",
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  variant = "default",
  className,
  ...rest
}: EmptyStateProps) {
  const isCompact = variant === "compact";
  return (
    <div className={cn(VARIANT_CLASSES[variant], className)} {...rest}>
      {icon && !isCompact && (
        <div className="flex justify-center mb-3 text-[var(--stone-400)]">
          {icon}
        </div>
      )}
      <p
        className={cn(
          "text-[var(--stone-200)] font-medium",
          isCompact ? "text-xs" : "text-sm",
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "text-[var(--stone-500)] mt-1 mx-auto leading-relaxed",
            isCompact ? "text-[10px] max-w-[260px]" : "text-xs max-w-md",
          )}
        >
          {description}
        </p>
      )}
      {action && !isCompact && <div className="mt-4">{action}</div>}
    </div>
  );
}
