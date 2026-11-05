"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../theme/ThemeToggle";
import { HEADER_CTA, HEADER_NAV } from "@/lib/marketing/site";

/**
 * Marketing header (Website Rebuild Plan Rev B.1 §27).
 *
 * Desktop: Services ▾ · Product · Industries ▾ · Cloud ▾ · How we work ·
 * Pricing · About · Sign in · Book a scoping call. Each group is a disclosure
 * button (aria-expanded), closed by Escape or an outside click. Mobile: the
 * call-to-action stays visible; the menu opens as a sheet in the same order.
 */
export function MarketingHeader() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close menus on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpenGroup(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  // Hash links (/#services) point at a homepage section, never "the current page".
  const isActive = (href: string) => !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-50">
      <div className="glass-nav">
        <nav
          ref={navRef}
          aria-label="Primary"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img
              src="/brand/tricognita-mark.png"
              alt=""
              width={26}
              height={26}
              style={{ width: 26, height: 26, filter: "var(--mark-filter)" }}
            />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Tricognita</span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {HEADER_NAV.map((item) => {
              if (item.kind === "link") {
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive(item.href) ? "text-fg" : "text-muted hover:text-fg"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const g = item;
              const expanded = openGroup === g.label;
              const panelId = `nav-${g.label.toLowerCase()}`;
              return (
                <li key={g.label} className="relative">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpenGroup(expanded ? null : g.label)}
                    className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                      g.items.some((i) => isActive(i.href)) ? "text-fg" : "text-muted hover:text-fg"
                    }`}
                  >
                    {g.label} <span aria-hidden="true">▾</span>
                  </button>
                  {expanded && (
                    <div
                      id={panelId}
                      className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-hair bg-bg p-2 shadow-xl"
                    >
                      <ul>
                        {g.items.map((it) => (
                          <li key={it.href}>
                            <Link
                              href={it.href}
                              onClick={() => setOpenGroup(null)}
                              aria-current={pathname === it.href ? "page" : undefined}
                              className="block rounded-xl px-3 py-2.5 hover:bg-surface2"
                            >
                              <span className="block text-sm font-medium text-fg">{it.label}</span>
                              {it.description && <span className="block text-xs text-muted">{it.description}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:grid" />
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-fg lg:block">
              Sign in
            </Link>
            <Link href={HEADER_CTA.href} className="btn-2026 btn-primary whitespace-nowrap">
              {HEADER_CTA.label}
            </Link>
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-hair text-fg lg:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {mobileOpen && (
        <div id="mobile-menu" className="glass-nav max-h-[calc(100vh-4rem)] overflow-y-auto lg:hidden">
          <div className="mx-auto max-w-6xl space-y-2 px-5 pb-6 pt-2 sm:px-8">
            {HEADER_NAV.map((item) =>
              item.kind === "link" ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-[15px] text-fg"
                >
                  {item.label}
                </Link>
              ) : (
                <details key={item.label} className="rounded-xl border border-hair">
                  <summary className="cursor-pointer list-none px-4 py-3 text-[15px] font-medium text-fg">{item.label}</summary>
                  <ul className="pb-2">
                    {item.items.map((it) => (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          onClick={() => setMobileOpen(false)}
                          className="block px-4 py-2 text-sm text-muted hover:text-fg"
                        >
                          {it.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ),
            )}
            <div className="flex items-center justify-between border-t border-hair pt-4">
              <ThemeToggle />
              <Link href="/login" className="text-sm text-muted">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
