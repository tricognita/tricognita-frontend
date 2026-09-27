import Link from "next/link";
import type { ReactNode } from "react";
import { CtaBand, PageHero, Section } from "./Blocks";
import { AriaProductCard } from "./AriaStatus";
import { CapabilityBadge, StateBadge } from "./CapabilityBadge";
import { ARIA_NOT_IN_WORKFLOW, ariaSupportsService, ariaWorkflowLine } from "@/lib/marketing/aria";
import { capabilityById, CLOUDS, PRODUCT_DISPLAY_NAME, type Capability } from "@/lib/marketing/capabilities";
import { ARIA_MODEL, serviceStateOnCloud } from "@/lib/marketing/clouds";
import { SERVICE_PAGES, servicePageHref, type ServicePageId } from "@/lib/marketing/service-details";
import { SERVICE_DETAILS, serviceCta, serviceGroup, servicePriceLabel, type ServiceGroup } from "@/lib/marketing/services";
import { HOW_WE_WORK_HREF, PLATFORM_HREF, SERVICES_HREF } from "@/lib/marketing/site";

/**
 * One service's detail page (/services/<id>), Rev A §18 template. Every name,
 * summary, state, price, CTA and cloud badge comes from the registry and its
 * helpers; page copy comes from SERVICE_DETAILS and SERVICE_PAGES. The
 * component never names a state. ARIA appears as one product with its
 * product-level state (lib/marketing/aria.ts), never as capability states.
 */

const GROUP_LABEL: Record<ServiceGroup, string> = {
  primary: "Core service",
  supporting: "Supporting service",
  specialist: "Specialist service",
};

const LINK = "inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline";

function List({ items, mark = "–" }: { items: readonly string[]; mark?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it} className="flex gap-2 text-sm leading-relaxed text-fg">
          <span aria-hidden="true" className="text-muted">
            {mark}
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Panel({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <div id={id} className="flex scroll-mt-24 flex-col rounded-2xl border border-hair bg-surface p-6">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <div className="mt-3 flex-1 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

export function ServiceDetailPage({ id }: { id: ServicePageId }) {
  const service = capabilityById(id);
  if (!service) throw new Error(`service ${id} is missing from the registry`);
  const detail = SERVICE_DETAILS[id];
  const page = SERVICE_PAGES[id];
  const cta = serviceCta(service);
  const allServices = { href: SERVICES_HREF, label: "All services" };
  const price = servicePriceLabel(service);
  const ariaHere = ariaSupportsService(id);
  const related = page.related.map((r) => capabilityById(r)).filter((c): c is Capability => Boolean(c));

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow={`Services · ${GROUP_LABEL[serviceGroup(service)]}`}
        title={service.name}
        sub={service.summary}
        primary={cta ?? allServices}
        secondary={cta ? allServices : undefined}
      >
        <dl className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-3">
            <dt className="text-muted">State</dt>
            <dd>
              <CapabilityBadge capability={service} />
            </dd>
          </div>
          {price && (
            <div className="flex items-center gap-3">
              <dt className="text-muted">Pricing</dt>
              <dd className="text-fg">{price}</dd>
            </div>
          )}
        </dl>
      </PageHero>

      {/* 2–3. Who it is for, when to use it */}
      <Section id="fit" eyebrow="Fit" title="Who it is for, and when">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel id="who" title="Who it is for">
            <p className="text-fg">{detail.audience}</p>
          </Panel>
          <Panel id="when" title="When to use it">
            <List items={detail.triggers} />
          </Panel>
        </div>
      </Section>

      {/* 4. What we do */}
      <Section
        id="what"
        tone="raised"
        eyebrow="Services · what our people do"
        title="What we do"
        intro={<p className="text-fg">{detail.work}</p>}
      >
        <div className="rounded-2xl border border-hair bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Scope</p>
          <div className="mt-3">
            <List items={detail.scope} />
          </div>
        </div>
        <p className="mt-4 text-sm">
          <Link href={HOW_WE_WORK_HREF} className={LINK}>
            How we work <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </p>
      </Section>

      {/* 5–6. What we need, what you receive */}
      <Section id="working-together" eyebrow="Working together" title="What we need, and what you receive">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel id="needs" title="What we need from you">
            <List items={page.needs} />
          </Panel>
          <Panel id="receive" title="What you receive">
            <List items={detail.receives} />
          </Panel>
        </div>
      </Section>

      {/* 7. Boundaries */}
      <Section id="boundaries" tone="raised" eyebrow="Boundaries" title="What this service does not include">
        <div className="rounded-2xl border border-hair bg-surface p-6">
          <List items={page.boundaries} />
        </div>
      </Section>

      {/* 8. ARIA relationship: the product and its product-level state, never
          its capability states (those stay on /product). */}
      <Section
        id="aria"
        eyebrow={PRODUCT_DISPLAY_NAME}
        title={`${PRODUCT_DISPLAY_NAME} and this service`}
        intro={
          ariaHere ? (
            <>
              <p className="text-fg">{ariaWorkflowLine()} It does not replace the engineering work.</p>
              <p>{detail.ariaNote}</p>
            </>
          ) : (
            <p className="text-fg">{ARIA_NOT_IN_WORKFLOW}</p>
          )
        }
      >
        {ariaHere ? (
          <AriaProductCard>
            <p className="font-mono text-xs" aria-label={`${PRODUCT_DISPLAY_NAME} model`}>
              {ARIA_MODEL.map((m) => m.step).join(" → ")}
            </p>
          </AriaProductCard>
        ) : (
          <p className="text-sm">
            <Link href={PLATFORM_HREF} className={LINK}>
              See {PRODUCT_DISPLAY_NAME} <span aria-hidden="true">&nbsp;→</span>
            </Link>
          </p>
        )}
      </Section>

      {/* 9. Clouds and pricing */}
      <Section id="coverage" tone="raised" eyebrow="Coverage" title="Clouds and pricing">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel id="clouds" title="Clouds">
            {service.clouds ? (
              <dl className="space-y-2">
                {CLOUDS.map((cloud) => {
                  const state = serviceStateOnCloud(service, cloud);
                  return (
                    <div key={cloud.id} className="flex items-center justify-between gap-3">
                      <dt className="text-fg">{cloud.name}</dt>
                      <dd>{state ? <StateBadge state={state} /> : <span className="text-xs text-muted">Not covered</span>}</dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p>This service is not tied to a single cloud. Scope is agreed per engagement.</p>
            )}
          </Panel>
          <Panel id="pricing" title="Pricing">
            <p className="text-fg">{price ?? "Not yet priced."}</p>
            <p className="mt-2">Every engagement is scoped and priced in writing before work starts.</p>
            <Link href="/pricing" className={`${LINK} mt-2`}>
              How pricing works <span aria-hidden="true">&nbsp;→</span>
            </Link>
          </Panel>
        </div>
      </Section>

      {/* 10. Related services */}
      {related.length > 0 && (
        <Section id="related" eyebrow="Related" title="Related services">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={servicePageHref(r.id as ServicePageId)}
                  className="flex h-full flex-col rounded-2xl border border-hair bg-surface p-5 transition-colors hover:bg-surface2"
                >
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-fg">{r.name}</span>
                    <CapabilityBadge capability={r} />
                  </span>
                  <span className="mt-2 text-sm leading-relaxed text-muted">{r.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 11. CTA */}
      <CtaBand
        title={cta ? `Talk to us about ${service.name}.` : `${service.name} is on our roadmap.`}
        body="Tell us about your environment and what you need. You receive a written scope before any work starts."
        primary={cta ?? allServices}
        secondary={cta ? allServices : { href: HOW_WE_WORK_HREF, label: "How we work" }}
      />
    </>
  );
}
