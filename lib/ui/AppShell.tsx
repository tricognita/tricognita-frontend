"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";
import { Sidebar } from "./Sidebar";
import { canDo, type Capability } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { PRODUCT_NAV, PRODUCT_BASE } from "@/lib/product/navigation";
import { productRoleOf, PRODUCT_ROLE_LABEL } from "@/lib/domain";

/**
 * AppShell — the product frame: sidebar, header, content.
 *
 * Responsive behaviour (FRONTEND_ARCHITECTURE.md §7):
 *   ≥1280  full sidebar (240px)
 *   1024–1279 icon rail (64px), labels on hover
 *   <1024  drawer opened from the header
 *
 * The shell holds no product data. It reads only the session, so a slow or
 * failing data call never blanks the navigation.
 */

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useSession();
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Close the mobile drawer on navigation.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const can = React.useCallback((c: Capability) => canDo(role, c), [role]);
  const productRole = productRoleOf(role);

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)] text-[var(--fg)]">
      <a
        href="#product-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[var(--z-toast)] focus:m-2 focus:rounded-[var(--radius-tight)] focus:bg-[var(--surface-raised)] focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden lg:flex flex-col shrink-0 border-r border-[var(--border-subtle)] bg-[var(--surface-base)]",
            "sticky top-0 h-screen overflow-y-auto",
            "lg:w-16 xl:w-60",
          )}
        >
          <div className="px-3 py-4 border-b border-[var(--border-subtle)]">
            <Link
              href={`${PRODUCT_BASE}/overview`}
              className="block font-[var(--font-display)] text-[var(--text-sm)] tracking-[0.14em] uppercase text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded-sm"
            >
              <span className="xl:hidden">T</span>
              <span className="hidden xl:inline">Tricognita</span>
            </Link>
          </div>
          <div className="hidden xl:block">
            <Sidebar sections={PRODUCT_NAV} can={can} />
          </div>
          <div className="xl:hidden">
            <Sidebar sections={PRODUCT_NAV} can={can} collapsed />
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-[var(--z-nav)] flex items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-base)]/95 backdrop-blur px-4 py-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              className="lg:hidden rounded-[var(--radius-tight)] border border-[var(--border-default)] px-2.5 py-1.5 text-[var(--text-xs)] text-[var(--fg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
            >
              Menu
            </button>
            <span className="lg:hidden font-[var(--font-display)] text-[var(--text-sm)] tracking-[0.14em] uppercase">
              Tricognita
            </span>
            <div className="ml-auto flex items-center gap-3 text-[11px] text-[var(--fg-subtle)]">
              {!isLoading && productRole && <span>{PRODUCT_ROLE_LABEL[productRole]}</span>}
            </div>
          </header>

          <main id="product-main" className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[var(--container-max)] flex flex-col gap-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[var(--z-overlay)] flex">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-[var(--surface-canvas)]/70 backdrop-blur-[2px] cursor-default"
          />
          <div className="relative h-full w-[280px] max-w-[85vw] overflow-y-auto border-r border-[var(--border-default)] bg-[var(--surface-base)]">
            <div className="flex items-center justify-between px-3 py-4 border-b border-[var(--border-subtle)]">
              <span className="font-[var(--font-display)] text-[var(--text-sm)] tracking-[0.14em] uppercase">
                Tricognita
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="text-[var(--fg-muted)] hover:text-[var(--fg)] px-1 text-lg leading-none rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                ×
              </button>
            </div>
            <Sidebar sections={PRODUCT_NAV} can={can} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
