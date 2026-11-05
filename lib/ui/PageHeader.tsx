import * as React from "react";
import { cn } from "./cn";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/**
 * PageHeader — title, scope/meta line, actions.
 *
 * The meta line carries the two facts every product screen owes the reader:
 * what the number covers (scope) and when it was last true (time). Both are
 * optional nodes so pages compose <DateTime> themselves.
 *
 * Responsive: actions sit inline from md up, and wrap beneath the title below.
 */

interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: React.ReactNode;
  /** Small line under the title: scope, last verified, account count. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
}

export function PageHeader({
  title,
  description,
  meta,
  actions,
  breadcrumbs,
  className,
  ...rest
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)} {...rest}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex flex-col gap-1">
          <h1 className="text-[var(--text-xl)] md:text-[var(--text-2xl)] font-semibold text-[var(--fg)] leading-[var(--leading-tight)] text-balance">
            {title}
          </h1>
          {description && (
            <p className="text-[var(--text-sm)] text-[var(--fg-muted)] max-w-[70ch]">{description}</p>
          )}
          {meta && (
            <p className="text-[11px] text-[var(--fg-subtle)] tabular-nums flex flex-wrap items-center gap-x-3 gap-y-1">
              {meta}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
