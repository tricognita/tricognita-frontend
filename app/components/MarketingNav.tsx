"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/",          label: "Home" },
  { href: "/services",  label: "Services" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing",   label: "Pricing" },
  { href: "/resources", label: "Resources" },
  { href: "/about",     label: "About" },
  { href: "/contact",   label: "Contact" },
];

// Indigo badge mark — kept for potential reuse
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Mark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-matcha-600 text-white font-bold rounded ${className}`} style={{ width: 24, height: 24, fontSize: 14 }}>
      T
    </div>
  );
}

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="absolute inset-0 bg-[rgba(8,6,16,0.85)] backdrop-blur-2xl" />
      {/* Bottom border with gradient glow */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[rgba(124,58,237,0.2)] to-transparent" />
      <div className="relative max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-3.5">
        <Link href="/" className="group flex items-center gap-3 cursor-dot">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-matcha-600 text-white font-black text-[13px] shadow-[0_0_16px_rgba(124,58,237,0.4)] transition-shadow group-hover:shadow-[0_0_24px_rgba(124,58,237,0.6)]">
            T
          </div>
          <span className="font-mono font-bold text-[13px] tracking-[0.12em] text-white uppercase">
            Tricognita
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5" aria-label="Main">
          {LINKS.slice(1).map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-3.5 py-2 text-[13px] font-medium rounded-md transition-colors cursor-dot ${
                  active
                    ? "text-matcha-200 bg-matcha-900/20"
                    : "text-stone-400 hover:text-stone-100 hover:bg-white/[0.04]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
                {active && <span className="absolute bottom-0 left-3 right-3 h-px bg-matcha-500 rounded-full" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-block px-3.5 py-2 text-[13px] text-stone-400 hover:text-stone-100 transition-colors rounded-md hover:bg-white/[0.04] cursor-dot"
          >
            Sign in
          </Link>
          <Link href="/contact" className="btn-primary !py-2 !px-5 !text-[13px] cursor-dot">
            Book a Demo
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="md:hidden rounded-full p-2 text-stone-300 hover:text-matcha-200 hover:bg-moss-hi transition-colors cursor-dot"
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden relative border-t border-sage-soft bg-[rgba(10,18,15,0.92)] backdrop-blur-xl px-6 py-4 space-y-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm text-stone-200 hover:text-matcha-200 hover:bg-moss-hi rounded-lg transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm text-matcha-300 hover:bg-moss-hi rounded-lg"
          >
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}
