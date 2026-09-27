import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero, Section } from "../../components/marketing/Blocks";
import { AriaStatus } from "../../components/marketing/AriaStatus";
import { CapabilityBadge, StateBadge } from "../../components/marketing/CapabilityBadge";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  type Capability,
} from "@/lib/marketing/capabilities";
import { ARIA_MODEL, cloudHref, servicesOnCloud } from "@/lib/marketing/clouds";
import { ENGAGEMENT_FLOW, PEOPLE_DECIDE, STAGES, START_STEPS } from "@/lib/marketing/method";
import { serviceCta } from "@/lib/marketing/services";
import { HOW_WE_WORK_HREF, PLATFORM_HREF, PLATFORM_TALK_HREF, SERVICES_HREF } from "@/lib/marketing/site";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 §27–§28 ("How we work:
// method + approvals + trust summary"). Stage copy from lib/marketing/method.ts;
// every service, capability, cloud, state and CTA comes from the registry.
export const metadata: Metadata = {
  title: "How we work",
  description: `From finding a security problem to proving what changed: how Tricognita and ${PRODUCT_DISPLAY_NAME} test, fix, verify and keep cloud security controls in place, with people making every decision.`,
  alternates: { canonical: HOW_WE_WORK_HREF },
};

const caps = (ids: readonly string[]): Capability[] =>
  ids.map((id) => capabilityById(id)).filter((c): c is Capability => Boolean(c) && c!.visibility !== "never");

const LINK = "inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline";

export default function HowWeWorkPage() {
  // Same convention as the rest of the site: book only when the lead service is bookable.
  const lead = capabilityById("cloud-security-assessment");
  const primaryCta = (lead && serviceCta(lead)) ?? { href: PLATFORM_TALK_HREF, label: `Talk to us about ${PRODUCT_DISPLAY_NAME}` };
  const productCta = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow="Method"
        title="How we work"
        sub={
          <>
            <span className="block text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              From finding a security problem to proving what changed.
            </span>
            <span className="mt-4 block">
              We do not stop at identifying a problem. Every engagement is structured around establishing what is wrong,
              fixing what you approve, verifying the result, and continuing to check where the service supports it.
            </span>
          </>
        }
        primary={primaryCta}
        secondary={productCta}
      >
        <nav aria-label="Stages">
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STAGES.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex min-h-11 flex-col rounded-2xl border border-hair bg-surface p-4 transition-colors hover:bg-surface2"
                >
                  <span className="font-mono text-xs text-muted">0{i + 1}</span>
                  <span className="mt-1 text-lg font-semibold text-fg">{s.name}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </PageHero>

      {/* 2. Start with the environment */}
      <Section
        id="start"
        eyebrow="Before anything changes"
        title="Start with the environment"
        intro={<p>Every engagement begins by understanding what you run and what you need, before any testing or change.</p>}
      >
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {START_STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-hair bg-surface p-5">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-base font-semibold text-fg">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 3–6. Test, Fix, Verify, Keep secure */}
      {STAGES.map((stage, i) => {
        const services = caps(stage.serviceIds);
        const ariaCaps = caps(stage.capabilityIds);
        const enablement = ariaCaps.find((c) => c.enablementWording)?.enablementWording;
        return (
          <Section
            key={stage.id}
            id={stage.id}
            tone={i % 2 === 0 ? "raised" : "plain"}
            eyebrow={`Stage 0${i + 1}`}
            title={stage.name}
            intro={<p className="text-lg text-fg">{stage.purpose}</p>}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
                <p className="eyebrow">Services · what our people do</p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-fg">
                  {stage.people.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden="true" className="text-muted">
                        –
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <ul className="mt-5 space-y-2 border-t border-hair pt-4">
                  {services.map((s) => {
                    const cta = serviceCta(s);
                    return (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                        <span className="text-fg">{s.name}</span>
                        <span className="flex items-center gap-3">
                          <CapabilityBadge capability={s} />
                          {cta && (
                            <Link href={cta.href} className={`${LINK} text-xs`}>
                              {cta.label} <span aria-hidden="true">&nbsp;→</span>
                            </Link>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
                <p className="eyebrow">{PRODUCT_DISPLAY_NAME} · what the software does</p>
                <p className="mt-3 text-sm leading-relaxed text-fg">{stage.aria}</p>
                {enablement && <p className="mt-2 text-xs leading-relaxed text-muted">{enablement}</p>}
                <p className="mt-5 border-t border-hair pt-4">
                  <AriaStatus />
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{stage.boundary}</p>
          </Section>
        );
      })}

      {/* 7. What ARIA does */}
      <Section
        id="aria"
        eyebrow="The software"
        title={`What ${PRODUCT_DISPLAY_NAME} does`}
        intro={
          <>
            <p className="text-lg text-fg">{PRODUCT_DESCRIPTOR}</p>
            <p>
              {PRODUCT_DISPLAY_NAME} handles the repeatable cloud-control work in every stage. Your organisation and our
              engineers keep every decision.
            </p>
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
        <p className="mt-4 text-sm">
          <Link href={PLATFORM_HREF} className={LINK}>
            How {PRODUCT_DISPLAY_NAME} works <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </p>
      </Section>

      {/* 8. What people do */}
      <Section
        id="people"
        tone="raised"
        eyebrow="Decisions"
        title="What people decide"
        intro={<p>The software never makes an independent decision about your production systems. People remain responsible for:</p>}
      >
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PEOPLE_DECIDE.map((d) => (
            <li key={d} className="flex gap-3 rounded-xl border border-hair bg-surface p-4 text-sm leading-relaxed text-fg">
              <span aria-hidden="true" className="mt-0.5 text-accent">
                ◆
              </span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/security" className={LINK}>
            How access and approvals work <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </p>
      </Section>

      {/* 9. Clouds and service fit */}
      <Section
        id="clouds"
        eyebrow="Clouds"
        title="Which services apply on each cloud"
        intro={<p>A service is shown on a cloud only where it covers that cloud, with its state there.</p>}
      >
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const evaluation = capabilityById(cloud.platformCapabilityId);
            const onCloud = servicesOnCloud(cloud);
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
                <ul className="mt-4 flex-1 space-y-1.5 border-t border-hair pt-3 text-xs">
                  {onCloud.map(({ service, state }) => (
                    <li key={service.id} className="flex items-center justify-between gap-3">
                      <span className="text-fg">{service.name}</span>
                      <StateBadge state={state} />
                    </li>
                  ))}
                </ul>
                <Link href={cloudHref(cloud)} className={`${LINK} mt-3 text-sm`}>
                  {cloud.name} <span aria-hidden="true">&nbsp;→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 10. Engagement flow */}
      <Section
        id="flow"
        tone="raised"
        eyebrow="In practice"
        title="What an engagement looks like"
        intro={<p>Each engagement is scoped and priced in writing. Timelines are agreed per engagement.</p>}
      >
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENGAGEMENT_FLOW.map((f, i) => (
            <li key={f.title} className="rounded-2xl border border-hair bg-surface p-5">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-sm font-semibold text-fg">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex flex-wrap gap-x-6 text-sm">
          <Link href={SERVICES_HREF} className={LINK}>
            Our services <span aria-hidden="true">&nbsp;→</span>
          </Link>
          <Link href="/pricing" className={LINK}>
            How pricing works <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </p>
      </Section>

      {/* 11. Final CTA */}
      <CtaBand
        title={lead && serviceCta(lead)?.href === primaryCta.href ? "Start with a scoping call." : `Talk to us about ${PRODUCT_DISPLAY_NAME}.`}
        body={
          lead && serviceCta(lead)?.href === primaryCta.href
            ? "Tell us about your cloud and what you need to fix or prove. You receive a written scope before any work starts."
            : `Tell us about your cloud and what you need. We will show you where ${PRODUCT_DISPLAY_NAME} and our services stand today.`
        }
        primary={primaryCta}
        secondary={productCta}
      />
    </>
  );
}
