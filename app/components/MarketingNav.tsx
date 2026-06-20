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

// Indigo badge mark
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
      {/* Translucent matcha-tinted glass rail */}
      <div className="absolute inset-0 bg-[rgba(11,9,20,0.72)] backdrop-blur-xl border-b border-sage-soft" />
      <div className="relative max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="group flex items-center gap-2.5 cursor-dot">
          <Mark className="transition-transform duration-500 group-hover:scale-105" />
          <span className="font-mono font-bold text-[14px] tracking-[0.1em] text-stone-50 border border-sage-soft px-2 py-0.5 rounded uppercase">
            Tricognita
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {LINKS.slice(1).map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`link-draw px-3 py-1.5 text-[13px] font-medium cursor-dot ${
                  active ? "text-matcha-200" : "text-stone-300"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-block px-3 py-1.5 text-[13px] text-stone-300 hover:text-matcha-200 transition-colors cursor-dot"
          >
            Log in
          </Link>
          <Link href="/contact" className="btn-matcha !px-5 !py-2.5 !text-[13px] cursor-dot">
            Begin Onboarding
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
