"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Skeleton — neutral shimmer placeholder for loading state.
 *
 * The whole point: never render a spinner where you can render a shape. A
 * Skeleton tells the user the SHAPE of the data that's loading (one big
 * number, or a 5-row table, or a chart), which makes the wait feel
 * intentional instead of broken.
 *
 * Variants:
 *   text       — single line (use `lines={n}` for a paragraph)
 *   heading    — taller text block, for h1/h2 placeholders
 *   block      — generic rectangle (give it width + height)
 *   circle     — round (avatars, status orbs)
 *   button     — button-shaped (matches Button size tokens)
 *   kpi        — full KPI placeholder (label + big number + hint)
 *   table-row  — single table row (use `cells={n}` to control column count)
 *
 * Always:
 *   - sets aria-busy / aria-hidden so screen readers skip the placeholder
 *   - uses the design-system moss-hi token so it blends with surrounding cards
 *   - subtle animation only (no rainbow shimmer)
 */

export type SkeletonVariant =
  | "text"
  | "heading"
  | "block"
  | "circle"
  | "button"
  | "kpi"
  | "table-row";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  /** For variant="text" — render N stacked lines. */
  lines?: number;
  /** For variant="table-row" — render N cells. */
  cells?: number;
  /** Width override (Tailwind class or inline style is fine). */
  width?: string;
  /** Height override. */
  height?: string;
}

const BASE =
  "bg-[var(--moss-hi)] rounded animate-pulse";

const VARIANT_DEFAULT: Record<SkeletonVariant, string> = {
  text: "h-3 w-full",
  heading: "h-6 w-2/3",
  block: "h-24 w-full",
  circle: "size-8 rounded-full",
  button: "h-7 w-24 rounded-md",
  kpi: "",
  "table-row": "",
};

export function Skeleton({
  variant = "block",
  lines,
  cells,
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  // Multi-line text
  if (variant === "text" && lines && lines > 1) {
    return (
      <div
        aria-busy
        aria-hidden
        className={cn("space-y-2", className)}
        {...rest}
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(BASE, "h-3", i === lines - 1 ? "w-4/5" : "w-full")}
          />
        ))}
      </div>
    );
  }

  // KPI placeholder
  if (variant === "kpi") {
    return (
      <div
        aria-busy
        aria-hidden
        className={cn(
          "rounded-[var(--radius)] border border-[var(--sage-soft)] bg-[var(--moss-rise)] p-4 space-y-3",
          className,
        )}
        {...rest}
      >
        <div className={cn(BASE, "h-3 w-1/3")} />
        <div className={cn(BASE, "h-9 w-1/2")} />
        <div className={cn(BASE, "h-2.5 w-2/3")} />
      </div>
    );
  }

  // Table row placeholder
  if (variant === "table-row") {
    const cellCount = cells ?? 4;
    return (
      <tr aria-busy aria-hidden className={className} {...rest as React.HTMLAttributes<HTMLTableRowElement>}>
        {Array.from({ length: cellCount }).map((_, i) => (
          <td key={i} className="px-4 py-2.5">
            <div className={cn(BASE, "h-3", i === 0 ? "w-3/4" : i === cellCount - 1 ? "w-12" : "w-2/3")} />
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div
      aria-busy
      aria-hidden
      style={{ width, height, ...style }}
      className={cn(BASE, VARIANT_DEFAULT[variant], className)}
      {...rest}
    />
  );
}
