import type { ReactNode } from "react";

/**
 * FAQ list — native <details>/<summary>, so it works without JavaScript and is
 * keyboard- and screen-reader-accessible by default.
 */

export interface FaqItem {
  q: string;
  a: ReactNode;
  /** Plain-text answer for FAQPage structured data. */
  plain: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
  /** Optional anchor id, for in-page category navigation. */
  id?: string;
}

export function FaqList({ groups }: { groups: FaqGroup[] }) {
  return (
    <div className="space-y-12">
      {groups.map((g) => (
        <section key={g.title} id={g.id} aria-label={g.title} className={g.id ? "scroll-mt-24" : undefined}>
          <h2 className="text-xl font-semibold text-fg">{g.title}</h2>
          <div className="mt-4 divide-y divide-[var(--hair)] rounded-2xl border border-hair">
            {g.items.map((it) => (
              <details key={it.q} className="group px-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-base font-medium text-fg">
                  <span>{it.q}</span>
                  <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="-mt-2 pb-5 text-sm leading-relaxed text-muted">{it.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** FAQPage JSON-LD built from the same answers shown on the page. */
export function faqJsonLd(groups: FaqGroup[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) =>
      g.items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: { "@type": "Answer", text: it.plain },
      })),
    ),
  });
}
