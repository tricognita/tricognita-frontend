import type { Metadata } from "next";
import Link from "next/link";
import { BulletList, CardGrid, CtaBand, PageHero, Section, StatusChip } from "../components/marketing/Blocks";
import { AriaProductCard } from "../components/marketing/AriaStatus";
import { CapabilityBadge, StateBadge, StateLegend } from "../components/marketing/CapabilityBadge";
import { CapabilityList } from "../components/marketing/CapabilityList";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_CATEGORY,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  SERVICES,
} from "@/lib/marketing/capabilities";
import { cloudHref } from "@/lib/marketing/clouds";
import { DATA_HANDLING, FOUNDER, MARKETS, PUBLISHED_PROOF } from "@/lib/marketing/company";
import { PLATFORM_HREF, SCOPING_CALL_HREF } from "@/lib/marketing/site";

// Plan: docs/02_Company/Marketing/TRICOGNITA_WEBSITE_REBUILD_PLAN.md (Rev B.1).
// Every capability state, the product name and the founder facts come from
// lib/marketing/*. Do not hard-code them here; lib/marketing-capabilities.test.ts checks.
export const metadata: Metadata = {
  title: "Cloud Security Engineering for AWS and Azure",
  description:
    `Tricognita tests, fixes and verifies cloud security for companies in India and the UAE: security engineering services on AWS and Microsoft Azure, plus ${PRODUCT_DISPLAY_NAME}, for ${PRODUCT_DESCRIPTOR.toLowerCase()}.`,
  alternates: { canonical: "/" },
};

const SCOPING_CTA = { href: SCOPING_CALL_HREF, label: "Book a scoping call" };
const PLATFORM_CTA = { href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` };

/** Test → Fix → Verify → Keep secure. People lead every stage; software supports. */
const STAGES: { name: string; people: string; software: string }[] = [
  {
    name: "Test",
    people: "We assess your cloud, scope penetration tests and explain what matters for your business.",
    software: "The platform checks your controls resource by resource from read-only access.",
  },
  {
    name: "Fix",
    people: "We plan each fix with your engineers and help apply it safely, with a rollback plan.",
    software: "For supported controls, the platform applies a bounded fix to the one resource that failed, only after a named person in your team approves it. Other changes are tracked as your team makes them.",
  },
  {
    name: "Verify",
    people: "We confirm the fix did what it should and retest where testing found the issue.",
    software: "The same check that found the problem runs again. Only a passing check counts as fixed.",
  },
  {
    name: "Keep secure",
    people: "A retainer keeps us reviewing changes, drift and new risks with you.",
    software: "Scheduled re-checks flag a control that passed and now fails, with the record of what changed.",
  },
];

const RECEIVE = [
  <><strong className="text-fg">Findings</strong>: what fails, on which resource, and why it matters.</>,
  <><strong className="text-fg">Remediation guidance</strong>: the exact change, its effect and how to roll it back.</>,
  <><strong className="text-fg">Verification</strong>: the fix re-checked by the same test that found the problem.</>,
  <><strong className="text-fg">Signed, linked records</strong>: each check saved as a signed record linked to the one before, with integrity checked when viewed.</>,
  <><strong className="text-fg">A closure record</strong>: what failed, what changed, who approved it, whether it worked and whether it stayed fixed.</>,
];

export default function HomePage() {
  const services = publicCapabilities(SERVICES);
  const coreServices = services.filter((s) => s.tier === "primary" || s.tier === "secondary");
  const specialistServices = services.filter((s) => s.tier === "specialist");

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow="Cloud Security Engineering"
        title="We test, fix and verify your cloud security."
        sub={
          <>
            Tricognita is a cloud security engineering company for AWS and Microsoft Azure, with Google Cloud in active
            development. We find what is wrong and fix it with your team. {PRODUCT_DISPLAY_NAME} checks every
            fix and keeps checking, so security does not end with a report.
          </>
        }
        primary={SCOPING_CTA}
        secondary={PLATFORM_CTA}
        note="Serving India and the United Arab Emirates · Read-only access to check · Every change approved by your team"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <p className="eyebrow">Services</p>
            <h2 className="mt-2 text-lg font-semibold text-fg">Engineering that does the work</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Assessment, testing, remediation, hardening and an ongoing retainer, delivered hands-on: we read the findings and
              change the configuration with you.
            </p>
            <Link href="#services" className="mt-4 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
              Our services <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <p className="eyebrow">Product</p>
            <h2 className="mt-2 text-lg font-semibold text-fg">{PRODUCT_DISPLAY_NAME}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {PRODUCT_DESCRIPTOR}. Checks your controls, applies approved bounded fixes for supported controls, verifies every fix and records the result.
            </p>
            <Link href="#platform" className="mt-4 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline">
              The platform <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </PageHero>

      {/* 2. Why */}
      <Section
        id="why"
        eyebrow="Why Tricognita"
        title="Security should not stop at a report."
        intro={
          <>
            <p>
              Most cloud reviews end with a list of findings. The hard part comes after: deciding what to fix first,
              changing production safely, proving the fix worked, and noticing when it quietly breaks again.
            </p>
            <p>
              Tricognita stays for that part. We do the work with your team, and the platform checks the
              result, so you can show a customer or an auditor what was fixed and that it is still fixed.
            </p>
          </>
        }
      />

      {/* 3. Test → Fix → Verify → Keep secure */}
      <Section
        id="how"
        tone="raised"
        eyebrow="How we work"
        title="Test → Fix → Verify → Keep secure"
        intro={<p>People lead every stage. The platform evaluates, applies approved bounded fixes, verifies and records. You approve every change.</p>}
      >
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s, i) => (
            <li key={s.name} className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-fg">{s.name}</h3>
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">People · services</p>
                <p className="mt-1 text-sm leading-relaxed text-fg">{s.people}</p>
              </div>
              <div className="mt-4 border-t border-hair pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Software · {PRODUCT_DISPLAY_NAME}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.software}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* 4. Services */}
      <Section
        id="services"
        eyebrow="Services"
        title="Cloud security engineering services"
        intro={<p>Every engagement starts with a scoping call and a written scope. Each service shows its current state.</p>}
      >
        <StateLegend />
        <div className="mt-6">
          <CapabilityList items={coreServices} />
        </div>
        <h3 className="mt-10 text-base font-semibold text-fg">Specialist services</h3>
        <div className="mt-4">
          <CapabilityList items={specialistServices} />
        </div>
        <div className="mt-8">
          <Link href={SCOPING_CALL_HREF} className="btn-2026 btn-primary">
            Book a scoping call
          </Link>
        </div>
      </Section>

      {/* 5. Product */}
      <Section
        id="platform"
        tone="raised"
        eyebrow="Product"
        title={PRODUCT_DISPLAY_NAME}
        intro={
          <>
            <p className="text-lg text-fg">{PRODUCT_DESCRIPTOR}.</p>
            <p>
              A {PRODUCT_CATEGORY.toLowerCase()} platform that checks your cloud security controls, applies bounded
              fixes for supported controls once your team approves them, tracks the changes your engineers make,
              re-runs the same check to verify each fix, and keeps a signed record of each step. Nothing changes
              without your authorization.
            </p>
            <p>The platform will be included with the Security Retainer; for standalone access, talk to us.</p>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          {/* ARIA as one product with one product-level state; the capability
              list and its states stay on /product. */}
          <div className="lg:col-span-3">
            <AriaProductCard />
          </div>
          <div className="lg:col-span-2">
            <figure className="rounded-2xl border border-hair bg-surface p-6">
              <figcaption className="text-xs font-medium uppercase tracking-wider text-muted">
                One control, over time — illustrative
              </figcaption>
              <ol className="mt-4 space-y-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Checked</span>
                  <StatusChip status="failing" />
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Fix approved and applied</span>
                  <StatusChip status="fixed" />
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Scheduled re-check</span>
                  <StatusChip status="drifted" />
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-muted">Fixed again and verified</span>
                  <StatusChip status="passing" />
                </li>
              </ol>
              <p className="mt-4 text-xs text-muted">Each step is saved as a signed record in the control&apos;s history.</p>
            </figure>
          </div>
        </div>
      </Section>

      {/* 6. Services + Product */}
      <Section
        id="together"
        eyebrow="Services + Product"
        title="Engineering work that becomes repeatable"
        intro={
          <p>
            Every engagement teaches us which fixes are safe and repeatable. We build those into the platform, so your
            team and ours spend less time repeating checks and more time on the problems that need judgement.
          </p>
        }
      >
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ["Engagements", "We assess, test and fix real environments with customers."],
            ["Patterns", "Fixes that are safe and repeatable are written down and reviewed."],
            ["Platform", "Reviewed patterns become checks and approved fixes in the platform."],
            ["Focus", "Repetitive work shrinks; engineering time goes where judgement is needed."],
          ].map(([title, body], i) => (
            <li key={title} className="rounded-2xl border border-hair bg-surface p-6">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-base font-semibold text-fg">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 7. What customers receive */}
      <Section id="receive" tone="raised" eyebrow="Deliverables" title="What you receive">
        <BulletList items={RECEIVE} />
      </Section>

      {/* 8. Clouds */}
      <Section
        id="clouds"
        eyebrow="Clouds"
        title="AWS, Microsoft Azure and Google Cloud"
        intro={<p>Google Cloud support is in active development and is being expanded rapidly.</p>}
      >
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const platform = capabilityById(cloud.platformCapabilityId);
            const href = cloudHref(cloud);
            return (
              <li key={cloud.id} className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
                <h3 className="text-lg font-semibold text-fg">{cloud.name}</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Services</dt>
                    <dd>
                      <StateBadge state={cloud.servicesState} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Platform</dt>
                    <dd>{platform && <CapabilityBadge capability={platform} />}</dd>
                  </div>
                </dl>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{cloud.access}</p>
                {href && (
                  <Link href={href} className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline">
                    {cloud.name} details <span aria-hidden="true">→</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 9. Markets */}
      <Section id="markets" tone="raised" eyebrow="Where we work" title="India and the United Arab Emirates">
        <CardGrid columns={2} items={MARKETS.map((m) => ({ title: m.name, body: m.body }))} />
      </Section>

      {/* 10. Trust */}
      <Section
        id="trust"
        eyebrow="Trust"
        title="How we handle access, change and your data"
        intro={<p>The rules below apply to every engagement and to the platform.</p>}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">You approve every change</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Nothing in your cloud changes without approval from a named person in your team. Every proposal,
              approval and change is recorded with who made it.
            </p>
          </div>
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">Access boundaries</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Checking uses read-only access. Changing needs a separate, narrow permission that you grant explicitly
              and can remove at any time.
            </p>
          </div>
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">Your data</h3>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
              {DATA_HANDLING.map((d) => (
                <li key={d} className="flex gap-2">
                  <span aria-hidden="true">–</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">Who you work with</h3>
            <p className="mt-2 text-sm text-fg">{FOUNDER.title}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              {FOUNDER.credentials.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden="true">–</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/security" className="font-medium text-accent underline-offset-4 hover:underline">
            Read our security approach <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 11. Proof — shown only when a customer has approved publication in writing. */}
      {PUBLISHED_PROOF.length > 0 && (
        <Section id="proof" tone="raised" eyebrow="Customers" title="Work we can share">
          <CardGrid items={PUBLISHED_PROOF.map((p) => ({ title: p.customer, body: p.summary }))} />
        </Section>
      )}

      {/* 12. Final CTA */}
      <CtaBand
        title="Tell us what you need to fix."
        body="A scoping call covers your cloud, what your customers or auditors are asking for, and what a first engagement would include. You receive a written scope before any work starts."
        primary={SCOPING_CTA}
        secondary={PLATFORM_CTA}
      />
    </>
  );
}
