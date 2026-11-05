import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container, CtaBand, PageHero, Section, StatusChip, type ChipStatus } from "../../components/marketing/Blocks";
import { CapabilityBadge } from "../../components/marketing/CapabilityBadge";
import { PRODUCT_DESCRIPTOR, PRODUCT_DISPLAY_NAME } from "@/lib/marketing/capabilities";
import {
  ACTION,
  ACTION_BOUNDS,
  ACTION_STATE_MEANING,
  AFTER_CLOSURE,
  APPROVAL,
  APPROVAL_RULES,
  ARIA_ROLE,
  ARIA_STEPS,
  ASSESSMENT,
  ASSESSMENT_NOTES,
  cap,
  CLOSURE,
  CLOSURE_NOTE,
  CONTROL,
  ENGINEERING_LED,
  EVIDENCE,
  EVIDENCE_RULES,
  EVIDENCE_TRAIL,
  FINDING,
  METADATA,
  MODULES,
  moduleTitle,
  OUTCOMES,
  PEOPLE_DECIDE,
  PLAN,
  SAMPLE_CAPABILITY_IDS,
  SAMPLE_CLOUD,
  SAMPLE_DISCLAIMER,
  SAMPLE_LABEL,
  SAMPLE_NOT,
  SAMPLE_PURPOSE,
  SERVICE_PATH,
  VERIFICATION_BOUNDARY,
  VERIFICATION_RULES,
  VERIFICATION_SEQUENCE,
  type Field,
} from "@/lib/marketing/sample-report";
import { servicePageHref, type ServicePageId } from "@/lib/marketing/service-details";
import { serviceCta } from "@/lib/marketing/services";
import { PLATFORM_HREF, SERVICES_HREF } from "@/lib/marketing/site";

// Plan: TRICOGNITA_WEBSITE_REBUILD_PLAN.md Rev B.1 (new route /sample-report);
// Marketing Strategy §18 ("a labelled synthetic sample"). Every value in the
// sample comes from lib/marketing/sample-report.ts, which draws its words from
// the product vocabulary, the claims register and the registry.
export const metadata: Metadata = {
  title: "Sample security closure record",
  description:
    "A synthetic sample report: how one cloud control finding moves from assessment through approved remediation, verification and evidence to a closure record. Fictional data, not a customer report.",
  alternates: { canonical: "/sample-report" },
};

const LINK = "inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline";

/** The synthetic label every record module carries. */
function SampleTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-hair px-2.5 py-0.5 font-mono text-xs font-medium uppercase tracking-wider text-muted">
      {SAMPLE_LABEL}
    </span>
  );
}

/** A neutral label for a product status word that has no StatusChip. */
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-hair px-2.5 py-0.5 text-xs font-medium text-fg">
      {children}
    </span>
  );
}

/** One record module: a dashed "sample" frame with its title and tag. */
function Record({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="rounded-2xl border border-dashed border-hair bg-surface p-5 sm:p-8">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-hair pb-4">
        <span className="text-sm font-semibold text-fg">{title}</span>
        <SampleTag />
      </figcaption>
      <div className="mt-5">{children}</div>
    </figure>
  );
}

function Fields({ fields }: { fields: Field[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-xs uppercase tracking-wider text-muted">{f.label}</dt>
          <dd className={`mt-1 text-fg [overflow-wrap:anywhere] ${f.mono ? "font-mono text-[13px]" : ""}`}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Notes({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="mt-6 rounded-xl border border-hair p-5">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden="true">–</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The status words used in this sample, mapped to the shared chip. */
const CHIP_FOR: Record<string, ChipStatus> = { Failing: "failing", Passing: "passing", Fixed: "fixed" };

function Result({ word }: { word: string }) {
  const chip = CHIP_FOR[word];
  return chip ? <StatusChip status={chip} /> : <Tag>{word}</Tag>;
}

function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`rounded-xl border border-dashed border-hair p-4 text-sm text-fg ${className}`}>
      <span className="font-semibold">{SAMPLE_LABEL}.</span> {SAMPLE_DISCLAIMER}
    </p>
  );
}

export default function SampleReportPage() {
  const lead = cap("cloud-security-assessment");
  const leadCta = serviceCta(lead);
  const capabilities = SAMPLE_CAPABILITY_IDS.map(cap);

  return (
    <>
      {/* 1. Hero and synthetic label */}
      <PageHero
        eyebrow="Sample report"
        title="Sample security closure record"
        sub={SAMPLE_PURPOSE}
        primary={{ href: "#metadata", label: "Read the sample" }}
        secondary={leadCta ?? { href: SERVICES_HREF, label: "See our services" }}
      >
        <section
          id="synthetic-notice"
          aria-labelledby="synthetic-notice-title"
          className="scroll-mt-24 rounded-2xl border-2 border-dashed border-hair bg-surface p-5 sm:p-8"
        >
          <p className="font-mono text-sm font-semibold uppercase tracking-wider text-fg">{SAMPLE_LABEL}</p>
          <h2 id="synthetic-notice-title" className="mt-3 text-lg font-semibold text-fg">
            {moduleTitle("synthetic-notice")}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-fg">{SAMPLE_DISCLAIMER}</p>
          <ul className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
            {SAMPLE_NOT.map((n) => (
              <li key={n} className="flex gap-2">
                <span aria-hidden="true">–</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </section>
      </PageHero>

      {/* Contents */}
      <nav aria-label="Sample report sections" className="border-b border-hair">
        <Container className="py-6">
          <ol className="flex flex-wrap gap-x-5 text-sm">
            {MODULES.filter((m) => m.id !== "synthetic-notice").map((m) => (
              <li key={m.id}>
                <a href={`#${m.id}`} className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
                  {m.title}
                </a>
              </li>
            ))}
          </ol>
        </Container>
      </nav>

      {/* 2. Report metadata */}
      <Section id="metadata" eyebrow="Sample record" title={moduleTitle("metadata")}>
        <Record title="Record details">
          <Fields fields={METADATA} />
        </Record>
        <Disclaimer className="mt-6" />
      </Section>

      {/* 3. Finding summary */}
      <Section id="finding" tone="raised" eyebrow="Sample record · Finding" title={moduleTitle("finding")}>
        <Record title="Finding">
          <p className="text-lg font-semibold text-fg [overflow-wrap:anywhere]">{FINDING.title}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Result word={FINDING.status} />
            <Tag>Severity: {FINDING.severity}</Tag>
            <Tag>Finding: {FINDING.findingStatus}</Tag>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            <span className="text-fg">{CONTROL.name}.</span> {CONTROL.whyItMatters}
          </p>
        </Record>
      </Section>

      {/* 4. Assessment detail */}
      <Section id="assessment" eyebrow="Sample record · Assessment" title={moduleTitle("assessment")}>
        <Record title="Assessment result">
          <Fields fields={ASSESSMENT} />
        </Record>
        <Notes title="How the check is made" items={ASSESSMENT_NOTES} />
      </Section>

      {/* 5. Remediation plan */}
      <Section
        id="remediation-plan"
        tone="raised"
        eyebrow="Sample record · Plan"
        title={moduleTitle("remediation-plan")}
        intro={<p>Finding → remediation decision → approved change → bounded execution → verification.</p>}
      >
        <ol aria-label="Remediation plan steps" className="space-y-3">
          {PLAN.map((s, i) => (
            <li key={s.id} className="rounded-2xl border border-dashed border-hair bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-fg">
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span> {s.title}
                </h3>
                <SampleTag />
              </div>
              <dl className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                <div className="rounded-xl border border-hair p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg">What the engineers do</dt>
                  <dd className="mt-2 leading-relaxed text-muted">{s.people}</dd>
                </div>
                <div className="rounded-xl border border-hair p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg">
                    What {PRODUCT_DISPLAY_NAME} supports
                  </dt>
                  <dd className="mt-2 leading-relaxed text-muted">{s.aria ?? "Nothing. This decision is made by people."}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </Section>

      {/* 6. Approval record */}
      <Section
        id="approval"
        eyebrow="Sample record · Approval"
        title={moduleTitle("approval")}
        intro={<p>Nothing in this sample changed until a named person in the example organisation approved it.</p>}
      >
        <Record title="Approval">
          <Fields fields={APPROVAL} />
        </Record>
        <Notes title="How approval works" items={APPROVAL_RULES} />
      </Section>

      {/* 7. Remediation action */}
      <Section id="remediation-action" tone="raised" eyebrow="Sample record · Fix" title={moduleTitle("remediation-action")}>
        <Record title="Bounded change">
          <Fields fields={ACTION} />
          <p className="mt-5 text-sm text-muted">{ACTION_STATE_MEANING}</p>
        </Record>
        <Notes title="What the change is bounded to" items={ACTION_BOUNDS} />
        <p className="mt-6 rounded-xl border border-hair bg-surface p-5 text-sm leading-relaxed text-fg">{ENGINEERING_LED}</p>
      </Section>

      {/* 8. Verification result */}
      <Section
        id="verification"
        eyebrow="Sample record · Verify"
        title={moduleTitle("verification")}
        intro={<p>{cap("verification").summary} The finding is not closed until the check runs again.</p>}
      >
        <Record title="Verification">
          <ol aria-label="Verification sequence" className="divide-y divide-[var(--hair)]">
            {VERIFICATION_SEQUENCE.map((v) => (
              <li key={v.step} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 text-sm">
                  <span className="font-semibold text-fg">{v.step}:</span> <span className="text-muted">{v.detail}</span>
                  <span className="block text-xs text-muted">{v.time}</span>
                </span>
                <Result word={v.result} />
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-hair pt-5">
            <h3 className="text-sm font-semibold text-fg">Outcome</h3>
            <ul aria-label="Possible outcomes" className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {OUTCOMES.map((o) => (
                <li
                  key={o.label}
                  className={`rounded-xl p-4 text-sm ${o.thisSample ? "border-2 border-hair bg-surface2" : "border border-hair"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-fg">{o.label}</span>
                    {o.thisSample && <Tag>This sample</Tag>}
                  </div>
                  <p className="mt-2 leading-relaxed text-muted">{o.meaning}</p>
                </li>
              ))}
            </ul>
          </div>
        </Record>
        <Notes title="How verification works" items={[...VERIFICATION_RULES, VERIFICATION_BOUNDARY]} />
      </Section>

      {/* 9. Evidence record */}
      <Section id="evidence" tone="raised" eyebrow="Sample record · Evidence" title={moduleTitle("evidence")}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Record title="Evidence record">
            <Fields fields={EVIDENCE} />
          </Record>
          <Record title="Linked records">
            <ol aria-label="Linked records, in order" className="space-y-3">
              {EVIDENCE_TRAIL.map((r, i) => (
                <li key={r.record} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-muted">{i + 1}.</span> <span className="text-fg">{r.record}</span>
                    <span className="block text-xs text-muted">
                      {r.time}
                      {i > 0 ? ` · linked to record ${i}` : ""}
                    </span>
                  </span>
                  <Result word={r.result} />
                </li>
              ))}
            </ol>
          </Record>
        </div>
        <Notes title="How records are kept" items={EVIDENCE_RULES} />
      </Section>

      {/* 10. Closure record */}
      <Section
        id="closure"
        eyebrow="Sample record · Closure"
        title={moduleTitle("closure")}
        intro={<p>{CLOSURE_NOTE}</p>}
      >
        <Record title="Closure">
          <ol aria-label="Closure lifecycle" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CLOSURE.map((c, i) => (
              <li key={c.stage} className="relative rounded-xl border border-hair p-4 text-sm">
                <p className="font-mono text-xs text-muted">
                  {String(i + 1).padStart(2, "0")}
                  {i < CLOSURE.length - 1 && <span aria-hidden="true"> →</span>}
                </p>
                <p className="mt-1 font-semibold text-fg">{c.stage}</p>
                <div className="mt-2">
                  <Result word={c.state} />
                </div>
                <p className="mt-2 text-muted [overflow-wrap:anywhere]">
                  {c.anchor === "closure" ? (
                    c.detail
                  ) : (
                    <a href={`#${c.anchor}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
                      {c.detail}
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hair pt-5 text-sm">
            <span className="min-w-0">
              <span className="font-semibold text-fg">{AFTER_CLOSURE.label}</span>
              <span className="block text-xs text-muted">{AFTER_CLOSURE.time}</span>
            </span>
            <Result word={AFTER_CLOSURE.result} />
          </div>
          <p className="mt-3 text-sm text-muted">{AFTER_CLOSURE.note}</p>
        </Record>
        <Disclaimer className="mt-6" />
      </Section>

      {/* 11. Where ARIA fits, and where our services fit */}
      <Section
        id="aria"
        tone="raised"
        eyebrow={PRODUCT_DISPLAY_NAME}
        title={moduleTitle("aria")}
        intro={
          <>
            <p className="text-fg">
              <span className="font-semibold">{PRODUCT_DISPLAY_NAME}</span> · {PRODUCT_DESCRIPTOR}
            </p>
            {ARIA_ROLE.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </>
        }
      >
        <p className="font-mono text-xs text-muted" aria-label={`${PRODUCT_DISPLAY_NAME} model`}>
          {ARIA_STEPS.map((s) => s.step).join(" → ")}
        </p>
        <ol className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          {ARIA_STEPS.map((s) => (
            <li key={s.step} className="flex flex-col rounded-2xl border border-hair bg-surface p-5 text-sm">
              <h3 className="font-semibold text-fg">{s.step}</h3>
              <p className="mt-1 leading-relaxed text-muted">{s.body}</p>
              <p className="mt-3 flex-1 leading-relaxed text-fg">In this sample: {s.text}</p>
              <a href={`#${s.anchor}`} className={`${LINK} text-sm`}>
                {moduleTitle(s.anchor as (typeof MODULES)[number]["id"])} <span aria-hidden="true">&nbsp;↑</span>
              </a>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">Where these capabilities stand today</h3>
            <p className="mt-2 text-sm text-muted">
              The sample illustrates the workflow. It does not change what is available. Shown on {SAMPLE_CLOUD.name}.
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              {capabilities.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-3">
                  <dt className="min-w-0 text-muted">{c.name}</dt>
                  <dd>
                    <CapabilityBadge capability={c} />
                  </dd>
                </div>
              ))}
            </dl>
            <Link href={PLATFORM_HREF} className={`${LINK} mt-2 text-sm`}>
              How {PRODUCT_DISPLAY_NAME} works <span aria-hidden="true">&nbsp;→</span>
            </Link>
          </div>
          <div id="services" className="scroll-mt-24 rounded-2xl border border-hair bg-surface p-6">
            <h3 className="text-base font-semibold text-fg">Where Tricognita Services fit</h3>
            <p className="mt-2 text-sm text-muted">Our engineers carry the work in this record, in this order.</p>
            <ol className="mt-4 space-y-3 text-sm">
              {SERVICE_PATH.map((p, i) => {
                const s = cap(p.serviceId);
                return (
                  <li key={p.stage} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <span className="min-w-0">
                      <span className="font-mono text-xs text-muted">{i + 1}.</span>{" "}
                      <span className="font-semibold text-fg">{p.stage}</span>
                      {i < SERVICE_PATH.length - 1 && (
                        <span aria-hidden="true" className="text-muted">
                          {" "}
                          →
                        </span>
                      )}
                      <span className="block text-muted">{p.note}</span>
                      <Link href={servicePageHref(p.serviceId as ServicePageId)} className={LINK}>
                        {s.name} <span aria-hidden="true">&nbsp;→</span>
                      </Link>
                    </span>
                    <CapabilityBadge capability={s} />
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </Section>

      {/* 12. Human decision boundary */}
      <Section
        id="human-boundary"
        eyebrow="People decide"
        title={moduleTitle("human-boundary")}
        intro={
          <p>
            {PRODUCT_DISPLAY_NAME} acts only on a change a named person has approved, and only within the bounds shown above.
            These decisions stay with people, always.
          </p>
        }
      >
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {PEOPLE_DECIDE.map((d) => (
            <li key={d} className="flex gap-3 rounded-xl border border-hair bg-surface p-4 text-sm leading-relaxed text-muted">
              <span aria-hidden="true" className="mt-0.5 text-accent">
                ◆
              </span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 13. CTA */}
      <CtaBand
        title={`Start with a ${lead.name}.`}
        body="Tell us about your cloud and what you need to fix or prove. You receive a written scope before any work starts."
        primary={leadCta ?? { href: SERVICES_HREF, label: "See our services" }}
        secondary={{ href: PLATFORM_HREF, label: `See ${PRODUCT_DISPLAY_NAME}` }}
      />
    </>
  );
}
