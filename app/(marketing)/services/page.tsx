import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CardGrid, CtaBand, PageHero, Section } from "../../components/marketing/Blocks";
import { AriaStatus } from "../../components/marketing/AriaStatus";
import { CapabilityBadge, StateBadge, StateLegend } from "../../components/marketing/CapabilityBadge";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  SERVICES,
  type Capability,
} from "@/lib/marketing/capabilities";
import { ariaSupportsService } from "@/lib/marketing/aria";
import { MARKETS } from "@/lib/marketing/company";
import { isServicePage, servicePageHref } from "@/lib/marketing/service-details";
import { CHOOSER, SERVICE_DETAILS, serviceCta, serviceGroup } from "@/lib/marketing/services";
import { PLATFORM_HREF, SCOPING_CALL_HREF } from "@/lib/marketing/site";

// Plan: docs/02_Company/Marketing/TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1
// §17 and Rev A §18. Names and states come from lib/marketing/capabilities.ts;
// service detail and the state-driven call to action from lib/marketing/services.ts.
export const metadata: Metadata = {
  title: "Cloud Security Services",
  description: `Cloud security assessment, remediation and hardening, security retainers and engineering on AWS and Microsoft Azure, supported by ${PRODUCT_DISPLAY_NAME}. For teams in India and the UAE.`,
  alternates: { canonical: "/services" },
};

const SCOPING_CTA = { href: SCOPING_CALL_HREF, label: "Book a scoping call" };
const PRODUCT_CTA = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };

const detail = (c: Capability) => SERVICE_DETAILS[c.id];

function Dashes({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it} className="flex gap-2">
          <span aria-hidden="true">–</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-fg">{children}</div>
    </div>
  );
}

/**
 * A state-driven call to action: booking only for Available services. Core
 * services get a button; supporting and specialist services a quieter link.
 */
function ServiceCta({ service, variant = "button" }: { service: Capability; variant?: "button" | "link" }) {
  const cta = serviceCta(service);
  if (!cta) return null;
  if (variant === "link") {
    return (
      <Link href={cta.href} className="whitespace-nowrap text-sm font-medium text-accent underline-offset-4 hover:underline">
        {cta.label} <span aria-hidden="true">→</span>
      </Link>
    );
  }
  return (
    <Link href={cta.href} className={cta.label === "Book a scoping call" ? "btn-2026 btn-primary" : "btn-2026 btn-ghost"}>
      {cta.label}
    </Link>
  );
}

/**
 * How ARIA relates to a service: the service's own note and ARIA's
 * product-level state. Per-capability states stay on /product.
 */
function AriaSupport({ service }: { service: Capability }) {
  const d = detail(service);
  return (
    <div className="rounded-xl border border-hair bg-surface2 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">How {PRODUCT_DISPLAY_NAME} supports this</p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{d.ariaNote}</p>
      {ariaSupportsService(service.id) && (
        <p className="mt-3">
          <AriaStatus />
        </p>
      )}
    </div>
  );
}

/** A service's name, linked to its detail page where one exists. */
function ServiceName({ service }: { service: Capability }) {
  if (!isServicePage(service.id)) return <>{service.name}</>;
  return (
    <Link href={servicePageHref(service.id)} className="underline-offset-4 hover:underline">
      {service.name}
    </Link>
  );
}

function PrimaryService({ service }: { service: Capability }) {
  const d = detail(service);
  return (
    <article
      id={service.id}
      aria-labelledby={`${service.id}-name`}
      className="scroll-mt-24 rounded-2xl border border-hair bg-surface p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id={`${service.id}-name`} className="text-xl font-semibold text-fg">
          <ServiceName service={service} />
        </h3>
        <CapabilityBadge capability={service} />
      </div>
      <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted">{service.summary}</p>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <Field label="Who it is for">{d.audience}</Field>
          <Field label="Common triggers">
            <Dashes items={d.triggers} />
          </Field>
          <Field label="Scope">
            <Dashes items={d.scope} />
          </Field>
        </div>
        <div className="space-y-5">
          <Field label="What we do">{d.work}</Field>
          <Field label="What you receive">
            <Dashes items={d.receives} />
          </Field>
          <AriaSupport service={service} />
        </div>
      </div>
      <div className="mt-6">
        <ServiceCta service={service} />
      </div>
    </article>
  );
}

function SupportingService({ service }: { service: Capability }) {
  const d = detail(service);
  return (
    <li id={service.id} className="flex scroll-mt-24 flex-col rounded-2xl border border-hair bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-fg">
          <ServiceName service={service} />
        </h3>
        <CapabilityBadge capability={service} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{service.summary}</p>
      <div className="mt-4 flex-1 space-y-3">
        <Field label="Who it is for">{d.audience}</Field>
        <Field label="You receive">{d.receives.join(" · ")}</Field>
        <p className="text-xs leading-relaxed text-muted">
          {PRODUCT_DISPLAY_NAME}: {d.ariaNote}
        </p>
      </div>
      <div className="mt-5">
        <ServiceCta service={service} variant="link" />
      </div>
    </li>
  );
}

const MODEL = [
  {
    stage: "Test",
    services: "Assessments and security testing",
    aria: "Control evaluation from read-only access",
  },
  {
    stage: "Fix",
    services: "Remediation, hardening and secure engineering",
    aria: "Bounded, approved fixes for supported controls, and tracking for the rest",
  },
  {
    stage: "Verify",
    services: "Retesting and verification of every fix",
    aria: "The same check re-run on the same resource",
  },
  {
    stage: "Keep secure",
    services: "Retainers and recurring review",
    aria: "Scheduled re-checks, drift detection and records",
  },
];

export default function ServicesPage() {
  const services = publicCapabilities(SERVICES);
  const primary = services.filter((s) => serviceGroup(s) === "primary");
  const supporting = services.filter((s) => serviceGroup(s) === "supporting");
  const specialist = services.filter((s) => serviceGroup(s) === "specialist");

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow="Cloud Security Services"
        title="Find the problem. Fix it. Verify the result."
        sub={
          <>
            Hands-on security engineering for AWS and Microsoft Azure, with Google Cloud launching. We do not stop at an
            assessment: we fix what we find with your team and verify every fix, supported by {PRODUCT_DISPLAY_NAME}.
          </>
        }
        primary={SCOPING_CTA}
        secondary={{ href: "#choose", label: "Which service do I need?" }}
        note="Serving India and the United Arab Emirates · A written scope before any work starts"
      />

      {/* 2. Delivery model */}
      <Section
        id="model"
        eyebrow="How we deliver"
        title="Test → Fix → Verify → Keep secure"
        intro={<p>Every service sits somewhere in this loop, and most engagements move through more than one step.</p>}
      >
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {MODEL.map((m, i) => (
            <li key={m.stage} className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-fg">{m.stage}</h3>
              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted">Services</p>
              <p className="mt-1 text-sm leading-relaxed text-fg">{m.services}</p>
              <p className="mt-3 border-t border-hair pt-3 text-xs font-medium uppercase tracking-wider text-muted">
                {PRODUCT_DISPLAY_NAME}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{m.aria}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 3–7. Primary services */}
      <Section
        id="primary"
        tone="raised"
        eyebrow="Core services"
        title="Where most engagements start"
        intro={<p>Each service shows its current state. Only available services can be booked.</p>}
      >
        <StateLegend />
        <div className="mt-6 space-y-6">
          {primary.map((s) => (
            <PrimaryService key={s.id} service={s} />
          ))}
        </div>
      </Section>

      {/* 8. Supporting services */}
      <Section
        id="supporting"
        eyebrow="Supporting services"
        title="Engineering that extends the core work"
        intro={<p>Often added to an assessment, remediation or retainer, or bought on their own for a specific need.</p>}
      >
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {supporting.map((s) => (
            <SupportingService key={s.id} service={s} />
          ))}
        </ul>
      </Section>

      {/* 9. Specialist services */}
      <Section
        id="specialist"
        tone="raised"
        eyebrow="Specialist services"
        title="Launching and planned"
        intro={<p>Launching services are being prepared: register your interest. Planned services are on our roadmap.</p>}
      >
        <ul className="rounded-2xl border border-hair bg-surface px-5 sm:px-6">
          {specialist.map((s) => (
            <li
              key={s.id}
              id={s.id}
              className="flex scroll-mt-24 flex-col gap-3 border-b border-hair py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-fg">
                  <ServiceName service={s} />
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.summary}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <CapabilityBadge capability={s} />
                <ServiceCta service={s} variant="link" />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 10–11. Services and ARIA */}
      <Section
        id="aria"
        eyebrow={`Services + ${PRODUCT_DISPLAY_NAME}`}
        title="How services and the product work together"
        intro={
          <p>
            {PRODUCT_DISPLAY_NAME} is our product for {PRODUCT_DESCRIPTOR.toLowerCase()}. It makes the repeatable parts of
            an engagement consistent; our engineers handle the rest.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">Service → {PRODUCT_DISPLAY_NAME}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              An engagement can use {PRODUCT_DISPLAY_NAME} for repeatable control evaluation, fix tracking and
              verification. When the engagement ends, you can keep verifying with {PRODUCT_DISPLAY_NAME}, if that suits
              you.
            </p>
          </div>
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">{PRODUCT_DISPLAY_NAME} → Service</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {PRODUCT_DISPLAY_NAME} customers can bring us in for testing, complex remediation, architecture work,
              readiness or ongoing engineering. You do not need services to use the product.
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm">
          <Link href={PLATFORM_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
            How {PRODUCT_DISPLAY_NAME} works <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 12. How to choose */}
      <Section id="choose" tone="raised" eyebrow="How to choose" title="Start from what you need">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {CHOOSER.map((c) => {
            const s = capabilityById(c.serviceId);
            if (!s) return null;
            return (
              <li key={c.need}>
                <a
                  href={`#${s.id}`}
                  className="flex h-full items-center justify-between gap-3 rounded-xl border border-hair bg-surface p-4 hover:bg-surface2"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-muted">“{c.need}”</span>
                    <span className="mt-1 block text-sm font-semibold text-fg">{s.name}</span>
                  </span>
                  <CapabilityBadge capability={s} />
                </a>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 13. Clouds */}
      <Section id="clouds" eyebrow="Clouds" title="AWS, Microsoft Azure and Google Cloud">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const platform = capabilityById(cloud.platformCapabilityId);
            return (
              <li key={cloud.id} className="rounded-2xl border border-hair bg-surface p-5">
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
                    <dd>{platform && <CapabilityBadge capability={platform} />}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm leading-relaxed text-muted">{cloud.access}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 14. Markets */}
      <Section id="markets" tone="raised" eyebrow="Where we work" title="India and the United Arab Emirates">
        <CardGrid columns={2} items={MARKETS.map((m) => ({ title: m.name, body: m.body }))} />
      </Section>

      {/* 15. What you receive */}
      <Section
        id="receive"
        eyebrow="Deliverables"
        title="What you receive"
        intro={<p>What each engagement includes is set out in its written scope.</p>}
      >
        <CardGrid
          columns={3}
          items={[
            { title: "Findings", body: "What fails, on which resource, and why it matters." },
            { title: "A remediation plan", body: "Fixes in priority order, with their effect and how to roll back." },
            { title: "Engineering changes", body: "Changes applied with your approval, where they are in scope." },
            { title: "Verification", body: "Each fix re-checked by the same test that found the problem." },
            {
              title: "Signed, linked records",
              body: `Where ${PRODUCT_DISPLAY_NAME} is used, each check is saved as a signed record linked to the one before.`,
            },
            {
              title: "Closure and next steps",
              body: "A closure record of what changed and whether it held, and recommendations for what comes next.",
            },
          ]}
        />
      </Section>

      {/* 16. Trust and boundaries */}
      <Section id="boundaries" tone="raised" eyebrow="How we work with you" title="Scope, access and change stay under your control">
        <CardGrid
          columns={3}
          items={[
            { title: "Scope agreed first", body: "Work starts only after a written scope is agreed." },
            { title: "Access you control", body: "Read-only access to assess, in roles you create and can remove." },
            { title: "Your authorization", body: "A named person in your organisation approves every change." },
            { title: "Bounded changes", body: "Each change is limited to the resource and control it fixes." },
            { title: "Verified results", body: "A fix counts only when the check that found the problem passes." },
            { title: "People for sensitive changes", body: "Complex and sensitive production changes stay engineering-led." },
          ]}
        />
        <p className="mt-6 text-sm">
          <Link href="/security" className="font-medium text-accent underline-offset-4 hover:underline">
            Trust &amp; security <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 17. CTA */}
      <CtaBand
        title="Start with a scoping call."
        body="Tell us about your cloud and what you need to fix or prove. You receive a written scope before any work starts."
        primary={SCOPING_CTA}
        secondary={PRODUCT_CTA}
      />
    </>
  );
}
