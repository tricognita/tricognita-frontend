"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Badge — small inline label for status, severity, role, tier.
 *
 * Replaces the dozen ad-hoc badge implementations scattered through the
 * dashboard (each component had its own pill markup). Use this for every
 * inline status indicator going forward.
 *
 * Intent palette is tied to the design token system, NOT raw Tailwind colors:
 *   neutral  → stone
 *   success  → matcha (verified, operational, approved)
 *   warning  → amber-clay (pending, operator-tier, degraded)
 *   danger   → ember (critical, denied, failed)
 *   info     → mist (auto-tier, informational)
 *   violet   → matcha-600 (brand accent — use sparingly)
 *
 * Variants:
 *   subtle (default) → tinted bg + matching ring; primary use
 *   solid            → opaque bg with white text; high contrast
 *   outline          → transparent bg, colored ring + text
 *   dot              → just a colored dot + label (for compact lists)
 *
 * Sizes:
 *   xs  → 9px, p-0.5 (for dense tables)
 *   sm  → 10px, p-1 (default)
 *   md  → 11px, p-1.5
 *   lg  → 12px, p-2 (executive callouts)
 *
 * Examples:
 *   <Badge intent="success">VERIFIED</Badge>
 *   <Badge intent="warning" variant="solid" size="md">OPERATOR</Badge>
 *   <Badge intent="danger" variant="dot">P0</Badge>
 */

export type BadgeIntent =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "violet";
export type BadgeVariant = "subtle" | "solid" | "outline" | "dot";
export type BadgeSize = "xs" | "sm" | "md" | "lg";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  intent?: BadgeIntent;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Render with monospace font (good for codes, IDs, tier labels). */
  mono?: boolean;
}

// Subtle (default): tinted background + ring of the same color.
const SUBTLE_INTENTS: Record<BadgeIntent, string> = {
  neutral:
    "bg-[var(--stone-500)]/10 text-[var(--stone-300)] ring-1 ring-inset ring-[var(--stone-500)]/30",
  success:
    "bg-[var(--matcha-400)]/10 text-[var(--matcha-300)] ring-1 ring-inset ring-[var(--matcha-400)]/30",
  warning:
    "bg-[var(--amber-clay)]/10 text-[var(--amber-clay)] ring-1 ring-inset ring-[var(--amber-clay)]/30",
  danger:
    "bg-[var(--ember)]/10 text-[var(--ember-glow)] ring-1 ring-inset ring-[var(--ember)]/30",
  info:
    "bg-[var(--mist)]/10 text-[var(--mist)] ring-1 ring-inset ring-[var(--mist)]/30",
  violet:
    "bg-[var(--matcha-600)]/15 text-[var(--matcha-200)] ring-1 ring-inset ring-[var(--matcha-600)]/40",
};

const SOLID_INTENTS: Record<BadgeIntent, string> = {
  neutral: "bg-[var(--stone-600)] text-[var(--stone-50)]",
  success: "bg-[var(--matcha-600)] text-white",
  warning: "bg-[var(--amber-clay)] text-[var(--ink)]",
  danger: "bg-[var(--ember)] text-white",
  info: "bg-[var(--mist)] text-[var(--ink)]",
  violet: "bg-[var(--matcha-700)] text-white",
};

const OUTLINE_INTENTS: Record<BadgeIntent, string> = {
  neutral: "bg-transparent text-[var(--stone-300)] ring-1 ring-[var(--stone-500)]/50",
  success: "bg-transparent text-[var(--matcha-300)] ring-1 ring-[var(--matcha-400)]/50",
  warning: "bg-transparent text-[var(--amber-clay)] ring-1 ring-[var(--amber-clay)]/50",
  danger: "bg-transparent text-[var(--ember-glow)] ring-1 ring-[var(--ember)]/50",
  info: "bg-transparent text-[var(--mist)] ring-1 ring-[var(--mist)]/50",
  violet: "bg-transparent text-[var(--matcha-300)] ring-1 ring-[var(--matcha-500)]/50",
};

const DOT_COLORS: Record<BadgeIntent, string> = {
  neutral: "bg-[var(--stone-400)]",
  success: "bg-[var(--matcha-400)]",
  warning: "bg-[var(--amber-clay)]",
  danger: "bg-[var(--ember)]",
  info: "bg-[var(--mist)]",
  violet: "bg-[var(--matcha-500)]",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "text-[9px] px-1 py-px",
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-[11px] px-2 py-0.5",
  lg: "text-xs px-2.5 py-1",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    intent = "neutral",
    variant = "subtle",
    size = "sm",
    mono = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  if (variant === "dot") {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5",
          SIZE_CLASSES[size],
          mono && "font-mono",
          "uppercase tracking-widest text-[var(--stone-300)] font-semibold",
          className,
        )}
        {...rest}
      >
        <span
          aria-hidden
          className={cn("inline-block rounded-full size-1.5", DOT_COLORS[intent])}
        />
        {children}
      </span>
    );
  }

  const intentClasses =
    variant === "solid"
      ? SOLID_INTENTS[intent]
      : variant === "outline"
        ? OUTLINE_INTENTS[intent]
        : SUBTLE_INTENTS[intent];

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full font-semibold uppercase tracking-wider whitespace-nowrap",
        SIZE_CLASSES[size],
        intentClasses,
        mono && "font-mono tracking-widest",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
});
