import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CardGrid, Container, CtaBand, PageHero, Section } from "../../components/marketing/Blocks";
import { AriaStatus } from "../../components/marketing/AriaStatus";
import { CapabilityBadge } from "../../components/marketing/CapabilityBadge";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  type Capability,
} from "@/lib/marketing/capabilities";
import { ARIA_MODEL } from "@/lib/marketing/clouds";
import { DATA_HANDLING, ENGINEERING_PRINCIPLES, PUBLISHED_PROOF } from "@/lib/marketing/company";
import {
  CERTIFICATION_STATEMENT,
  CHANGE_FLOW,
  CUSTOMER_CONTROL,
  EVIDENCE_CLAIMS,
  NOT_CLAIMED,
  PLATFORM_CLAIMS,
  REMEDIATION_RULES,
  type SecurityClaim,
} from "@/lib/marketing/security";
import { serviceCta } from "@/lib/marketing/services";
import { PLATFORM_HREF, PLATFORM_TALK_HREF } from "@/lib/marketing/site";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev A §21 (Trust & Security).
// Claims come from lib/marketing/security.ts (each tied to a row of the claims
// register) and lib/marketing/company.ts; states from the registry. Keeps the
// #architecture, #service and #disclosure anchors that redirects and the
// footer rely on.
export const metadata: Metadata = {
  title: "Trust & Security",
  description:
    "How Tricognita approaches security: the access involved, what stays under your control, how changes are authorised, how verification and evidence work, and what we do and do not claim.",
  alternates: { canonical: "/security" },
};

const ANCHORS = [
  { id: "principles", label: "Principles" },
  { id: "access", label: "Your control" },
  { id: "remediation", label: "Changes" },
  { id: "evidence", label: "Evidence" },
  { id: "data", label: "Your data" },
  { id: "architecture", label: "The platform" },
  { id: "publish", label: "What we publish" },
  { id: "disclosure", label: "Security contact" },
];

const LINK = "inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline";

const cap = (id: string): Capability | undefined => capabilityById(id);

function Claims({ items }: { items: readonly SecurityClaim[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((c) => (
        <li key={c.source} className="flex gap-3 text-sm leading-relaxed text-fg">
          <span aria-hidden="true" className="mt-0.5 text-accent">
            ◆
          </span>
          <span>{c.text}</span>
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

export default function SecurityPage() {
  // Same convention as the rest of the site: book only when the lead service is bookable.
  const lead = capabilityById("cloud-security-assessment");
  const primaryCta = (lead && serviceCta(lead)) ?? { href: PLATFORM_TALK_HREF, label: `Talk to us about ${PRODUCT_DISPLAY_NAME}` };
  const productCta = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };
  const azureFixes = cap("fixes-azure");
  const awsFixes = cap("fixes-aws");
  const customerApplied = cap("customer-applied-fixes");

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow="Security"
        title="Trust & Security"
        sub={
          <>
            <span className="block text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
              Security should be understandable before access is granted, and verifiable after changes are made.
            </span>
            <span className="mt-4 block">
              This page sets out the access involved, what stays under your control, how changes are authorised, how
              results are recorded, and what we do and do not claim today.
            </span>
          </>
        }
        primary={primaryCta}
        secondary={productCta}
      />

      <nav aria-label="On this page" className="border-b border-hair">
        <Container className="flex flex-wrap gap-x-5 gap-y-1 py-2 text-sm">
          {ANCHORS.map((a) => (
            <a key={a.id} href={`#${a.id}`} className="inline-flex min-h-11 items-center text-muted hover:text-fg">
              {a.label}
            </a>
          ))}
        </Container>
      </nav>

      {/* 2. Principles */}
      <Section id="principles" eyebrow="Principles" title="How we approach security">
        <CardGrid columns={3} items={[...ENGINEERING_PRINCIPLES]} />
      </Section>

      {/* 3–4. Customer control, access and credentials */}
      <Section
        id="access"
        tone="raised"
        eyebrow="Your control"
        title="Access you create, and can remove"
        intro={<p>Access is granted by you, in your own cloud account. We work toward the narrowest permissions each task needs.</p>}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="What stays under your control">
            <Claims items={CUSTOMER_CONTROL} />
          </Panel>
          <Panel title="How each cloud connects">
            <dl className="space-y-3">
              {CLOUDS.map((c) => {
                const evaluation = cap(c.platformCapabilityId);
                return (
                  <div key={c.id}>
                    <dt className="flex flex-wrap items-center gap-3 font-medium text-fg">
                      {c.name}
                      {evaluation && (
                        <span className="flex items-center gap-2 text-xs font-normal text-muted">
                          {PRODUCT_DISPLAY_NAME}
                          <CapabilityBadge capability={evaluation} />
                        </span>
                      )}
                    </dt>
                    <dd className="mt-1">{c.access}</dd>
                  </div>
                );
              })}
            </dl>
          </Panel>
        </div>
        <div id="credentials" className="mt-4 rounded-2xl border border-hair bg-surface p-6 text-sm leading-relaxed text-muted">
          <h3 className="text-base font-semibold text-fg">Access and credentials</h3>
          <p className="mt-2">
            Connection uses a role or service principal that you create and own. Read-only is not the same as no access:
            on some clouds, read-only roles can read stored data. The permissions an engagement uses are agreed in writing
            before it starts.
          </p>
        </div>
      </Section>

      {/* 5. Remediation authorization */}
      <Section
        id="remediation"
        eyebrow="Changes"
        title="How a change is authorised"
        intro={<p>Every change follows the same path. Your organisation authorises it; nothing runs without that approval.</p>}
      >
        <ol aria-label="Change flow" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CHANGE_FLOW.map((f, i) => (
            <li key={f.step} className="rounded-2xl border border-hair bg-surface p-4">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-sm font-semibold text-fg">{f.step}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{f.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Rules every change follows">
            <Claims items={REMEDIATION_RULES} />
          </Panel>
          <Panel title="Automated fixes, by cloud" badge={<AriaStatus />}>
            <dl className="space-y-4">
              {azureFixes && (
                <div>
                  <dt className="flex flex-wrap items-center gap-3 font-medium text-fg">
                    {azureFixes.name}
                  </dt>
                  <dd className="mt-1">{azureFixes.enablementWording}</dd>
                </div>
              )}
              {awsFixes && (
                <div>
                  <dt className="flex flex-wrap items-center gap-3 font-medium text-fg">
                    {awsFixes.name}
                  </dt>
                  <dd className="mt-1">{awsFixes.summary}</dd>
                </div>
              )}
              {customerApplied && (
                <div>
                  <dt className="flex flex-wrap items-center gap-3 font-medium text-fg">
                    {customerApplied.name}
                  </dt>
                  <dd className="mt-1">Where no automated fix applies, your engineers make the change and it is verified the same way.</dd>
                </div>
              )}
            </dl>
          </Panel>
        </div>
      </Section>

      {/* 6. Evidence and verification */}
      <Section
        id="evidence"
        tone="raised"
        eyebrow="Evidence"
        title="What changed, and what the check returned"
        intro={<p>Verification establishes what changed and what the relevant check returned. Records are signed and linked.</p>}
      >
        <Panel title="How checks and records work" badge={<AriaStatus />}>
          <Claims items={EVIDENCE_CLAIMS} />
        </Panel>
      </Section>

      {/* 7. Data handling */}
      <Section id="data" eyebrow="Your data" title="Data handling">
        <div className="rounded-2xl border border-hair bg-surface p-6">
          <ul className="space-y-2.5">
            {DATA_HANDLING.map((d) => (
              <li key={d} className="flex gap-3 text-sm leading-relaxed text-fg">
                <span aria-hidden="true" className="mt-0.5 text-accent">
                  ◆
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/legal/privacy" className={LINK}>
              Privacy policy <span aria-hidden="true">&nbsp;→</span>
            </Link>
            <span className="mx-3 text-muted" aria-hidden="true">
              ·
            </span>
            <Link href="/legal/subprocessors" className={LINK}>
              Subprocessors <span aria-hidden="true">&nbsp;→</span>
            </Link>
          </p>
        </div>
      </Section>

      {/* 8. Platform / tenant security */}
      <Section
        id="architecture"
        tone="raised"
        eyebrow="The platform"
        title={`Access inside ${PRODUCT_DISPLAY_NAME}`}
        intro={<p>These controls are built into the platform, and are confirmed in production before client access opens.</p>}
      >
        <Panel title="Roles and separation" badge={<AriaStatus />}>
          <Claims items={PLATFORM_CLAIMS} />
        </Panel>
      </Section>

      {/* 9. Public proof */}
      <Section id="publish" eyebrow="What we publish" title="Public proof">
        {PUBLISHED_PROOF.length > 0 ? (
          <CardGrid items={PUBLISHED_PROOF.map((p) => ({ title: p.customer, body: p.summary }))} />
        ) : (
          <div className="rounded-2xl border border-hair bg-surface p-6 text-sm leading-relaxed text-muted">
            <p>
              We have no customer case studies, audit reports or penetration test reports to publish yet. When a customer
              approves publication in writing, it will appear here.
            </p>
            <p className="mt-3 text-fg">{CERTIFICATION_STATEMENT}</p>
          </div>
        )}
      </Section>

      {/* 10. Security contact */}
      <Section id="disclosure" tone="raised" eyebrow="Contact" title="Security contact">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Panel title="Report a security issue">
            <p>
              Found a security issue in Tricognita? Email{" "}
              <a className="text-accent underline-offset-4 hover:underline" href="mailto:security@tricognita.com">
                security@tricognita.com
              </a>{" "}
              with the details. Please give us reasonable time to fix it before disclosing it publicly.
            </p>
          </Panel>
          <div id="service">
            <Panel title="Service and account questions">
              <p>
                Email{" "}
                <a className="text-accent underline-offset-4 hover:underline" href="mailto:contact@tricognita.com">
                  contact@tricognita.com
                </a>
                , or{" "}
                <Link href="/contact" className="text-accent underline-offset-4 hover:underline">
                  use the contact form
                </Link>
                .
              </p>
            </Panel>
          </div>
        </div>
      </Section>

      {/* 11. Transparency boundary */}
      <Section
        id="boundary"
        eyebrow="Transparency"
        title="What we claim, and what we do not"
        intro={<p>Everything above is documented, and each capability shows its current state. The following are not claimed today.</p>}
      >
        <div className="rounded-2xl border border-hair bg-surface p-6">
          <ul className="space-y-2.5">
            {NOT_CLAIMED.map((n) => (
              <li key={n} className="flex gap-3 text-sm leading-relaxed text-muted">
                <span aria-hidden="true">–</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* 12. ARIA */}
      <Section
        id="aria"
        tone="raised"
        eyebrow="The software"
        title={PRODUCT_DISPLAY_NAME}
        intro={
          <>
            <p className="text-lg text-fg">{PRODUCT_DESCRIPTOR}</p>
            <p>
              {PRODUCT_DISPLAY_NAME} carries the repeatable cloud-control work under the rules on this page. People keep
              every decision.
            </p>
          </>
        }
      >
        <ol aria-label={`${PRODUCT_DISPLAY_NAME} model`} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ARIA_MODEL.map((m, i) => (
            <li key={m.step} className="rounded-2xl border border-hair bg-surface p-4">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-sm font-semibold text-fg">{m.step}</h3>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm">
          <Link href={PLATFORM_HREF} className={LINK}>
            How {PRODUCT_DISPLAY_NAME} works <span aria-hidden="true">&nbsp;→</span>
          </Link>
        </p>
      </Section>

      <CtaBand
        title="Questions about access or approvals?"
        body={
          lead && serviceCta(lead)?.href === primaryCta.href
            ? "A scoping call covers the access an engagement needs and how changes will be authorised, before any work starts."
            : `Tell us what you need. We will show you where ${PRODUCT_DISPLAY_NAME} and our services stand today.`
        }
        primary={primaryCta}
        secondary={productCta}
      />
    </>
  );
}
