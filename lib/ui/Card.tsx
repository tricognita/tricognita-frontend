"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Card — primary surface container.
 *
 * Variants:
 *   - default   → matte surface with subtle border (most common)
 *   - elevated  → glass-like, slightly raised, with hover lift
 *   - ghost     → no border/background; useful for grouping without weight
 *   - danger    → rose-tinted border + bg; for critical states
 *   - success   → matcha-tinted; for verified/operational states
 *   - warning   → amber-tinted; for partial/pending states
 *
 * Density:
 *   - compact     → 12px padding (data-dense tables, lists)
 *   - comfortable → 16px padding (default)
 *   - spacious    → 24px padding (executive summary, hero cards)
 *
 * The component is intentionally non-prescriptive about content layout. Use
 * <CardHeader>, <CardBody>, <CardFooter> for the standard three-zone pattern,
 * or pass children directly for custom layouts.
 *
 * Example:
 *   <Card variant="elevated" density="comfortable">
 *     <CardHeader title="Active Findings" eyebrow="Operations" />
 *     <CardBody>...</CardBody>
 *   </Card>
 */

export type CardVariant =
  | "default"
  | "elevated"
  | "ghost"
  | "danger"
  | "success"
  | "warning";

export type CardDensity = "compact" | "comfortable" | "spacious";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  density?: CardDensity;
  /** When true, the card responds to hover/focus with a subtle elevation lift. */
  interactive?: boolean;
  /** When true, applies aria-busy and pulses the surface for loading states. */
  loading?: boolean;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:
    "bg-[var(--moss-rise)] border border-[var(--sage-soft)]",
  elevated:
    "bg-[var(--moss-rise)]/80 border border-[var(--sage-soft)] backdrop-blur-sm shadow-[var(--shadow-soft)]",
  ghost:
    "bg-transparent border border-transparent",
  danger:
    "bg-[color-mix(in_oklch,var(--ember)_8%,var(--moss-rise))] border border-[color-mix(in_oklch,var(--ember)_30%,var(--sage-soft))]",
  success:
    "bg-[color-mix(in_oklch,var(--matcha-600)_6%,var(--moss-rise))] border border-[color-mix(in_oklch,var(--matcha-400)_24%,var(--sage-soft))]",
  warning:
    "bg-[color-mix(in_oklch,var(--amber-clay)_8%,var(--moss-rise))] border border-[color-mix(in_oklch,var(--amber-clay)_28%,var(--sage-soft))]",
};

const DENSITY_CLASSES: Record<CardDensity, string> = {
  compact: "p-3",
  comfortable: "p-4",
  spacious: "p-6",
};

const INTERACTIVE_CLASSES =
  "transition-all duration-200 hover:border-[var(--matcha-400)]/40 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/40";

const LOADING_CLASSES = "animate-pulse";

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "default",
    density = "comfortable",
    interactive = false,
    loading = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-busy={loading || undefined}
      className={cn(
        "rounded-[var(--radius)] overflow-hidden",
        VARIANT_CLASSES[variant],
        DENSITY_CLASSES[density],
        interactive && INTERACTIVE_CLASSES,
        loading && LOADING_CLASSES,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

// ─── Card sub-components ─────────────────────────────────────────────────────

interface CardHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned action slot (buttons, badges). */
  actions?: React.ReactNode;
}

export function CardHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
  children,
  ...rest
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 mb-3",
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="eyebrow text-[var(--matcha-300)]">{eyebrow}</div>
        )}
        {title && (
          <h3 className="text-sm font-semibold text-[var(--stone-50)] tracking-tight mt-0.5 truncate">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-xs text-[var(--stone-400)] mt-1 leading-relaxed">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

type CardBodyProps = React.HTMLAttributes<HTMLDivElement>;

export function CardBody({ className, children, ...rest }: CardBodyProps) {
  return (
    <div className={cn("text-sm text-[var(--stone-300)]", className)} {...rest}>
      {children}
    </div>
  );
}

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, children, ...rest }: CardFooterProps) {
  return (
    <div
      className={cn(
        "mt-4 pt-3 border-t border-[var(--sage-soft)] flex items-center justify-between gap-3",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
