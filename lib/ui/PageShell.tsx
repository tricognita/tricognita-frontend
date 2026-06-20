"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * PageShell — standardized outer container for every authenticated route
 * (/dashboard, /dashboard/findings, /dashboard/aria, ...). Enforces consistent
 * page width, padding, vertical rhythm, and header structure.
 *
 * Why this exists:
 *   Before: every page wrote its own `<main className="max-w-[1600px] mx-auto
 *   p-4 lg:p-8 space-y-8 pb-20">` and its own header markup. Drift across
 *   pages was visible — different widths, different padding, different header
 *   typography.
 *
 *   After: <PageShell title=... eyebrow=... actions=...> sets it once.
 *
 * Width tokens (max-w):
 *   default  — 1600px (the dashboard's standard wide grid)
 *   narrow   — 1100px (settings forms, single-column reads)
 *   wide     — 1920px (graphs / heatmaps that need horizontal space)
 *   full     — 100%   (modals embedded as pages, command centers)
 *
 * Density tokens (vertical rhythm):
 *   default  — space-y-8  (most dashboard pages)
 *   tight    — space-y-6  (table-heavy pages where header is small)
 *   spacious — space-y-12 (executive-summary / hero pages)
 *
 * If a route needs a totally custom layout, do NOT use PageShell — use a
 * plain <main> and document why. But that should be rare.
 */

export type PageShellWidth = "default" | "narrow" | "wide" | "full";
export type PageShellDensity = "default" | "tight" | "spacious";

interface PageShellProps {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Trailing status block rendered to the right of the title block. */
  meta?: React.ReactNode;
  children: React.ReactNode;
  width?: PageShellWidth;
  density?: PageShellDensity;
  className?: string;
}

const WIDTH_CLASSES: Record<PageShellWidth, string> = {
  default: "max-w-[1600px]",
  narrow: "max-w-[1100px]",
  wide: "max-w-[1920px]",
  full: "max-w-full",
};

const DENSITY_CLASSES: Record<PageShellDensity, string> = {
  default: "space-y-8",
  tight: "space-y-6",
  spacious: "space-y-12",
};

export function PageShell({
  title,
  eyebrow,
  description,
  actions,
  meta,
  children,
  width = "default",
  density = "default",
  className,
}: PageShellProps) {
  const hasHeader = title || eyebrow || description || actions || meta;
  return (
    <main
      className={cn(
        "mx-auto px-4 lg:px-8 pt-6 pb-20",
        WIDTH_CLASSES[width],
        DENSITY_CLASSES[density],
        className,
      )}
    >
      {hasHeader && (
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1 space-y-1.5">
            {eyebrow && (
              <div className="eyebrow text-[var(--matcha-300)]">{eyebrow}</div>
            )}
            {title && (
              <h1 className="serif-display text-3xl lg:text-4xl text-[var(--stone-50)]">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-[var(--stone-400)] max-w-3xl leading-relaxed">
                {description}
              </p>
            )}
            {meta && <div className="pt-2">{meta}</div>}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </header>
      )}
      {children}
    </main>
  );
}
