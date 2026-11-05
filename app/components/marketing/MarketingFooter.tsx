import Link from "next/link";
import { FOOTER_COLUMNS, SCOPE_LINE } from "@/lib/marketing/site";

/** Marketing footer (Sitemap §3.3). */
export function MarketingFooter() {
  return (
    <footer className="border-t border-hair">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.label}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">{col.label}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-fg/80 hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-12 flex flex-col gap-3 border-t border-hair pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{SCOPE_LINE}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a href="mailto:contact@tricognita.com" className="hover:text-fg">
              contact@tricognita.com
            </a>
            <a href="mailto:security@tricognita.com" className="hover:text-fg">
              security@tricognita.com
            </a>
          </p>
          <p>© 2026 Tricognita</p>
        </div>
      </div>
    </footer>
  );
}
