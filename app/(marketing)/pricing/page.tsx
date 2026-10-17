import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CardGrid, CtaBand, PageHero, Section } from "../../components/marketing/Blocks";
import { CapabilityBadge, StateBadge } from "../../components/marketing/CapabilityBadge";
import { FaqList, type FaqItem } from "../../components/marketing/Faq";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_CAPABILITIES,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  PRODUCT_PRICING,
  publicCapabilities,
  renderedState,
  SERVICES,
  STATE_LABEL,
  type Capability,
  type PublicState,
} from "@/lib/marketing/capabilities";
import { MARKETS } from "@/lib/marketing/company";
import { SERVICE_DETAILS, serviceCta, serviceGroup, servicePriceLabel } from "@/lib/marketing/services";
import { PLATFORM_HREF, PLATFORM_TALK_HREF, SCOPING_CALL_HREF, SERVICES_HREF } from "@/lib/marketing/site";

// Plan: docs/02_Company/Marketing/TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 §8
// (pricing experiment) and §29. No prices are published: service prices come
// from founder-approved registry values only, and ARIA has no standalone price.
export const metadata: Metadata = {
  title: "Pricing",
  description: `How Tricognita prices its cloud security services and ${PRODUCT_DISPLAY_NAME}: services are fixed-price after scoping, and ${PRODUCT_DISPLAY_NAME} is included with the Security Retainer as it launches. For teams in India and the UAE.`,
  alternates: { canonical: "/pricing" },
};

const SCOPING_CTA = { href: SCOPING_CALL_HREF, label: "Book a scoping call" };
const ARIA_CTA = { href: PLATFORM_TALK_HREF, label: `Talk to us about ${PRODUCT_DISPLAY_NAME}` };

const cap = (id: string): Capability => {
  const c = capabilityById(id);
  if (!c) throw new Error(`capability ${id} is missing from the registry`);
  return c;
};

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

function Panel({ title, badge, children }: { title: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        {badge}
      </div>
      <div className="mt-3 flex-1 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

/** One service with its registry state, price wording and state-driven CTA. */
function ServiceRow({ service }: { service: Capability }) {
  const price = servicePriceLabel(service);
  const cta = serviceCta(service);
  return (
    <li className="flex flex-col gap-2 border-b border-hair py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-fg">{service.name}</h4>
        <p className="mt-0.5 text-sm text-muted">{price ?? "On our roadmap"}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-4">
        <CapabilityBadge capability={service} />
        {cta && (
          <Link href={cta.href} className="whitespace-nowrap text-sm font-medium text-accent underline-offset-4 hover:underline">
            {cta.label} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </li>
  );
}

const SCOPING_FACTORS = [
  "What you want to achieve, and by when",
  "Which clouds, and how many accounts, subscriptions or projects",
  "The size and structure of each environment",
  "What is in scope for assessment or testing",
  "How complex the remediation is",
  "How much hands-on engineering you need from us",
];

const PROCESS = [
  { title: "Scoping call", body: "We talk through your cloud and what you need." },
  { title: "Environment and objective", body: "We understand your environment and what a good outcome looks like." },
  { title: "Scope", body: "We define what is in scope and what is not." },
  { title: "Deliverables", body: "We confirm exactly what you will receive." },
  { title: "Proposal", body: "You receive a written commercial proposal." },
  { title: "Engagement", body: "Work begins once you accept the proposal." },
];

const STATE_MEANING: Record<Exclude<PublicState, "deferred">, string> = {
  available: "A current commercial offering you can buy today.",
  launching: "In active development or a controlled launch. Register your interest.",
  planned: "A future capability on our roadmap. Not yet offered.",
};

export default function PricingPage() {
  const services = publicCapabilities(SERVICES);
  const groups: { title: string; items: Capability[] }[] = [
    { title: "Core services", items: services.filter((s) => serviceGroup(s) === "primary") },
    { title: "Supporting services", items: services.filter((s) => serviceGroup(s) === "supporting") },
    { title: "Specialist services", items: services.filter((s) => serviceGroup(s) === "specialist") },
  ];
  const retainer = cap("security-retainer");
  const retainerDetail = SERVICE_DETAILS[retainer.id];
  const retainerCta = serviceCta(retainer);
  const product = publicCapabilities(PRODUCT_CAPABILITIES);
  const productState: PublicState = product.some((c) => renderedState(c) === "available") ? "available" : "launching";

  const cloudLine = CLOUDS.map(
    (c) =>
      `${c.name}: services ${STATE_LABEL[c.servicesState as Exclude<PublicState, "deferred">].toLowerCase()}, ${PRODUCT_DISPLAY_NAME} ${STATE_LABEL[renderedState(cap(c.platformCapabilityId)) as Exclude<PublicState, "deferred">].toLowerCase()}`,
  ).join("; ");

  const buyingPath: { need: string; to: string; href: string; badge?: Capability }[] = [
    { need: "I need a security assessment", to: cap("cloud-security-assessment").name, href: "#services", badge: cap("cloud-security-assessment") },
    { need: "I have findings that need fixing", to: cap("remediation-hardening").name, href: "#services", badge: cap("remediation-hardening") },
    { need: "I need ongoing support", to: retainer.name, href: "#retainer", badge: retainer },
    {
      need: "I need DevSecOps or security engineering",
      to: `${cap("devsecops").name} / ${cap("secure-cloud-engineering").name}`,
      href: "#services",
      badge: cap("devsecops"),
    },
    { need: "I need a penetration test", to: cap("penetration-testing").name, href: "#services", badge: cap("penetration-testing") },
    { need: `I want to discuss ${PRODUCT_DISPLAY_NAME}`, to: ARIA_CTA.label, href: PLATFORM_TALK_HREF },
  ];

  const faq: FaqItem[] = [
    {
      q: "Why aren't all services shown with prices?",
      a: "Two cloud assessments can differ widely in account structure, scope and the engineering depth they need. We agree the scope first and then give you a fixed price in writing.",
      plain: "Scope varies widely between environments, so we agree the scope first and then give a fixed price in writing.",
    },
    {
      q: `Can ${PRODUCT_DISPLAY_NAME} be purchased standalone?`,
      a: `Standalone access is ${STATE_LABEL[PRODUCT_PRICING.standalone.state as Exclude<PublicState, "deferred">].toLowerCase()}. ${PRODUCT_PRICING.standalone.detail} Talk to us if you are interested.`,
      plain: `Standalone access is launching. ${PRODUCT_PRICING.standalone.detail}`,
    },
    {
      q: `Is ${PRODUCT_DISPLAY_NAME} included in the retainer?`,
      a: PRODUCT_PRICING.retainer,
      plain: PRODUCT_PRICING.retainer,
    },
    {
      q: `Can I buy services without ${PRODUCT_DISPLAY_NAME}?`,
      a: `Yes. Every available service can be bought on its own, without ${PRODUCT_DISPLAY_NAME}.`,
      plain: `Yes. Every available service can be bought on its own, without ${PRODUCT_DISPLAY_NAME}.`,
    },
    {
      q: `Can I buy ${PRODUCT_DISPLAY_NAME} without services?`,
      a: `That is what standalone access is for. It is launching; talk to us about it. You do not need services to use ${PRODUCT_DISPLAY_NAME}.`,
      plain: `Standalone access is launching. You do not need services to use ${PRODUCT_DISPLAY_NAME}.`,
    },
    {
      q: "Do you work with AWS, Microsoft Azure and Google Cloud?",
      a: `${cloudLine}.`,
      plain: `${cloudLine}.`,
    },
    {
      q: "Do you work with customers in India and the UAE?",
      a: "Yes. Both are our target markets from the start. Engagements are scoped, proposed and priced in writing for each customer.",
      plain: "Yes. Both are target markets; engagements are scoped and priced in writing for each customer.",
    },
  ];

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow="Pricing"
        title="Priced to the problem, not to a tier."
        sub={
          <>
            Security work scoped to what you need, with a fixed price agreed in writing, and {PRODUCT_DISPLAY_NAME}{" "}
            becoming part of the ongoing verification loop.
          </>
        }
        primary={SCOPING_CTA}
        secondary={ARIA_CTA}
      />

      {/* 2–3. Services pricing */}
      <Section
        id="services"
        eyebrow="Services"
        title="Fixed price after scoping"
        intro={
          <p>
            Every service engagement is priced after a scoping call, as a fixed price in a written proposal. Only
            available services can be booked; launching services take registrations of interest.
          </p>
        }
      >
        <div className="space-y-8">
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">{g.title}</h3>
              <ul className="mt-3 rounded-2xl border border-hair bg-surface px-5 sm:px-6">
                {g.items.map((s) => (
                  <ServiceRow key={s.id} service={s} />
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm">
          <Link href={SERVICES_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
            What each service includes <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 4. What scoping determines */}
      <Section
        id="scoping"
        tone="raised"
        eyebrow="Scoping"
        title="Why there is no universal service price"
        intro={
          <p>
            Two cloud assessments can differ substantially in account structure, scope and the engineering depth they
            need. Scoping sets the price, so you pay for the work your environment actually requires.
          </p>
        }
      >
        <div className="rounded-2xl border border-hair bg-surface p-6 text-sm leading-relaxed text-muted">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">What scoping looks at</p>
          <div className="mt-3 text-fg">
            <Dashes items={SCOPING_FACTORS} />
          </div>
        </div>
      </Section>

      {/* 5. Security Retainer */}
      <Section
        id="retainer"
        eyebrow={retainer.name}
        title="Ongoing security engineering, on a recurring fee"
        intro={
          <p>
            For teams that want security work to continue after the first engagement. Retainer scope and fee are agreed
            in writing.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title={retainer.name} badge={<CapabilityBadge capability={retainer} />}>
            <p>{retainer.summary}</p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted">Typically includes</p>
            <div className="mt-2 text-fg">
              <Dashes items={retainerDetail.scope} />
            </div>
            <p className="mt-3">Re-checking and drift work grow as {PRODUCT_DISPLAY_NAME}&apos;s capabilities launch.</p>
            <p className="mt-4 font-medium text-fg">{servicePriceLabel(retainer)}</p>
          </Panel>
          <Panel title={`${PRODUCT_DISPLAY_NAME} with the retainer`} badge={<StateBadge state={productState} />}>
            <p>{PRODUCT_PRICING.retainer}</p>
            <p className="mt-3">
              Retainer customers get access to {PRODUCT_DISPLAY_NAME} capabilities as each one reaches production. No
              separate {PRODUCT_DISPLAY_NAME} fee applies within the retainer.
            </p>
            <Link href={`${PLATFORM_HREF}#availability`} className="mt-4 inline-block font-medium text-accent underline-offset-4 hover:underline">
              What is available in {PRODUCT_DISPLAY_NAME} <span aria-hidden="true">→</span>
            </Link>
          </Panel>
        </div>
        {retainerCta && (
          <div className="mt-6">
            <Link href={retainerCta.href} className="btn-2026 btn-primary">
              {retainerCta.label}
            </Link>
          </div>
        )}
      </Section>

      {/* 6. ARIA */}
      <Section
        id="aria"
        tone="raised"
        eyebrow="Product"
        title={PRODUCT_DISPLAY_NAME}
        intro={<p className="text-lg text-fg">{PRODUCT_DESCRIPTOR}</p>}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title={`Included with the ${retainer.name}`}>
            <p>{PRODUCT_PRICING.retainer}</p>
          </Panel>
          <Panel title={PRODUCT_PRICING.standalone.label} badge={<StateBadge state={PRODUCT_PRICING.standalone.state} />}>
            <p>{PRODUCT_PRICING.standalone.detail}</p>
            <Link href={PLATFORM_TALK_HREF} className="mt-4 inline-block font-medium text-accent underline-offset-4 hover:underline">
              {ARIA_CTA.label} <span aria-hidden="true">→</span>
            </Link>
          </Panel>
        </div>
        <p className="mt-6 text-sm">
          <Link href={PLATFORM_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
            How {PRODUCT_DISPLAY_NAME} works <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 7. Services + ARIA */}
      <Section id="together" eyebrow={`Services + ${PRODUCT_DISPLAY_NAME}`} title="Buy one, or both">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title={`Service → ${PRODUCT_DISPLAY_NAME}`}>
            A service engagement can introduce your team to {PRODUCT_DISPLAY_NAME}&apos;s verification and remediation
            workflow. Keep using it afterwards only if it suits you.
          </Panel>
          <Panel title={`${PRODUCT_DISPLAY_NAME} → Service`}>
            {PRODUCT_DISPLAY_NAME} customers can engage us for testing, complex remediation, architecture, readiness or
            ongoing engineering. Neither requires the other.
          </Panel>
        </div>
      </Section>

      {/* 8. Buying path */}
      <Section id="buying-path" tone="raised" eyebrow="Where to start" title="Start from what you need">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {buyingPath.map((b) => (
            <li key={b.need}>
              <a
                href={b.href}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-hair bg-surface p-4 hover:bg-surface2"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-muted">“{b.need}”</span>
                  <span className="mt-1 block text-sm font-semibold text-fg">{b.to}</span>
                </span>
                {b.badge && <CapabilityBadge capability={b.badge} />}
              </a>
            </li>
          ))}
        </ul>
      </Section>

      {/* 9. Availability */}
      <Section id="availability" eyebrow="Availability" title="What the states mean">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["available", "launching", "planned"] as const).map((state) => {
            const list = services.filter((s) => renderedState(s) === state);
            const ariaHere = productState === state;
            return (
              <div key={state} className="rounded-2xl border border-hair bg-surface p-6">
                <StateBadge state={state} />
                <p className="mt-3 text-sm leading-relaxed text-muted">{STATE_MEANING[state]}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-fg">
                  {ariaHere && <li className="font-medium">{PRODUCT_DISPLAY_NAME}</li>}
                  {list.map((s) => (
                    <li key={s.id}>{s.name}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 10. Markets */}
      <Section
        id="markets"
        tone="raised"
        eyebrow="Where we work"
        title="India and the United Arab Emirates"
        intro={<p>Proposals are written for each customer. No regional price list is published.</p>}
      >
        <CardGrid columns={2} items={MARKETS.map((m) => ({ title: m.name, body: m.body }))} />
      </Section>

      {/* 11. What happens next */}
      <Section id="next" eyebrow="What happens next" title="From scoping call to engagement">
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROCESS.map((p, i) => (
            <li key={p.title} className="rounded-2xl border border-hair bg-surface p-5">
              <p className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="mt-1 text-sm font-semibold text-fg">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 12. FAQ */}
      <Section id="faq" tone="raised" eyebrow="FAQ" title="Pricing questions">
        <FaqList groups={[{ title: "Common questions", items: faq }]} />
      </Section>

      {/* 13. CTA */}
      <CtaBand
        title="Start with a scoping call."
        body="Tell us about your cloud and what you need. You receive a written scope and a fixed-price proposal before any work starts."
        primary={SCOPING_CTA}
        secondary={ARIA_CTA}
      />
    </>
  );
}
