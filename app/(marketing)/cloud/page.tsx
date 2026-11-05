import type { Metadata } from "next";
import Link from "next/link";
import { CardGrid, CtaBand, PageHero, Section } from "../../components/marketing/Blocks";
import { AriaProductCard } from "../../components/marketing/AriaStatus";
import { CapabilityBadge, StateBadge } from "../../components/marketing/CapabilityBadge";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  SERVICES,
  type PublicState,
} from "@/lib/marketing/capabilities";
import { ARIA_MODEL, CLOUD_COPY, cloudHref, serviceStateOnCloud } from "@/lib/marketing/clouds";
import { MARKETS } from "@/lib/marketing/company";
import { PLATFORM_HREF, SCOPING_CALL_HREF } from "@/lib/marketing/site";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 §19. Every state is derived
// from the registry through lib/marketing/clouds.ts; nothing here names one.
// ARIA is shown per cloud (its evaluation state) and as one product; the
// capability-by-cloud detail stays on /product#clouds.
export const metadata: Metadata = {
  title: "Cloud Security Engineering on AWS, Microsoft Azure and Google Cloud",
  description: `Cloud security services and ${PRODUCT_DISPLAY_NAME} on AWS and Microsoft Azure, with Google Cloud launching. Each cloud shows its current state. For teams in India and the UAE.`,
  alternates: { canonical: "/cloud" },
};

const SCOPING_CTA = { href: SCOPING_CALL_HREF, label: "Book a scoping call" };
const PRODUCT_CTA = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };

function Cell({ state }: { state: PublicState | null }) {
  return state ? <StateBadge state={state} /> : <span className="text-xs text-muted">Not offered</span>;
}

export default function CloudPage() {
  const cloudServices = publicCapabilities(SERVICES).filter((s) => s.clouds);

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow="Cloud Security Engineering"
        title="Across AWS, Microsoft Azure and Google Cloud."
        sub={
          <>
            Tricognita combines cloud security services with {PRODUCT_DISPLAY_NAME} to evaluate, remediate and verify
            cloud security controls on the clouds we support. Each cloud shows its current state, because capabilities
            differ by cloud.
          </>
        }
        primary={SCOPING_CTA}
        secondary={PRODUCT_CTA}
        note="Serving India and the United Arab Emirates"
      />

      {/* 2. Three clouds */}
      <Section id="clouds" eyebrow="Clouds" title="Three clouds, one approach">
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const evaluation = capabilityById(cloud.platformCapabilityId);
            const copy = CLOUD_COPY[cloud.id];
            return (
              <li key={cloud.id} className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
                <h3 className="text-xl font-semibold text-fg">{cloud.name}</h3>
                <dl className="mt-4 space-y-2 text-sm">
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
                <p className="mt-4 text-sm leading-relaxed text-fg">{copy.servicesLine}</p>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                  {PRODUCT_DISPLAY_NAME}: {copy.productLine}
                </p>
                <Link href={cloudHref(cloud)} className="mt-5 text-sm font-medium text-accent underline-offset-4 hover:underline">
                  {cloud.name} <span aria-hidden="true">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 3. Services × cloud */}
      <Section
        id="services"
        tone="raised"
        eyebrow="Services × cloud"
        title="Which services apply on each cloud"
        intro={<p>A service is never shown as more ready on a cloud than that cloud allows.</p>}
      >
        {/* Desktop: table */}
        <div className="hidden rounded-2xl border border-hair bg-surface md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hair">
                <th scope="col" className="px-5 py-3 font-medium text-muted">
                  Service
                </th>
                {CLOUDS.map((c) => (
                  <th key={c.id} scope="col" className="px-5 py-3 font-medium text-muted">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cloudServices.map((s) => (
                <tr key={s.id} className="border-b border-hair last:border-b-0">
                  <th scope="row" className="px-5 py-3 font-medium text-fg">
                    {s.name}
                  </th>
                  {CLOUDS.map((c) => (
                    <td key={c.id} className="px-5 py-3">
                      <Cell state={serviceStateOnCloud(s, c)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile: one card per service */}
        <ul className="space-y-3 md:hidden">
          {cloudServices.map((s) => (
            <li key={s.id} className="rounded-2xl border border-hair bg-surface p-4">
              <h3 className="text-sm font-semibold text-fg">{s.name}</h3>
              <dl className="mt-2 space-y-1.5 text-sm">
                {CLOUDS.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3">
                    <dt className="text-muted">{c.name}</dt>
                    <dd>
                      <Cell state={serviceStateOnCloud(s, c)} />
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/services" className="font-medium text-accent underline-offset-4 hover:underline">
            All services <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 4. ARIA × cloud */}
      <Section
        id="aria"
        eyebrow={`${PRODUCT_DISPLAY_NAME} × cloud`}
        title="One product model, different maturity per cloud"
        intro={
          <p>
            {PRODUCT_DISPLAY_NAME}, our product for {PRODUCT_DESCRIPTOR.toLowerCase()}, follows the same model on every
            cloud it supports. How far each step has reached differs by cloud.
          </p>
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
        <AriaProductCard className="mt-6">
          <p>
            {PRODUCT_DISPLAY_NAME}&apos;s state on each cloud is shown above.{" "}
            <Link href="/product#clouds" className="font-medium text-accent underline-offset-4 hover:underline">
              Capabilities by cloud
            </Link>{" "}
            are on the product page.
          </p>
        </AriaProductCard>
      </Section>

      {/* 5. Cloud-specific differences */}
      <Section id="differences" tone="raised" eyebrow="Differences" title="Why each cloud has its own state">
        <CardGrid
          columns={3}
          items={[
            {
              title: "Capabilities differ by cloud",
              body: "Each cloud exposes controls differently. A control is checked the way that cloud actually works, and where a control has no equivalent we say so.",
            },
            {
              title: "Remediation differs by cloud",
              body: "Automated fixes are validated action by action, per cloud. Where no validated action exists, fixes are made by people and verified the same way.",
            },
            {
              title: "Rollout is gated by validation",
              body: "Nothing is offered on a cloud until it has been validated there. Until then, its state on this page says so.",
            },
          ]}
        />
      </Section>

      {/* 6. Markets */}
      <Section id="markets" eyebrow="Where we work" title="India and the United Arab Emirates">
        <CardGrid columns={2} items={MARKETS.map((m) => ({ title: m.name, body: m.body }))} />
      </Section>

      {/* 7. CTA */}
      <CtaBand
        title="Start with a scoping call."
        body="Tell us which clouds you run and what you need to fix or prove. You receive a written scope before any work starts."
        primary={SCOPING_CTA}
        secondary={PRODUCT_CTA}
      />
    </>
  );
}
