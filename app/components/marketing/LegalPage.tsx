import Link from "next/link";
import { Container } from "./Blocks";
import { LEGAL_LINKS } from "@/lib/marketing/site";

/**
 * Legal page template (Sitemap T8).
 *
 * The wording of Privacy, Terms, the DPA and the subprocessor list must come
 * from counsel (Content Master §20–21). Until it does, each page renders its
 * section structure with a visible draft notice and is excluded from search
 * (robots noindex; absent from sitemap.xml). The previous versions promised
 * data residency and features the platform does not provide, so they are not
 * carried forward.
 */
export function LegalPage({ title, sections, intro }: { title: string; intro: string; sections: string[] }) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Legal" className="text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Legal</h2>
          <ul className="mt-4 space-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted hover:text-fg">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted">Questions: contact@tricognita.com</p>
          <div role="note" className="mt-8 rounded-2xl border border-hair bg-surface p-5 text-sm text-fg">
            This document is being finalised with our legal counsel and will be published here. Until then, email{" "}
            <a href="mailto:contact@tricognita.com" className="text-accent underline-offset-4 hover:underline">
              contact@tricognita.com
            </a>{" "}
            with any question about it.
          </div>
          <p className="mt-8 text-base leading-relaxed text-muted">{intro}</p>
          <h2 className="mt-10 text-lg font-semibold text-fg">Contents</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
            {sections.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </article>
      </div>
    </Container>
  );
}

export const LEGAL_DRAFT_ROBOTS = { index: false, follow: true } as const;
