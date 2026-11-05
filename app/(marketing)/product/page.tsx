import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { CtaBand, PageHero, Section, StatusChip } from "../../components/marketing/Blocks";
import { CapabilityBadge, StateBadge, StateLegend } from "../../components/marketing/CapabilityBadge";
import { CapabilityList } from "../../components/marketing/CapabilityList";
import { Frame } from "@/app/components/geometry";
import { EvidenceChain } from "@/app/components/product/EvidenceChain";
import { VerificationPanel } from "@/app/components/product/VerificationPanel";
import {
  capabilityById,
  CLOUDS,
  PRODUCT_CAPABILITIES,
  PRODUCT_CATEGORY,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  PRODUCT_PRICING,
  publicCapabilities,
  renderedState,
  type Capability,
} from "@/lib/marketing/capabilities";
import { PLATFORM_TALK_HREF, SAMPLE_REPORT_HREF, SCOPING_CALL_HREF, SERVICES_HREF } from "@/lib/marketing/site";

// Plan: docs/02_Company/Marketing/TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 §22.
// Every state, the product name and the pricing model come from
// lib/marketing/capabilities.ts. lib/marketing-capabilities.test.ts checks.
export const metadata: Metadata = {
  title: `${PRODUCT_DISPLAY_NAME} — ${PRODUCT_DESCRIPTOR}`,
  description:
    `${PRODUCT_DISPLAY_NAME} evaluates cloud security controls on AWS and Microsoft Azure, applies bounded fixes your team approves, verifies each fix with the same check and keeps signed records. Google Cloud is launching.`,
  alternates: { canonical: "/product" },
};

const TALK_CTA = { href: PLATFORM_TALK_HREF, label: `Talk to us about ${PRODUCT_DISPLAY_NAME}` };
const SAMPLE_CTA = { href: "#sample-record", label: "See a sample closure record" };

const cap = (id: string): Capability => {
  const c = capabilityById(id);
  if (!c) throw new Error(`capability ${id} is missing from the registry`);
  return c;
};

/** A registry capability's badge, inline with a short label. */
function StateLine({ id, label }: { id: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd>
        <CapabilityBadge capability={cap(id)} />
      </dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-hair bg-surface p-6">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  );
}

function Flow({ steps, label }: { steps: { title: string; body: string }[]; label: string }) {
  return (
    <ol aria-label={label} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="rounded-2xl border border-hair bg-surface p-5">
          <p className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</p>
          <h3 className="mt-1 text-sm font-semibold text-fg">{s.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

const LIFECYCLE = [
  {
    stage: "Evaluate",
    points: ["Checks each control on each resource from read-only access.", "Identifies the controls that fail, and where."],
  },
  {
    stage: "Fix",
    points: [
      "Applies bounded fixes for validated capabilities, once a named person in your team approves them.",
      "Tracks the changes your own engineers apply.",
    ],
  },
  {
    stage: "Verify",
    points: ["Re-runs the same check that found the problem.", "Only a passing check marks the control remediated."],
  },
  {
    stage: "Keep secure",
    points: ["Re-checks controls on a schedule.", "Flags drift and keeps the evidence of every check."],
  },
];

const REMEDIATION_STEPS = [
  { title: "Request", body: "A fix is requested for one failing control on one resource." },
  { title: "Named approval", body: "A named person in your organisation approves it. Your team always approves." },
  { title: "Time-limited", body: "The approval is one-time and expires. The control is re-checked before the change runs." },
  { title: "Bounded change", body: "A narrow, supported change is made to that one resource, and nothing else." },
  { title: "Verification", body: "The same check runs again to confirm the result." },
  { title: "Recorded result", body: "The request, approval, change and result are saved as signed records." },
];

const HUMAN = [
  "Security judgement: what a finding means for your business.",
  "Prioritisation: what to fix first, and what can wait.",
  "Planning complex remediation that touches many resources or teams.",
  "Sensitive production changes that need a person at the keyboard.",
  "Penetration testing and retesting.",
  "Communication with your customers, auditors and leadership.",
  "Approval. Every change is approved by a named person in your organisation.",
];

const CONTROL_AREAS = ["Identity", "Logging", "Storage", "Network", "Encryption", "Account configuration", "Resilience"];

export default function ProductPage() {
  const capabilities = publicCapabilities(PRODUCT_CAPABILITIES);
  const byState = (state: "available" | "launching" | "planned") =>
    capabilities.filter((c) => renderedState(c) === state);

  return (
    <>
      {/* 1. Hero */}
      <PageHero
        eyebrow={PRODUCT_CATEGORY}
        title={PRODUCT_DISPLAY_NAME}
        sub={
          <>
            <span className="block text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{PRODUCT_DESCRIPTOR}</span>
            <span className="mt-4 block">
            {PRODUCT_DISPLAY_NAME} is the software engine behind Tricognita&apos;s Test → Fix → Verify → Keep secure. It
            evaluates your cloud security controls, applies bounded fixes your team approves, verifies every fix with the
            same check and keeps a signed record of each step, on AWS and Microsoft Azure, with Google Cloud launching.
            </span>
          </>
        }
        primary={TALK_CTA}
        secondary={SAMPLE_CTA}
        note={
          <>
            {PRODUCT_DISPLAY_NAME} is launching: capabilities show their current state on this page. Every change needs your
            authorization.
          </>
        }
      />

      {/* 2. Problem */}
      <Section
        id="problem"
        eyebrow="The problem"
        title="A findings list is not a fixed cloud."
        intro={
          <p>
            Security teams do not lack findings. What they lack is a repeatable way to close them and prove they stay
            closed.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Findings accumulate">Each review adds to the list faster than engineers can close it.</Card>
          <Card title="A change is not proof">Someone applied a fix. Nobody re-ran the check that found the problem.</Card>
          <Card title="Controls regress">A new deployment or a quick console change quietly reopens what was closed.</Card>
          <Card title="Evidence is rebuilt by hand">
            Every customer review or audit means new screenshots and spreadsheets of the same controls.
          </Card>
          <Card title="No repeatable loop">
            Without the same check before and after every change, “fixed” is an opinion, not a result.
          </Card>
        </div>
      </Section>

      {/* 3. Who uses it */}
      <Section id="who" tone="raised" eyebrow="Who uses it" title="Built for the people who close findings">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Engineering and security leads">
            See which controls fail, approve fixes, apply changes and confirm the result.
          </Card>
          <Card title="Auditors and reviewers">
            A read-only role to see results and records without being able to change anything.
          </Card>
          <Card title="Tricognita engineers">
            When you work with us, our engineers work from the same results and records.
          </Card>
        </div>
      </Section>

      {/* 4. What the platform does */}
      <Section
        id="what"
        eyebrow="What the platform does"
        title="Evaluate → Fix → Verify → Keep secure"
        intro={
          <p>
            The platform does more than report. For supported controls it makes the approved change itself, bounded to
            the one resource that failed, and only with your authorization.
          </p>
        }
      >
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {LIFECYCLE.map((s, i) => (
            <li key={s.stage} className="rounded-2xl border border-hair bg-surface p-6">
              <p className="font-mono text-xs text-muted">0{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-fg">{s.stage}</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent">
                      →
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5. Remediation model */}
      <Section
        id="remediation"
        tone="raised"
        eyebrow="Remediation"
        title="Bounded fixes, authorised by you"
        intro={
          <>
            <p>
              Automated fixes are off until your organisation enables them and grants a separate, narrow write
              permission. Checking never needs it.
            </p>
            <p className="text-fg">{cap("fixes-azure").enablementWording}</p>
          </>
        }
      >
        <Flow label="Remediation steps" steps={REMEDIATION_STEPS} />
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">Current state</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <StateLine id="fixes-azure" label="Customer-authorised fixes on Azure" />
              <StateLine id="fixes-aws" label="Customer-authorised fixes on AWS" />
              <StateLine id="customer-applied-fixes" label="Tracking for fixes your team applies" />
              <StateLine id="approval-model" label="Named, time-limited approvals" />
            </dl>
          </div>
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">What stays with people</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
              <li>Not every control has an automated fix. Each supported action is validated individually.</li>
              <li>Changes that are complex, span many resources or carry production risk stay human-led.</li>
              <li>For those, the platform tracks the change your engineers make and verifies it the same way.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 6. Verification */}
      <Section
        id="verification"
        eyebrow="Verification"
        title="The same check that identified the issue verifies the result."
        intro={
          <>
            <p>
              A fix is not finished when a change is made. It is finished when the check that found the problem passes
              on the same resource. Only a passing check marks a control remediated; a failed re-check keeps it open and
              says so.
            </p>
            <p>
              Verification shows that a specific control passes after a specific change. It does not mean the whole
              environment is secure.
            </p>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <ol aria-label="Sample verification sequence" className="rounded-2xl border border-hair bg-surface p-6 lg:col-span-3">
            <li className="flex items-center justify-between gap-3 border-b border-hair py-3">
              <span className="text-sm text-fg">1. Control checked</span>
              <StatusChip status="failing" />
            </li>
            <li className="flex items-center justify-between gap-3 border-b border-hair py-3">
              <span className="text-sm text-fg">2. Approved fix applied</span>
              <span className="text-xs text-muted">change recorded</span>
            </li>
            <li className="flex items-center justify-between gap-3 border-b border-hair py-3">
              <span className="text-sm text-fg">3. Same check re-run</span>
              <StatusChip status="passing" />
            </li>
            <li className="flex items-center justify-between gap-3 border-b border-hair py-3">
              <span className="text-sm text-fg">4. Control marked remediated</span>
              <StatusChip status="fixed" />
            </li>
            <li className="flex items-center justify-between gap-3 py-3">
              <span className="text-sm text-fg">5. Closure record</span>
              <a href="#sample-record" className="text-xs font-medium text-accent underline-offset-4 hover:underline">
                See sample
              </a>
            </li>
            <li className="pt-2 text-xs text-muted">Sample sequence. If step 3 fails, the control stays open.</li>
          </ol>
          <div className="rounded-2xl border border-hair bg-surface p-6 lg:col-span-2">
            <dl className="space-y-2 text-sm">
              <StateLine id="verification" label="Same-check verification" />
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              You can also re-check a resource on demand, for example after your own engineers change it.
            </p>
          </div>
        </div>
      </Section>

      {/* 7. Drift */}
      <Section
        id="drift"
        tone="raised"
        eyebrow="Drift"
        title="Know when a fixed control breaks again"
        intro={
          <p>
            Controls are re-checked on a schedule. A control that passed and now fails is flagged as drifted, with the
            record of when it last passed, so it can be fixed and verified again.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <dl className="space-y-2 text-sm">
              <StateLine id="scheduled-rechecks" label="Scheduled re-checks and drift detection" />
              <StateLine id="drift-alerts" label="Drift alerts" />
            </dl>
          </div>
          <ol aria-label="Sample drift sequence" className="rounded-2xl border border-hair bg-surface p-6 text-sm">
            <li className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-muted">Verified after fix</span>
              <StatusChip status="passing" />
            </li>
            <li className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-muted">Scheduled re-check</span>
              <StatusChip status="drifted" />
            </li>
            <li className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-muted">Fixed again and verified</span>
              <StatusChip status="passing" />
            </li>
            <li className="pt-2 text-xs text-muted">Sample sequence.</li>
          </ol>
        </div>
      </Section>

      {/* 8. Evidence */}
      <Section
        id="evidence"
        eyebrow="Evidence"
        title="A signed record of every check and change"
        intro={
          <p>
            Every check, approval, change and verification is saved as a signed record, linked to the record before it.
            Integrity is checked when records are viewed, so a broken link shows up rather than hiding.
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <dl className="space-y-2 text-sm">
              <StateLine id="signed-records" label="Signed, linked evidence records" />
              <StateLine id="closure-record" label="Verified closure record" />
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The closure record brings it together: what failed, what changed, who approved it, whether the fix worked
              and whether it stayed fixed. It is a record of what happened, not an audit opinion.
            </p>
          </div>
          <figure className="rounded-2xl border border-hair bg-surface p-6">
            <figcaption className="text-xs font-medium uppercase tracking-wider text-muted">
              Sample: checking a chain of linked records
            </figcaption>
            <div className="mt-4">
              <VerificationPanel links={4} />
            </div>
            <p className="mt-3 text-xs text-muted">Illustration of the integrity check, using sample records.</p>
          </figure>
        </div>
      </Section>

      {/* Controls */}
      <Section
        id="controls"
        tone="raised"
        eyebrow="Controls"
        title="A defined catalogue of cloud security controls"
        intro={
          <p>
            Controls are grouped into seven areas. Each can carry references to frameworks such as CIS Benchmarks, SOC 2
            and ISO 27001 to help your review. A reference is a label, not a compliance verdict.
          </p>
        }
      >
        <ul className="flex flex-wrap gap-2">
          {CONTROL_AREAS.map((a) => (
            <li key={a} className="rounded-full border border-hair bg-surface px-4 py-1.5 text-sm text-fg">
              {a}
            </li>
          ))}
        </ul>
      </Section>

      {/* 9. Clouds */}
      <Section
        id="clouds"
        eyebrow="Clouds"
        title="AWS, Microsoft Azure and Google Cloud"
        intro={
          <p>
            One approval, verification and evidence model across three clouds. Google Cloud is in active development and
            is being expanded rapidly, starting with evaluation of the same controls.
          </p>
        }
      >
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CLOUDS.map((cloud) => {
            const evaluation = cap(cloud.platformCapabilityId);
            const fixes = cloud.fixCapabilityId ? cap(cloud.fixCapabilityId) : undefined;
            return (
              <li key={cloud.id} className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
                <h3 className="text-lg font-semibold text-fg">{cloud.name}</h3>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Evaluation</dt>
                    <dd>
                      <CapabilityBadge capability={evaluation} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted">Bounded fixes</dt>
                    <dd>{fixes ? <CapabilityBadge capability={fixes} /> : <span className="text-xs text-muted">After evaluation</span>}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-muted">{cloud.access}</p>
                {cloud.id === "azure" && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">Automated fixes cover individually validated actions only.</p>
                )}
                {cloud.id === "gcp" && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Evaluation first, then the same approval, verification and evidence model.
                  </p>
                )}
                <div className="flex-1" />
                {cloud.id !== "gcp" ? (
                  <Link
                    href={`/cloud/${cloud.id}`}
                    className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline"
                  >
                    {cloud.name} details <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <Link href={PLATFORM_TALK_HREF} className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline">
                    Register interest <span aria-hidden="true">→</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 10. Capabilities */}
      <Section
        id="capabilities"
        tone="raised"
        eyebrow="Capabilities"
        title={`What ${PRODUCT_DISPLAY_NAME} includes`}
      >
        <StateLegend />
        <div className="mt-6">
          <CapabilityList items={capabilities} showClouds interestHref={PLATFORM_TALK_HREF} />
        </div>
      </Section>

      {/* 11. What remains human */}
      <Section
        id="human"
        eyebrow="What remains human"
        title="The platform does not replace security engineers"
        intro={
          <p>
            It removes repeated checking and record-keeping. The decisions stay with people: yours, and ours when you
            work with us.
          </p>
        }
      >
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {HUMAN.map((h) => (
            <li key={h} className="flex gap-3 rounded-xl border border-hair bg-surface p-4 text-sm leading-relaxed text-muted">
              <span aria-hidden="true" className="mt-0.5 text-accent">
                ◆
              </span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 12. Services + Product */}
      <Section
        id="services"
        tone="raised"
        eyebrow="Services + Product"
        title="Use the platform on its own, or with our engineers"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Services">
            Testing, security judgement, complex remediation, certification readiness and secure cloud engineering,
            delivered by Tricognita.
          </Card>
          <Card title="Product">
            Repeatable evaluation, approved bounded remediation, verification, drift detection and evidence.
          </Card>
          <Card title="Services → Product">
            Engagements can use the platform to verify fixes and produce the closure record. Retainers include platform
            access as it launches.
          </Card>
          <Card title="Product → Services">
            When a finding needs a penetration test, a complex fix or readiness work, our engineers can help. You do not
            need services to use the platform.
          </Card>
        </div>
        <p className="mt-6 text-sm">
          <Link href={SERVICES_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
            Explore our services <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 13. Pricing */}
      <Section id="pricing" eyebrow="Pricing" title="How platform access is priced">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">With the Security Retainer</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{PRODUCT_PRICING.retainer}</p>
          </div>
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-fg">{PRODUCT_PRICING.standalone.label}</h3>
              <StateBadge state={PRODUCT_PRICING.standalone.state} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {PRODUCT_PRICING.standalone.note}{" "}
              <Link href={PLATFORM_TALK_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
                {TALK_CTA.label}
              </Link>
            </p>
          </div>
        </div>
      </Section>

      {/* 14. Availability */}
      <Section
        id="availability"
        tone="raised"
        eyebrow="Availability"
        title="What is available today"
        intro={
          <p>
            Platform capabilities move to Available only after production-readiness validation. Our services are
            available now, and{" "}
            <Link href={SERVICES_HREF} className="text-accent underline-offset-4 hover:underline">
              are listed separately
            </Link>
            .
          </p>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["available", "launching", "planned"] as const).map((state) => {
            const list = byState(state);
            return (
              <div key={state} className="rounded-2xl border border-hair bg-surface p-6">
                <h3 className="flex items-center gap-3 text-base font-semibold text-fg">
                  <StateBadge state={state} />
                </h3>
                {list.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-fg">
                    {list.map((c) => (
                      <li key={c.id}>
                        <a href={`#capability-${c.id}`} className="underline-offset-4 hover:underline">
                          {c.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-muted">No platform capability yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* 15. Sample closure record */}
      <Section
        id="sample-record"
        eyebrow="Sample"
        title="A sample closure record"
        intro={<p>Sample data for illustration. This is not a customer record.</p>}
      >
        <figure className="rounded-2xl border border-dashed border-hair bg-surface p-6 sm:p-8">
          <figcaption className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">Sample closure record</span>
            <span className="rounded-full border border-hair px-2.5 py-0.5 text-xs font-medium text-muted">
              Sample data
            </span>
          </figcaption>
          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            {[
              ["Control", "Storage accounts block public access"],
              ["Resource", "sample-storage-01 (sample)"],
              ["Found", "Failing on first check"],
              ["Change", "Public access disabled on this one resource"],
              ["Approved by", "Named approver in the customer organisation (sample)"],
              ["Verification", "Same check re-run: passing"],
              ["Later re-checks", "Passing"],
              ["Records", "Each step signed and linked to the one before"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wider text-muted">{k}</dt>
                <dd className="mt-1 text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <StatusChip status="failing" />
            <span aria-hidden="true" className="text-muted">
              →
            </span>
            <StatusChip status="fixed" />
            <span aria-hidden="true" className="text-muted">
              →
            </span>
            <StatusChip status="passing" />
          </div>
          <div className="mt-6 max-w-md text-bone" aria-hidden="true">
            <Frame width={4 * 92 + 40} height={70} centered className="h-auto w-full">
              <EvidenceChain count={4} sealedUpTo={3} verifiedUpTo={3} />
            </Frame>
          </div>
          <p className="mt-4 text-xs text-muted">A record of what happened, not an audit opinion.</p>
        </figure>
        <p className="mt-4 text-sm">
          <Link href={SAMPLE_REPORT_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
            See the full synthetic sample report <span aria-hidden="true">→</span>
          </Link>
        </p>
      </Section>

      {/* 16. CTA */}
      <CtaBand
        title={TALK_CTA.label}
        body="Tell us about your cloud and the controls you need to close. We will show you the platform on sample data and where each capability stands. Teams in India and the United Arab Emirates are welcome."
        primary={TALK_CTA}
        secondary={SAMPLE_CTA}
      />
      <section aria-labelledby="cross-sell-title" className="-mt-8 pb-16">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <p id="cross-sell-title" className="text-sm text-muted">
            Need testing, complex remediation or readiness support?{" "}
            <Link href={SCOPING_CALL_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
              Book a scoping call
            </Link>{" "}
            or{" "}
            <Link href={SERVICES_HREF} className="font-medium text-accent underline-offset-4 hover:underline">
              see our services
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
