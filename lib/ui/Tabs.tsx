"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "./cn";

/**
 * Tabs — section switcher.
 *
 * Two modes:
 *   - link tabs (href given): the tab state lives in the URL, so a tab is
 *     shareable and restorable. Preferred for detail pages.
 *   - button tabs (onSelect given): local state for in-card switching.
 *
 * Scrolls horizontally on narrow screens rather than wrapping.
 */

export interface TabItem {
  id: string;
  label: string;
  href?: string;
  count?: number;
  disabled?: boolean;
}

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  items: TabItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
}

const BASE =
  "relative whitespace-nowrap px-3 py-2 text-[var(--text-sm)] rounded-[var(--radius-tight)] transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]";

export function Tabs({ items, activeId, onSelect, ariaLabel, className, ...rest }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 overflow-x-auto border-b border-[var(--border-subtle)]",
        className,
      )}
      {...rest}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const content = (
          <>
            {item.label}
            {typeof item.count === "number" && (
              <span className="ml-1.5 tabular-nums text-[var(--fg-subtle)]">{item.count}</span>
            )}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 -bottom-px h-px",
                active ? "bg-[var(--brand-primary)]" : "bg-transparent",
              )}
            />
          </>
        );
        const classes = cn(
          BASE,
          active ? "text-[var(--fg)]" : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
          item.disabled && "opacity-[var(--disabled-opacity)] pointer-events-none",
        );
        return item.href ? (
          <Link
            key={item.id}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={classes}
          >
            {content}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onSelect?.(item.id)}
            className={classes}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
