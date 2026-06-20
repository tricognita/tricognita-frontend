"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Stat — single large number with label and optional trend / source citation.
 *
 * Sizes:
 *   - sm  → label 11px, number 24px       (inline metric)
 *   - md  → label 11px, number 36px       (card metric, default)
 *   - lg  → label 12px, number 56px       (executive summary)
 *   - xl  → label 12px, number 80px+      (hero stat on a slide-equivalent)
 *
 * Intents (color of the number):
 *   - neutral (default) → text-stone-50
 *   - success           → text-matcha-300
 *   - warning           → text-amber-clay
 *   - danger            → text-ember
 *   - info              → text-mist
 *
 * Examples:
 *   <Stat label="Active findings" value={42} />
 *   <Stat label="Critical" value={3} intent="danger" size="lg" />
 *   <Stat
 *     label="Mean time to remediation"
 *     value="4h 12m"
 *     hint="Last 30 days"
 *     source="ARIA telemetry"
 *   />
 */

export type StatSize = "sm" | "md" | "lg" | "xl";
export type StatIntent = "neutral" | "success" | "warning" | "danger" | "info";

interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Sub-label below the number (e.g. "Last 30 days"). */
  hint?: React.ReactNode;
  /** Right-aligned trend indicator like "+12%" or an arrow icon. */
  trend?: React.ReactNode;
  /** Tiny footer line (e.g. "Source: Gartner 2025"). */
  source?: React.ReactNode;
  /** Render number in mono (good for ARNs, IDs, monospaced metrics). */
  mono?: boolean;
  size?: StatSize;
  intent?: StatIntent;
  /** Loading state — renders a skeleton block instead of the value. */
  loading?: boolean;
}

const SIZE_CLASSES: Record<StatSize, { label: string; value: string }> = {
  sm: { label: "text-[10px]", value: "text-2xl" },
  md: { label: "text-[11px]", value: "text-4xl" },
  lg: { label: "text-xs", value: "text-6xl" },
  xl: { label: "text-xs", value: "text-[80px] leading-none" },
};

const INTENT_CLASSES: Record<StatIntent, string> = {
  neutral: "text-[var(--stone-50)]",
  success: "text-[var(--matcha-300)]",
  warning: "text-[var(--amber-clay)]",
  danger: "text-[var(--ember)]",
  info: "text-[var(--mist)]",
};

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(function Stat(
  {
    label,
    value,
    hint,
    trend,
    source,
    mono = false,
    size = "md",
    intent = "neutral",
    loading = false,
    className,
    ...rest
  },
  ref,
) {
  const sizes = SIZE_CLASSES[size];
  return (
    <div
      ref={ref}
      className={cn("min-w-0", className)}
      aria-busy={loading || undefined}
      {...rest}
    >
      <div className="flex items-end justify-between gap-3">
        <div
          className={cn(
            "eyebrow text-[var(--stone-400)] tracking-widest",
            sizes.label,
          )}
        >
          {label}
        </div>
        {trend && <div className="text-[10px] text-[var(--stone-400)] shrink-0">{trend}</div>}
      </div>
      <div
        className={cn(
          "font-bold tabular-nums leading-tight mt-1 tracking-tight",
          sizes.value,
          INTENT_CLASSES[intent],
          mono && "font-mono tracking-normal",
          loading && "h-9 bg-[var(--moss-hi)] rounded animate-pulse",
        )}
      >
        {!loading && value}
      </div>
      {hint && !loading && (
        <div className="text-[11px] text-[var(--stone-500)] mt-1 leading-snug">
          {hint}
        </div>
      )}
      {source && !loading && (
        <div className="text-[10px] text-[var(--stone-600)] mt-2 font-mono">
          {source}
        </div>
      )}
    </div>
  );
});
