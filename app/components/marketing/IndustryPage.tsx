import Link from "next/link";
import { AriaProductCard, AriaStatus } from "./AriaStatus";
import { CtaBand, PageHero, Section } from "./Blocks";
import { CapabilityBadge, StateBadge, StateLegend } from "./CapabilityBadge";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  type Capability,
} from "@/lib/marketing/capabilities";
import { ARIA_MODEL, cloudHref, CLOUD_COPY } from "@/lib/marketing/clouds";
import { INDUSTRIES, type IndustryId } from "@/lib/marketing/industries";
import { serviceCta } from "@/lib/marketing/services";
import { PLATFORM_HREF, PLATFORM_TALK_HREF } from "@/lib/marketing/site";

/**
 * An industry landing page (/industries/saas, /industries/fintech). Copy comes
 * from lib/marketing/industries.ts; every service and capability is looked up
 * in the registry, so names, states and calls to action are never written here.
 * ARIA appears as one product with its product-level state; its capability
 * states stay on /product.
 */

const caps = (ids: readonly string[]): Capability[] =>
  ids.map((id) => capabilityById(id)).filter((c): c is Capability => Boolean(c) && c!.visibility !== "never");

export function IndustryPage({ id }: { id: IndustryId }) {
  const industry = INDUSTRIES[id];
  const primary = capabilityById(industry.primaryServiceId);
  const productCta = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };
  // Book only when the lead service is bookable; otherwise lead with the product conversation.
  const heroCta = (primary && serviceCta(primary)) ?? { href: PLATFORM_TALK_HREF, label: `Talk to us about ${PRODUCT_DISPLAY_NAME}` };
  const services = caps(industry.serviceIds);

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow={industry.eyebrow}
        title={industry.title}
        sub={industry.intro}
        primary={heroCta}
        secondary={productCta}
        note="Serving India and the United Arab Emirates · A written scope before any work starts"
      />

      {/* 2. Challenges */}
      <Section id="challenges" eyebrow="The problem" title={industry.challengesTitle}>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {industry.challenges.map((c) => (
            <li key={c.title} className="rounded-2xl border border-hair bg-surface p-6">
              <h3 className="text-base font-semibold text-fg">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. Where Tricognita helps */}
      <Section
        id="helps"
        tone="raised"
        eyebrow="Where we help"
        title="From problem to verified fix"
        intro={
          <p>
            Each response uses an existing Tricognita service, shown with its current state, or {PRODUCT_DISPLAY_NAME}, shown
            as a product.
          </p>
        }
      >
        <ul className="space-y-3">
          {industry.responses.map((r) => (
            <li
              key={r.challenge}
              className="grid grid-cols-1 gap-3 rounded-2xl border border-hair bg-surface p-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,16rem)] md:items-start md:gap-6"
            >
              <p className="text-sm font-semibold text-fg">{r.challenge}</p>
              <p className="text-sm leading-relaxed text-muted">{r.response}</p>
              <ul className="space-y-1.5">
                {caps(r.serviceIds).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-xs text-fg">
                    <span className="min-w-0">{c.name}</span>
                    <CapabilityBadge capability={c} />
                  </li>
                ))}
                {caps(r.capabilityIds).length > 0 && (
                  <li className="text-xs">
                    <AriaStatus />
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      {/* 4. Services */}
      <Section
        id="services"
        eyebrow="Services"
        title={`Services for ${industry.name} teams`}
        intro={<p>Selected from our service catalogue. Each shows its current state; only available services can be booked.</p>}
      >
        <StateLegend />
        <ul className="mt-6 rounded-2xl border border-hair bg-surface px-5 sm:px-6">
          {services.map((s) => {
            const cta = serviceCta(s);
            return (
              <li
                key={s.id}
                className="flex flex-col gap-2 border-b border-hair py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-fg">{s.name}</h3>
                  <p className="mt-0.5 text-sm text-muted">{s.summary}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-4">
                  <CapabilityBadge capability={s} />
                  {cta && (
                    <Link href={cta.href} className="whitespace-nowrap text-sm font-medium text-accent underline-offset-4 hover:underline">
                      {cta.label} <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {industry.boundary && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{industry.boundary}</p>}
        <p className="mt-4 text-sm">
          <Link href="/services" className="font-medium text-accent underline-offset-4 hover:underline">
            All services <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 5. ARIA */}
      <Section
        id="aria"
        tone="raised"
        eyebrow={`${PRODUCT_DISPLAY_NAME} for ${industry.name}`}
        title={PRODUCT_DISPLAY_NAME}
        intro={
          <>
            <p className="text-lg text-fg">{PRODUCT_DESCRIPTOR}</p>
            <p>{industry.ariaIntro}</p>
          </>
        }
      >
        <ol aria-label={`${PRODUCT_DISPLAY_NAME} model`} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ARIA_MODEL.map((m, i) => (
            <li key={m.step} className="rounded-2xl border border-hair bg-surface p-4">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-sm font-semibold text-fg">{m.step}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{m.body}</p>
            </li>
          ))}
        </ol>
        <AriaProductCard className="mt-6" />
      </Section>

      {/* 6. Engagement flow */}
      <Section id="engagement" eyebrow="How an engagement runs" title="Assessment → remediation → verification → re-checks">
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {industry.steps.map((step, i) => {
            const service = step.serviceId ? capabilityById(step.serviceId) : undefined;
            const capability = step.capabilityId ? capabilityById(step.capabilityId) : undefined;
            return (
              <li key={step.title} className="flex flex-col rounded-2xl border border-hair bg-surface p-5">
                <p className="font-mono text-xs text-muted">0{i + 1}</p>
                <h3 className="mt-1 text-base font-semibold text-fg">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{step.body}</p>
                <dl className="mt-4 space-y-1.5 border-t border-hair pt-3 text-xs">
                  {service && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-fg">{service.name}</dt>
                      <dd>
                        <CapabilityBadge capability={service} />
                      </dd>
                    </div>
                  )}
                  {capability && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted">{PRODUCT_DISPLAY_NAME}</dt>
                      <dd>
                        <AriaStatus showName={false} />
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* 7. What remains human */}
      <Section id="human" tone="raised" eyebrow="What remains human" title="Decisions that stay with your people">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {industry.human.map((h) => (
            <li key={h} className="flex gap-3 rounded-xl border border-hair bg-surface p-4 text-sm leading-relaxed text-muted">
              <span aria-hidden="true" className="mt-0.5 text-accent">
                ◆
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 8. Clouds */}
      <Section id="clouds" eyebrow="Clouds" title="AWS, Microsoft Azure and Google Cloud">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const evaluation = capabilityById(cloud.platformCapabilityId);
            return (
              <li key={cloud.id} className="flex flex-col rounded-2xl border border-hair bg-surface p-5">
                <h3 className="text-base font-semibold text-fg">{cloud.name}</h3>
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
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{CLOUD_COPY[cloud.id].servicesLine}</p>
                <Link href={cloudHref(cloud)} className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline">
                  {cloud.name} <span aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 9. CTA */}
      <CtaBand
        title={`Start with the problem your ${industry.name} team has now.`}
        body={
          primary && serviceCta(primary)?.href === heroCta.href
            ? "A scoping call covers your cloud, what needs fixing or proving, and what a first engagement would include. You receive a written scope before any work starts."
            : `Tell us about your cloud and what you need. We will show you where ${PRODUCT_DISPLAY_NAME} and our services stand today.`
        }
        primary={heroCta}
        secondary={productCta}
      />
    </>
  );
}
