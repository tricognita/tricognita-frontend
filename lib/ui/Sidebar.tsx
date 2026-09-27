"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";
import type { Capability } from "@/lib/rbac";
import { type NavItem, type NavSection, isNavItemActive } from "@/lib/product/navigation";

/**
 * Sidebar — product navigation.
 *
 * Items whose capability the current role lacks are not rendered. That is
 * presentation, not authorization: middleware and the backend decide access.
 *
 * Sub-items (control domains, assurance sections) expand only for the active
 * section, so the list stays short enough to scan.
 */

interface SidebarProps {
  sections: NavSection[];
  can: (capability: Capability) => boolean;
  /** Icon rail between lg and xl — labels appear on hover/focus. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ sections, can, collapsed = false, onNavigate }: SidebarProps) {
  const pathname = usePathname() ?? "";

  /**
   * Sub-item highlighting needs the query string (`/dashboard/controls?domain=…`),
   * which the server does not have. Reading window.location during render made
   * the server and client disagree and produced a hydration mismatch, so it is
   * read once after mount instead: the first paint marks no sub-item active,
   * and the highlight appears on the next render. useSearchParams() is the
   * other option, but in a layout-level component it would force all 22 product
   * routes out of static rendering for a styling detail.
   */
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  const visible = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.capability || can(i.capability)),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <nav aria-label="Product" className="flex flex-col gap-5 py-4">
      {visible.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          {section.title && !collapsed && (
            <h2 className="px-3 pb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--fg-subtle)]">
              {section.title}
            </h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                pathname={pathname}
                search={search}
                can={can}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({
  item,
  pathname,
  search,
  can,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  /** Current query string, resolved after mount. Empty during SSR. */
  search: string;
  can: (c: Capability) => boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = isNavItemActive(item, pathname);
  const Icon = item.icon;
  const children = (item.children ?? []).filter((c) => !c.capability || can(c.capability));
  const showChildren = active && children.length > 0 && !collapsed;

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          "group flex items-center gap-2 rounded-[var(--radius-tight)] px-3 py-2 text-[var(--text-sm)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
          active
            ? "bg-[var(--brand-subtle)] text-[var(--fg)]"
            : "text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-overlay)]",
          collapsed && "justify-center px-2",
        )}
      >
        {Icon ? (
          <Icon
            aria-hidden="true"
            strokeWidth={1.75}
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              active ? "text-[var(--brand-primary)]" : "text-current",
            )}
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              "h-4 w-px shrink-0 rounded-full",
              active ? "bg-[var(--brand-primary)]" : "bg-[var(--border-default)]",
            )}
          />
        )}
        {/* The label stays in the accessibility tree in the rail, so the link
            keeps its accessible name for screen readers and keyboard users —
            the icon alone is only a visual shorthand. */}
        <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
      </Link>

      {showChildren && (
        <ul className="mt-0.5 mb-1 ml-5 flex flex-col gap-0.5 border-l border-[var(--border-subtle)] pl-2">
          {children.map((child) => {
            const childActive = pathname + search === child.href;
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "block rounded-[var(--radius-tight)] px-2 py-1.5 text-[var(--text-xs)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]",
                    childActive
                      ? "text-[var(--fg)]"
                      : "text-[var(--fg-subtle)] hover:text-[var(--fg)]",
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
