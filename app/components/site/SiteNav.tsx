"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "../theme/ThemeToggle";

const LINKS = [
  { href: "/how-it-works", label: "Product" },
  { href: "/architecture", label: "Architecture" },
  { href: "/trust", label: "Trust" },
  { href: "/pricing", label: "Pricing" },
  { href: "/resources", label: "Docs" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Listener-driven only — no synchronous setState in the effect body.
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={
          "glass-nav transition-shadow duration-300 " +
          (scrolled ? "shadow-[0_10px_30px_-24px_rgba(0,0,0,0.6)]" : "")
        }
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8"
        >
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img
              src="/brand/tricognita-mark.png"
              alt="Tricognita"
              width={26}
              height={26}
              className="transition-transform duration-500 group-hover:rotate-[8deg]"
              style={{ width: 26, height: 26, filter: "var(--mark-filter)" }}
            />
            <span className="font-semibold tracking-[-0.01em] text-[15px] text-fg">
              Tricognita
            </span>
          </Link>

          {/* Center links (desktop) */}
          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "rounded-lg px-3 py-2 text-sm transition-colors " +
                    (active
                      ? "text-fg"
                      : "text-muted hover:text-fg")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:grid" />
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-fg lg:block"
            >
              Sign in
            </Link>
            <Link href="/request-demo" className="btn-2026 btn-primary hidden sm:inline-flex">
              Get a demo
            </Link>

            {/* Mobile trigger */}
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-hair text-fg md:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="glass-nav border-t-0 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 pb-5 pt-2 sm:px-8">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-[15px] text-fg/90 transition-colors hover:bg-[color-mix(in_oklab,var(--fg)_6%,transparent)]"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-hair pt-4">
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-muted">Sign in</Link>
              </div>
              <Link href="/request-demo" onClick={() => setOpen(false)} className="btn-2026 btn-primary">Get a demo</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
