import Link from "next/link";
import type { ReactNode } from "react";
import { AriaProductCard } from "./AriaStatus";
import { CardGrid, CtaBand, PageHero, Section, StatusChip } from "./Blocks";
import { CapabilityBadge, StateBadge } from "./CapabilityBadge";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  type CloudId,
} from "@/lib/marketing/capabilities";
import {
  ARIA_MODEL,
  CLOUD_COPY,
  cloudById,
  cloudIndependentServices,
  servicesOnCloud,
  summaryFitsCloud,
} from "@/lib/marketing/clouds";
import { MARKETS } from "@/lib/marketing/company";
import { ctaForState, serviceCta } from "@/lib/marketing/services";
import { PLATFORM_HREF, SCOPING_CALL_HREF } from "@/lib/marketing/site";

/**
 * One cloud's page (/cloud/aws, /cloud/azure, /cloud/google-cloud). Every
 * state is derived from the registry through lib/marketing/clouds.ts; the
 * component never names a state. Sections that need a cloud-specific
 * capability (Azure fixes) render only when the registry has one. ARIA's
 * capability list stays on /product; here it is one product with its
 * product-level state.
 */

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

export function CloudDetail({ id }: { id: CloudId }) {
  const cloud = cloudById(id);
  const copy = CLOUD_COPY[id];
  const evaluation = capabilityById(cloud.platformCapabilityId);
  const fixes = cloud.fixCapabilityId ? capabilityById(cloud.fixCapabilityId) : undefined;
  const services = servicesOnCloud(cloud);
  const independent = cloudIndependentServices();
  // The page's own CTA follows the cloud's services state.
  const cloudCta = ctaForState(cloud.servicesState, undefined, { cloud: cloud.id }) ?? { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };
  const productCta = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };
  const isExpanding = Boolean(copy.expansion);
  const bookableClouds = CLOUDS.filter((c) => c.id !== id && c.servicesState === "available").map((c) => c.name);

  return (
    <>
      {/* Hero */}
      <PageHero
        eyebrow={copy.eyebrow}
        title={copy.title}
        sub={copy.intro}
        primary={cloudCta}
        secondary={productCta}
        note="Serving India and the United Arab Emirates · A written scope before any work starts"
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-3">
            <dt className="text-muted">Services on {cloud.name}</dt>
            <dd>
              <StateBadge state={cloud.servicesState} />
            </dd>
          </div>
          {evaluation && (
            <div className="flex items-center gap-3">
              <dt className="text-muted">
                {PRODUCT_DISPLAY_NAME} on {cloud.name}
              </dt>
              <dd>
                <CapabilityBadge capability={evaluation} />
              </dd>
            </div>
          )}
        </dl>
      </PageHero>

      {/* What is being expanded (clouds still launching) */}
      {copy.expansion && (
        <Section
          id="expansion"
          eyebrow="What we are expanding"
          title={`${cloud.name} support is being expanded`}
          intro={
            <p>
              {cloud.name} is part of Tricognita&apos;s cloud footprint. Services and {PRODUCT_DISPLAY_NAME} on {cloud.name}{" "}
              show their current state above, and move forward only after validation. No launch date is published.
            </p>
          }
        >
          <div className="rounded-2xl border border-hair bg-surface p-6 text-sm leading-relaxed text-fg">
            <Dashes items={copy.expansion} />
          </div>
        </Section>
      )}

      {/* Services on this cloud */}
      <Section
        id="services"
        tone={isExpanding ? "raised" : "plain"}
        eyebrow="Services"
        title={`Services on ${cloud.name}`}
        intro={<p>Each service shows its state on {cloud.name}. Only available services can be booked.</p>}
      >
        <ul className="rounded-2xl border border-hair bg-surface px-5 sm:px-6">
          {services.map(({ service, state }) => {
            const cta = ctaForState(state, service.id, { cloud: cloud.id });
            return (
              <li
                key={service.id}
                className="flex flex-col gap-2 border-b border-hair py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-fg">{service.name}</h3>
                  {summaryFitsCloud(service.summary, cloud) && <p className="mt-0.5 text-sm text-muted">{service.summary}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-4">
                  <StateBadge state={state} />
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
        {independent.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Not tied to a cloud</h3>
            <ul className="mt-2 space-y-2">
              {independent.map((s) => {
                const cta = serviceCta(s);
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-fg">{s.name}</span>
                    <CapabilityBadge capability={s} />
                    {cta && (
                      <Link href={cta.href} className="font-medium text-accent underline-offset-4 hover:underline">
                        {cta.label} <span aria-hidden="true">→</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Section>

      {/* ARIA on this cloud */}
      <Section
        id="aria"
        tone={isExpanding ? "plain" : "raised"}
        eyebrow={PRODUCT_DISPLAY_NAME}
        title={`${PRODUCT_DISPLAY_NAME} on ${cloud.name}`}
        intro={
          <p>
            {PRODUCT_DISPLAY_NAME} is our product for {PRODUCT_DESCRIPTOR.toLowerCase()}. On {cloud.name}:{" "}
            {copy.productLine.charAt(0).toLowerCase() + copy.productLine.slice(1)}
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
        <AriaProductCard className="mt-6" />
      </Section>

      {/* Automated fixes (only where the registry has a fix capability for this cloud) */}
      {fixes && (
        <Section
          id="fixes"
          eyebrow="Automated fixes"
          title={`Customer-authorised fixes on ${cloud.name}`}
          intro={
            <>
              {fixes.enablementWording && <p className="text-fg">{fixes.enablementWording}</p>}
              <p>{fixes.summary}</p>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Panel title="Current state" badge={<CapabilityBadge capability={fixes} />}>
              <p>
                Fixes are off until your organisation enables them. Each supported action is validated individually;
                controls without a validated action are fixed by people and verified the same way.
              </p>
            </Panel>
            <figure className="rounded-2xl border border-hair bg-surface p-6">
              <figcaption className="text-xs font-medium uppercase tracking-wider text-muted">
                Fix → verification → result (sample)
              </figcaption>
              <ol className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Control checked</span>
                  <StatusChip status="failing" />
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Approved fix applied</span>
                  <span className="text-xs text-muted">change recorded</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Same check re-run</span>
                  <StatusChip status="passing" />
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Result</span>
                  <StatusChip status="fixed" />
                </li>
              </ol>
              <p className="mt-4 text-xs text-muted">Sample sequence. If the re-check fails, the control stays open.</p>
            </figure>
          </div>
        </Section>
      )}

      {/* Access model */}
      <Section id="access" tone="raised" eyebrow="Access" title={`How access works on ${cloud.name}`}>
        <div className="rounded-2xl border border-hair bg-surface p-6 text-sm leading-relaxed text-fg">
          <Dashes items={copy.access} />
        </div>
        <p className="mt-4 text-sm">
          <Link href="/security" className="font-medium text-accent underline-offset-4 hover:underline">
            Trust &amp; security <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* What you receive + what remains human */}
      <Section id="receive" eyebrow="Deliverables" title="What you receive, and what stays with people">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="What you receive">
            <Dashes
              items={[
                "Assessment findings on the affected resources",
                "Prioritised remediation guidance",
                "Verification of each fix",
                `Signed, linked records and a closure record where ${PRODUCT_DISPLAY_NAME} is used`,
              ]}
            />
          </Panel>
          <Panel title="What remains human">
            <Dashes
              items={[
                "Security testing and judgement",
                "Prioritisation and planning",
                "Complex and sensitive production changes",
                "Approval of every change, by your organisation",
              ]}
            />
          </Panel>
        </div>
      </Section>

      {/* Markets */}
      <Section id="markets" tone="raised" eyebrow="Where we work" title="India and the United Arab Emirates">
        <CardGrid columns={2} items={MARKETS.map((m) => ({ title: m.name, body: m.body }))} />
      </Section>

      <CtaBand
        title={isExpanding ? `Interested in ${cloud.name}?` : "Start with a scoping call."}
        body={
          isExpanding
            ? `Tell us about your ${cloud.name} environment. We will keep you informed as services and ${PRODUCT_DISPLAY_NAME} launch on ${cloud.name}.`
            : `Tell us about your ${cloud.name} environment and what you need to fix or prove. You receive a written scope before any work starts.`
        }
        primary={cloudCta}
        secondary={productCta}
      />
      {cloud.servicesState !== "available" && bookableClouds.length > 0 && (
        <p className="-mt-10 pb-16 text-center text-sm text-muted">
          Working on {bookableClouds.join(" or ")} today?{" "}
          <Link href={SCOPING_CALL_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
            Book a scoping call
          </Link>
        </p>
      )}
    </>
  );
}
