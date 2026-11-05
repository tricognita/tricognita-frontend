import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero, Section } from "../../components/marketing/Blocks";
import { CapabilityBadge, StateBadge } from "../../components/marketing/CapabilityBadge";
import { capabilityById, CLOUDS, PRODUCT_DESCRIPTOR, PRODUCT_DISPLAY_NAME } from "@/lib/marketing/capabilities";
import { cloudHref, CLOUD_COPY } from "@/lib/marketing/clouds";
import { INDUSTRIES, INDUSTRIES_HREF, industryHref } from "@/lib/marketing/industries";
import { serviceCta } from "@/lib/marketing/services";
import { PLATFORM_HREF, PLATFORM_TALK_HREF, SERVICES_HREF } from "@/lib/marketing/site";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 §27 (Industries ▾). A hub
// only: every industry card reads lib/marketing/industries.ts, and every state
// comes from the registry. The industry pages hold the detail.
export const metadata: Metadata = {
  title: "Cloud security engineering by industry",
  description: `How Tricognita and ${PRODUCT_DISPLAY_NAME} work with SaaS and fintech teams whose cloud security needs to be engineered, remediated, verified and maintained. For teams in India and the UAE.`,
  alternates: { canonical: INDUSTRIES_HREF },
};

const MODEL = [
  { step: "Assess", body: "Find which cloud controls fail, and why they matter to your business." },
  { step: "Remediate", body: "Fix what matters first, with your engineers and your approval." },
  { step: "Verify", body: "Re-run the same check to confirm each fix." },
  { step: "Keep secure", body: "Re-check on a schedule and catch drift where supported." },
];

const START = [
  { title: "Scoping call", body: "We talk through your cloud and what you need to fix or prove." },
  { title: "Written scope", body: "We agree what is in scope, what is not, and what you receive." },
  { title: "Proposal", body: "You receive a fixed-price proposal before any work starts." },
];

export default function IndustriesPage() {
  const industries = Object.values(INDUSTRIES);
  // Same convention as the industry pages: book only when the lead service is bookable.
  const lead = capabilityById(industries[0].primaryServiceId);
  const primaryCta = (lead && serviceCta(lead)) ?? { href: PLATFORM_TALK_HREF, label: `Talk to us about ${PRODUCT_DISPLAY_NAME}` };
  const productCta = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow="Industries"
        title="Cloud security engineering by industry"
        sub="We work with teams whose cloud security has to be engineered, remediated, verified and maintained, not just reported. Each industry page shows the problems we see, the services that fit and how an engagement runs."
        primary={primaryCta}
        secondary={productCta}
        note="Serving India and the United Arab Emirates"
      />

      {/* 2. Industry cards */}
      <Section id="industries" eyebrow="Choose your industry" title="Industry pages">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {industries.map((i) => (
            <li key={i.id}>
              <Link
                href={industryHref(i)}
                className="group flex h-full flex-col rounded-2xl border border-hair bg-surface p-6 transition-colors hover:bg-surface2 sm:p-8"
              >
                <span className="eyebrow">Industry page</span>
                <span className="mt-2 text-2xl font-semibold tracking-tight text-fg">{i.name}</span>
                <span className="mt-3 text-sm leading-relaxed text-muted">{i.summary}</span>
                <span className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">Common problems</span>
                <ul className="mt-2 space-y-1.5 text-sm text-fg">
                  {i.challenges.slice(0, 3).map((c) => (
                    <li key={c.title} className="flex gap-2">
                      <span aria-hidden="true" className="text-muted">
                        –
                      </span>
                      <span>{c.title}</span>
                    </li>
                  ))}
                </ul>
                <span className="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 group-hover:underline">
                  Explore {i.name} <span aria-hidden="true">&nbsp;→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. Shared operating model */}
      <Section
        id="model"
        tone="raised"
        eyebrow="Across every industry"
        title="Assess → Remediate → Verify → Keep secure"
        intro={
          <p>
            The same loop runs in every engagement. People lead it, and {PRODUCT_DISPLAY_NAME}, our product for{" "}
            {PRODUCT_DESCRIPTOR.toLowerCase()}, makes the repeatable parts consistent.
          </p>
        }
      >
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODEL.map((m, idx) => (
            <li key={m.step} className="rounded-2xl border border-hair bg-surface p-5">
              <p className="font-mono text-xs text-muted">0{idx + 1}</p>
              <h3 className="mt-1 text-base font-semibold text-fg">{m.step}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{m.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm">
          <Link href={PLATFORM_HREF} className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
            How {PRODUCT_DISPLAY_NAME} works <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 4. Clouds */}
      <Section id="clouds" eyebrow="Clouds" title="AWS, Microsoft Azure and Google Cloud">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const evaluation = capabilityById(cloud.platformCapabilityId);
            return (
              <li key={cloud.id}>
                <Link
                  href={cloudHref(cloud)}
                  className="flex h-full flex-col rounded-2xl border border-hair bg-surface p-5 transition-colors hover:bg-surface2"
                >
                  <span className="text-base font-semibold text-fg">{cloud.name}</span>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">Services</dt>
                      <dd>
                        <StateBadge state={cloud.servicesState} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">{PRODUCT_DISPLAY_NAME}</dt>
                      <dd>{evaluation && <CapabilityBadge capability={evaluation} />}</dd>
                    </div>
                  </dl>
                  <span className="mt-3 flex-1 text-sm leading-relaxed text-muted">{CLOUD_COPY[cloud.id].servicesLine}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 5. How to start */}
      <Section
        id="start"
        tone="raised"
        eyebrow="How to start"
        title="Start with a scoping call"
        intro={<p>Whatever your industry, every engagement is scoped and priced in writing before work begins.</p>}
      >
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {START.map((s, idx) => (
            <li key={s.title} className="rounded-2xl border border-hair bg-surface p-5">
              <p className="font-mono text-xs text-muted">0{idx + 1}</p>
              <h3 className="mt-1 text-base font-semibold text-fg">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href={SERVICES_HREF} className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
            Our services <span aria-hidden="true">→</span>
          </Link>
          <Link href="/pricing" className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline">
            How pricing works <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 6. Final CTA */}
      <CtaBand
        title="Tell us what your team needs to fix."
        body={
          lead && serviceCta(lead)?.href === primaryCta.href
            ? "A scoping call covers your cloud, what needs fixing or proving, and what a first engagement would include. You receive a written scope before any work starts."
            : `Tell us about your cloud and what you need. We will show you where ${PRODUCT_DISPLAY_NAME} and our services stand today.`
        }
        primary={primaryCta}
        secondary={productCta}
      />
    </>
  );
}
