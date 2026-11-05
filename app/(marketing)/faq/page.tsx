import type { Metadata } from "next";
import Link from "next/link";
import { Container, CtaBand, PageHero } from "../../components/marketing/Blocks";
import { FaqList, faqJsonLd, type FaqGroup } from "../../components/marketing/Faq";
import { capabilityById, PRODUCT_DESCRIPTOR, PRODUCT_DISPLAY_NAME } from "@/lib/marketing/capabilities";
import { buildFaq } from "@/lib/marketing/faq";
import { serviceCta } from "@/lib/marketing/services";
import { PLATFORM_HREF, PLATFORM_TALK_HREF } from "@/lib/marketing/site";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 (/faq kept, rewritten).
// Every answer is built in lib/marketing/faq.ts from the registries and the
// claims-register-backed security copy; this page only composes it.
export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: `Answers about Tricognita's services, ${PRODUCT_DISPLAY_NAME}, cloud coverage, remediation and verification, pricing and engagements, and how access and changes are controlled.`,
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const sections = buildFaq();
  const groups: FaqGroup[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    items: s.items.map((it) => ({
      q: it.q,
      plain: it.a,
      a: (
        <>
          <p>{it.a}</p>
          {it.links && it.links.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-5">
              {it.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline"
                >
                  {l.label} <span aria-hidden="true">&nbsp;→</span>
                </Link>
              ))}
            </p>
          )}
        </>
      ),
    })),
  }));
  // Same convention as the rest of the site: book only when the lead service is bookable.
  const lead = capabilityById("cloud-security-assessment");
  const primaryCta = (lead && serviceCta(lead)) ?? { href: PLATFORM_TALK_HREF, label: `Talk to us about ${PRODUCT_DISPLAY_NAME}` };
  const productCta = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };

  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        sub={
          <>
            Straight answers about Tricognita&apos;s services and {PRODUCT_DISPLAY_NAME}, our product for{" "}
            {PRODUCT_DESCRIPTOR.toLowerCase()}: what they cover, how changes are authorised, and how engagements are
            priced and run.
          </>
        }
      />
      <nav aria-label="FAQ categories" className="border-b border-hair">
        <Container className="flex flex-wrap gap-x-5 gap-y-1 py-2 text-sm">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-11 items-center text-muted hover:text-fg">
              {s.title}
            </a>
          ))}
        </Container>
      </nav>
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl">
          <FaqList groups={groups} />
        </div>
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(groups) }} />
      <CtaBand
        title="Still have a question?"
        body={
          lead && serviceCta(lead)?.href === primaryCta.href
            ? "A scoping call is the quickest way to get an answer for your environment. You receive a written scope before any work starts."
            : `Tell us what you need. We will show you where ${PRODUCT_DISPLAY_NAME} and our services stand today.`
        }
        primary={primaryCta}
        secondary={productCta}
      />
    </>
  );
}
