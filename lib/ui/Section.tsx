"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Section — a top-level dashboard section with optional title, eyebrow, and
 * description. Used to group related cards / panels under a single heading.
 *
 * Visual hierarchy:
 *   - Eyebrow (mono caps, matcha) — category label
 *   - Title (sans, semibold, white) — section name
 *   - Description (gray, regular) — one-line context
 *   - Children (grid / stack of Cards)
 *
 * Example:
 *   <Section
 *     eyebrow="Posture"
 *     title="Cloud Security Score"
 *     description="Composite score across IAM, network, storage, and compute domains."
 *     actions={<button>Refresh</button>}
 *   >
 *     <PostureScoreGauge />
 *   </Section>
 */

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Bottom margin to next section. Defaults to lg (32px). */
  spacing?: "sm" | "md" | "lg" | "xl";
}

const SPACING_CLASSES = {
  sm: "mb-4",
  md: "mb-6",
  lg: "mb-8",
  xl: "mb-12",
};

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  function Section(
    {
      eyebrow,
      title,
      description,
      actions,
      spacing = "lg",
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const showHeader = eyebrow || title || description || actions;
    return (
      <section
        ref={ref}
        className={cn(SPACING_CLASSES[spacing], className)}
        {...rest}
      >
        {showHeader && (
          <header className="flex items-end justify-between gap-4 mb-4">
            <div className="min-w-0">
              {eyebrow && (
                <div className="eyebrow text-[var(--matcha-300)]">{eyebrow}</div>
              )}
              {title && (
                <h2 className="text-lg font-semibold text-[var(--stone-50)] tracking-tight mt-1">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-[var(--stone-400)] mt-1 max-w-2xl leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </header>
        )}
        {children}
      </section>
    );
  },
);
