"use client";

import * as React from "react";
import { cn } from "./cn";
import type { BadgeIntent } from "./Badge";

/**
 * StatusDot — small colored dot indicator. Use for inline status (operational /
 * degraded / down), live-event indicators, and connection state pills.
 *
 * Intent maps to the same semantic palette as Badge:
 *   neutral / success / warning / danger / info / violet
 *
 * Sizes:
 *   xs  — 6px  (inline-with-text, table rows)
 *   sm  — 8px  (default)
 *   md  — 10px (header indicators)
 *   lg  — 12px (hero status orbs)
 *
 * pulse=true adds an animated ping ring — use sparingly, ONLY for genuinely
 * live state (active connection, real-time stream, in-flight operation).
 * Do NOT use pulse on static state ("Operational" steady-state should NOT
 * pulse — that's the difference between SOC-mature UI and gaming UI).
 *
 * Examples:
 *   <StatusDot intent="success" />                     // green dot
 *   <StatusDot intent="warning" pulse />               // amber dot, animated ping
 *   <StatusDot intent="success" size="md" label="Operational" />  // with label
 */

export type StatusDotSize = "xs" | "sm" | "md" | "lg";

interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  intent?: BadgeIntent;
  size?: StatusDotSize;
  pulse?: boolean;
  label?: React.ReactNode;
  /**
   * Screen-reader announcement when no visible label is rendered. If a `label`
   * is provided, it is used as the accessible name and this prop is ignored.
   * Caller-supplied `aria-label` (via ...rest) takes precedence.
   */
  srLabel?: string;
}

const SR_DEFAULT_BY_INTENT: Record<BadgeIntent, string> = {
  neutral: "Status: neutral",
  success: "Status: operational",
  warning: "Status: degraded",
  danger: "Status: critical",
  info: "Status: informational",
  violet: "Status: active",
};

const COLORS: Record<BadgeIntent, string> = {
  neutral: "bg-[var(--stone-400)]",
  success: "bg-[var(--matcha-400)]",
  warning: "bg-[var(--amber-clay)]",
  danger: "bg-[var(--ember)]",
  info: "bg-[var(--mist)]",
  violet: "bg-[var(--matcha-500)]",
};

const SIZE_DOT: Record<StatusDotSize, string> = {
  xs: "size-1.5",
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
};

const SIZE_LABEL: Record<StatusDotSize, string> = {
  xs: "text-[10px]",
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
};

export function StatusDot({
  intent = "neutral",
  size = "sm",
  pulse = false,
  label,
  srLabel,
  className,
  ...rest
}: StatusDotProps) {
  const dot = (
    <span className="relative inline-flex shrink-0">
      {pulse && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-50",
            COLORS[intent],
          )}
        />
      )}
      <span
        aria-hidden
        className={cn("relative rounded-full", COLORS[intent], SIZE_DOT[size])}
      />
    </span>
  );

  if (!label) {
    const announce = srLabel ?? SR_DEFAULT_BY_INTENT[intent];
    return (
      <span
        role="status"
        className={cn("inline-flex items-center", className)}
        {...rest}
      >
        {dot}
        <span className="sr-only">{announce}</span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      {...rest}
    >
      {dot}
      <span className={cn("text-[var(--stone-300)]", SIZE_LABEL[size])}>
        {label}
      </span>
    </span>
  );
}
