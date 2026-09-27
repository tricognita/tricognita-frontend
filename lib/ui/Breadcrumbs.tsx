import * as React from "react";
import Link from "next/link";
import { cn } from "./cn";

/**
 * Breadcrumbs — Controls → control → resource.
 *
 * The last crumb is the current page and is not a link. On narrow screens only
 * the parent and current crumb are shown, so the trail never wraps to two lines.
 */

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: Crumb[];
}

export function Breadcrumbs({ items, className, ...rest }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[11px]", className)} {...rest}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          // Below sm, show only the parent and the current crumb.
          const hideOnMobile = !isLast && i < items.length - 2;
          return (
            <li
              key={`${item.label}-${i}`}
              className={cn("flex items-center gap-1.5", hideOnMobile && "hidden sm:flex")}
            >
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-[var(--fg-muted)] hover:text-[var(--fg)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded-sm"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-[var(--fg)]">
                  {item.label}
                </span>
              )}
              {!isLast && <span className="text-[var(--fg-subtle)]" aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
