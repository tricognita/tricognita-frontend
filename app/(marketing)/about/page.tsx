import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CardGrid, CtaBand, PageHero, Section } from "../../components/marketing/Blocks";
import { CapabilityBadge, StateBadge } from "../../components/marketing/CapabilityBadge";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_CAPABILITIES,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  renderedState,
  SERVICES,
  type PublicState,
} from "@/lib/marketing/capabilities";
import { COMPANY_VISION, ENGINEERING_PRINCIPLES, FOUNDER, MARKETS } from "@/lib/marketing/company";
import { PLATFORM_HREF, SCOPING_CALL_HREF, SERVICES_HREF } from "@/lib/marketing/site";

// Plan: docs/02_Company/Marketing/TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1
// (Rev A §20 About / Founder). About answers why Tricognita exists, who built
// it, how it thinks and where it is going; /product explains ARIA. Founder
// facts and story, markets, clouds, states and the product name come from
// lib/marketing/*. No team is shown beyond the founder.
export const metadata: Metadata = {
  title: "About",
  description: `Why Tricognita exists, who built it and where it is going: a cloud security engineering company combining security services with ${PRODUCT_DISPLAY_NAME}, its product for ${PRODUCT_DESCRIPTOR.toLowerCase()}. Built from India, serving India and the UAE.`,
  alternates: { canonical: "/about" },
};

const SCOPING_CTA = { href: SCOPING_CALL_HREF, label: "Book a scoping call" };
const PRODUCT_CTA = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };

function Panel({ eyebrow, title, children }: { eyebrow?: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h3 className={`${eyebrow ? "mt-2 " : ""}text-lg font-semibold text-fg`}>{title}</h3>
      <div className="mt-3 flex-1 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function Dashes({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it} className="flex gap-2">
          <span aria-hidden="true">–</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}


export default function AboutPage() {
  const availableServices = publicCapabilities(SERVICES).filter((s) => renderedState(s) === "available");
  const launchingServices = publicCapabilities(SERVICES).filter((s) => renderedState(s) === "launching");
  const product = publicCapabilities(PRODUCT_CAPABILITIES);
  // ARIA's overall public state: Available only once one of its capabilities is.
  const productState: PublicState = product.some((c) => renderedState(c) === "available") ? "available" : "launching";
  const gcp = capabilityById("evaluation-gcp");

  return (
    <>
      {/* 1. Hero: why Tricognita exists (the homepage says what it does). */}
      <PageHero
        eyebrow="About Tricognita"
        title="Built to close the gap between finding a security problem and knowing it is fixed."
        sub={
          <>
            Tricognita is a cloud security engineering company, built from India and serving India and the United Arab
            Emirates. We combine hands-on security engineering with {PRODUCT_DISPLAY_NAME}, our product for{" "}
            {PRODUCT_DESCRIPTOR.toLowerCase()}.
          </>
        }
        primary={SCOPING_CTA}
        secondary={PRODUCT_CTA}
      />

      {/* 2. Founder story */}
      <Section id="story" eyebrow="Our story" title="Why Tricognita exists">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-hair bg-surface p-6">
              <p className="text-lg font-semibold text-fg">{FOUNDER.name}</p>
              <p className="mt-1 text-sm text-muted">{FOUNDER.title}</p>
              <a href="#founder" className="mt-4 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
                Credentials and focus <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <div className="space-y-5 text-base leading-relaxed text-muted lg:col-span-2">
            {FOUNDER.story.map((para) => (
              <p key={para}>{para}</p>
            ))}
            <p className="text-sm text-fg">— {FOUNDER.name}</p>
          </div>
        </div>
      </Section>

      {/* 3. Company model (short; technical detail lives on /product) */}
      <Section
        id="model"
        tone="raised"
        eyebrow="Company model"
        title="Two engines: services and product"
        intro={<p>Both are core to Tricognita, and each makes the other better.</p>}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel eyebrow="Services" title="What our people do">
            <p>
              Assessment, testing, remediation, readiness and secure engineering, with retainers that keep controls in
              place.
            </p>
            <Link href={SERVICES_HREF} className="mt-4 inline-block font-medium text-accent underline-offset-4 hover:underline">
              Our services <span aria-hidden="true">→</span>
            </Link>
          </Panel>
          <Panel eyebrow="Product" title={PRODUCT_DISPLAY_NAME}>
            <p>
              Automates the repeatable work: evaluating controls, approved bounded fixes, verification, re-checks and
              records. Every change needs the customer&apos;s authorization.
            </p>
            <Link href={PLATFORM_HREF} className="mt-4 inline-block font-medium text-accent underline-offset-4 hover:underline">
              {PRODUCT_CTA.label} <span aria-hidden="true">→</span>
            </Link>
          </Panel>
        </div>
      </Section>

      {/* 4. How we operate */}
      <Section id="operating-model" eyebrow="How we operate" title="What we do differently">
        <CardGrid
          columns={2}
          items={[
            {
              title: "A written scope first",
              body: "Every engagement starts with a scoping call and a written scope before any work begins.",
            },
            {
              title: "Nothing changes without authorization",
              body: "A named person in the customer's organisation approves every change, and each change is bounded to what it fixes.",
            },
            {
              title: "Every fix is verified",
              body: "Work is finished when the check passes, not when a change is made.",
            },
            {
              title: "Service work becomes product",
              body: `Fixes that prove safe and repeatable in engagements are built into ${PRODUCT_DISPLAY_NAME}.`,
            },
          ]}
        />
      </Section>

      {/* 5. Engineering principles */}
      <Section id="principles" tone="raised" eyebrow="Engineering principles" title="How we make security changes">
        <CardGrid columns={3} items={[...ENGINEERING_PRINCIPLES]} />
      </Section>

      {/* 6. Founder credentials and focus */}
      <Section id="founder" eyebrow="Founder" title={FOUNDER.name} intro={<p>{FOUNDER.title}</p>}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Focus">
            <Dashes items={FOUNDER.focus} />
          </Panel>
          <Panel title="Individual credentials">
            <Dashes items={FOUNDER.credentials} />
            <p className="mt-4 text-xs">These are the founder&apos;s personal credentials, not company certifications.</p>
          </Panel>
        </div>
      </Section>

      {/* 7. ARIA (brief; /product has the detail) */}
      <Section
        id="aria"
        tone="raised"
        eyebrow="Our product"
        title={PRODUCT_DISPLAY_NAME}
        intro={
          <>
            <p className="text-lg text-fg">{PRODUCT_DESCRIPTOR}</p>
            <p>
              We built {PRODUCT_DISPLAY_NAME} so the repeatable parts of cloud security work are done the same way every
              time, with customer approval and human judgement kept in the loop.
            </p>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <StateBadge state={productState} />
          <Link href={PLATFORM_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
            How {PRODUCT_DISPLAY_NAME} works <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Section>

      {/* 8. Markets and clouds */}
      <Section id="markets" eyebrow="Where we are building" title="India and the United Arab Emirates">
        <CardGrid
          columns={2}
          items={MARKETS.map((m) => ({ title: m.name, body: <><p>{m.rationale}</p><p className="mt-2">{m.body}</p></> }))}
        />
        <h3 className="mt-12 text-base font-semibold text-fg">Clouds</h3>
        <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const platform = capabilityById(cloud.platformCapabilityId);
            return (
              <li key={cloud.id} className="rounded-2xl border border-hair bg-surface p-5">
                <h4 className="text-base font-semibold text-fg">{cloud.name}</h4>
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
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-sm text-muted">
          <Link href="/security" className="font-medium text-accent underline-offset-4 hover:underline">
            How we handle access, change and data <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 9. Today and next */}
      <Section
        id="today"
        tone="raised"
        eyebrow="Today and next"
        title="What is real today, and what we are building"
        intro={<p>Every capability on this site carries its current state. We do not describe plans as delivered.</p>}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Available today">
            <Dashes items={availableServices.map((s) => s.name)} />
          </Panel>
          <Panel title="Being built">
            <ul className="space-y-2">
              <li className="flex items-center justify-between gap-3">
                <span>{PRODUCT_DISPLAY_NAME}</span>
                <StateBadge state={productState} />
              </li>
              {gcp && (
                <li className="flex items-center justify-between gap-3">
                  <span>Google Cloud</span>
                  <CapabilityBadge capability={gcp} />
                </li>
              )}
              {launchingServices.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <span>{s.name}</span>
                  <CapabilityBadge capability={s} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </Section>

      {/* 10. Vision */}
      <Section id="vision" eyebrow="Where we are going" title="Services and software that reinforce each other" intro={<p>{COMPANY_VISION}</p>}>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Customer problems", "Engineering knowledge", "Repeatable workflows", `Automation in ${PRODUCT_DISPLAY_NAME}`].map(
            (step, i) => (
              <li key={step} className="rounded-2xl border border-hair bg-surface p-5">
                <p className="font-mono text-xs text-muted">0{i + 1}</p>
                <p className="mt-1 text-sm font-semibold text-fg">{step}</p>
              </li>
            ),
          )}
        </ol>
      </Section>

      {/* 11. CTA */}
      <CtaBand
        title="Start with a scoping call."
        body="Tell us about your cloud and what your customers or auditors are asking for. You receive a written scope before any work starts."
        primary={SCOPING_CTA}
        secondary={PRODUCT_CTA}
      />
    </>
  );
}
