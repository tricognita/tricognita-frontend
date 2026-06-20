"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * FilterBar — horizontal row of mutually-exclusive filter chips. Used at the
 * top of tables and lists (severity filter, time range, status, role, etc.).
 *
 * Stateless wrapper: caller owns the current value + onChange handler. This
 * makes FilterBar trivially compatible with URL state, SWR keys, Zustand,
 * useState, anything.
 *
 * Example:
 *   const [severity, setSeverity] = useState<"ALL"|"CRITICAL"|"HIGH"|"MEDIUM"|"LOW">("ALL");
 *
 *   <FilterBar label="Severity">
 *     <FilterChip active={severity === "ALL"}      onClick={() => setSeverity("ALL")}>All</FilterChip>
 *     <FilterChip active={severity === "CRITICAL"} onClick={() => setSeverity("CRITICAL")} intent="danger">Critical</FilterChip>
 *     <FilterChip active={severity === "HIGH"}     onClick={() => setSeverity("HIGH")}    intent="warning">High</FilterChip>
 *     <FilterChip active={severity === "MEDIUM"}   onClick={() => setSeverity("MEDIUM")}  intent="info">Medium</FilterChip>
 *     <FilterChip active={severity === "LOW"}      onClick={() => setSeverity("LOW")}>Low</FilterChip>
 *   </FilterBar>
 *
 * For multi-select filters (e.g., multiple severities at once), use the same
 * chips but compute `active` from a Set in caller state.
 */

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional label rendered as a faint eyebrow on the right. */
  label?: React.ReactNode;
  /** Optional right-aligned action slot (e.g., "Clear filters" button). */
  action?: React.ReactNode;
}

export function FilterBar({
  label,
  action,
  className,
  children,
  ...rest
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 flex-wrap",
        className,
      )}
      role="group"
      aria-label={typeof label === "string" ? label : undefined}
      {...rest}
    >
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
      <div className="flex items-center gap-3 ml-auto">
        {label && (
          <span className="text-[10px] font-mono text-[var(--stone-600)] uppercase tracking-widest">
            {label}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}

// ─── FilterChip — single chip inside a FilterBar ─────────────────────────────

export type FilterChipIntent =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface FilterChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  active?: boolean;
  intent?: FilterChipIntent;
  /** Right-aligned counter, e.g., "(12)". */
  count?: React.ReactNode;
}

const ACTIVE_INTENT: Record<FilterChipIntent, string> = {
  neutral:
    "bg-[var(--matcha-300)]/15 text-[var(--matcha-200)] ring-1 ring-inset ring-[var(--matcha-300)]/30",
  success:
    "bg-[var(--matcha-400)]/15 text-[var(--matcha-300)] ring-1 ring-inset ring-[var(--matcha-400)]/30",
  warning:
    "bg-[var(--amber-clay)]/15 text-[var(--amber-clay)] ring-1 ring-inset ring-[var(--amber-clay)]/30",
  danger:
    "bg-[var(--ember)]/15 text-[var(--ember-glow)] ring-1 ring-inset ring-[var(--ember)]/30",
  info:
    "bg-[var(--mist)]/15 text-[var(--mist)] ring-1 ring-inset ring-[var(--mist)]/30",
};

export function FilterChip({
  active = false,
  intent = "neutral",
  count,
  className,
  children,
  ...rest
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-widest",
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/40",
        active
          ? ACTIVE_INTENT[intent]
          : "text-[var(--stone-500)] hover:text-[var(--stone-300)] hover:bg-[var(--moss-rise)]",
        className,
      )}
      {...rest}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "tabular-nums",
            active ? "opacity-80" : "text-[var(--stone-600)]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
