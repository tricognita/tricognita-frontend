import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Database,
  Eye,
  GitBranch,
  Lock,
  Network,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Architecture & Trust — Tricognita",
  description:
    "Security architecture, tenant isolation model, auditability guarantees, and operational commitments. Reference for enterprise procurement and technical due diligence.",
};

const TRUST_PILLARS = [
  {
    icon: Lock,
    title: "Tenant isolation by architecture",
    body: "Every request carries a tenant id in the JIT token claim, mintable only from a verified session — never from request body or headers. The browser cache is flushed at every auth-boundary crossing. Notifications are keyed per-tenant. Cross-tenant data exposure requires defeating four independent layers.",
  },
  {
    icon: Eye,
    title: "Read-only by default",
    body: "Every cloud action begins as a read-only operation. Destructive remediations require OPERATOR-tier JIT tokens AND typed-phrase confirmation in the UI. AUTONOMOUS healing is opt-in per tenant. No write happens silently.",
  },
  {
    icon: ShieldCheck,
    title: "Hash-linked audit chain",
    body: "Every operator decision and ARIA action is written to a hash-linked audit_logs table. Tampering with a row breaks every downstream hash. The trail is the SOC 2 / ISO 27001 evidence pack — produced continuously, not assembled annually.",
  },
  {
    icon: Network,
    title: "Sovereign data residency",
    body: "Scan results live in your AWS account. ARIA telemetry is processed in your selected region. The control plane authenticates and orchestrates — it does not warehouse your customer data.",
  },
];

const OPERATIONAL_GUARANTEES = [
  { label: "Session TTL", value: "15 min access + 7-day refresh" },
  { label: "Refresh rotation", value: "Atomic delete-then-issue with replay detection" },
  { label: "JIT tokens", value: "HMAC-SHA256, tier-mapped from session role" },
  { label: "Healing default", value: "OPERATOR approval required" },
  { label: "Data residency", value: "Customer AWS account" },
  { label: "Audit retention", value: "Indefinite (hash-linked)" },
  { label: "TLS / HSTS", value: "HSTS preload, 2-year, includeSubDomains" },
  { label: "CSP", value: "frame-ancestors none, object-src none, no eval" },
];

const TRACEABILITY = [
  {
    icon: Activity,
    title: "Correlation id end-to-end",
    body: "Every request carries a 12-character id minted client-side, propagated through the BFF, into the Go API logs, and back in the response header. A customer-reported incident becomes a one-paste trace across browser → BFF → Go → audit.",
  },
  {
    icon: GitBranch,
    title: "Release pinning",
    body: "Every deploy exposes its version, git SHA, branch, and environment via /api/version. The dashboard surfaces the same in the operations console. An incident ticket pins to an exact deploy with one click.",
  },
  {
    icon: Workflow,
    title: "Structured BFF logs",
    body: "All BFF routes emit single-line JSON: ts, level, request_id, elapsed_ms, route-specific fields. Vercel + Fly logs aggregate the same correlation id so cross-tier debugging is trivial.",
  },
  {
    icon: Database,
    title: "Per-tenant Redis scoping",
    body: "Notifications, quotas, and refresh tokens live in tenant-scoped Redis keys. A platform-tenant ADMIN sees cross-tenant aggregates; everyone else sees only their tenant's keys. Key boundary > in-memory filter.",
  },
];

export default function ArchitecturePage() {
  return (
    <>
      {/* Hero */}
      <div
        className="relative min-h-[40vh] flex flex-col justify-center"
        style={{ background: "var(--ink)" }}
      >
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center">
          <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-4 uppercase">
            Trust & Architecture
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-[var(--stone-50)] tracking-tight leading-tight serif-display">
            Designed for enterprise security review.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base text-[var(--stone-400)] leading-relaxed">
            This page is the canonical answer for procurement teams,
            information-security reviewers, and technical due-diligence:
            how Tricognita protects your data, isolates your tenant, and
            stays operable during incidents.
          </p>
        </section>
      </div>

      {/* Trust pillars */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-3 uppercase">
          Foundational guarantees
        </p>
        <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-8 tracking-tight">
          Four pillars that hold under scrutiny.
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {TRUST_PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-[var(--radius)] border border-[var(--sage-soft)] bg-[var(--moss-rise)] p-6 flex flex-col gap-3"
              >
                <Icon
                  size={22}
                  className="text-[var(--matcha-300)]"
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-[var(--stone-50)] tracking-tight">
                  {p.title}
                </h3>
                <p className="text-sm text-[var(--stone-400)] leading-relaxed">
                  {p.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Operational guarantees table */}
      <section
        className="border-y"
        style={{
          background: "var(--moss)",
          borderColor: "var(--sage-soft)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-14">
          <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-3 uppercase">
            Operational guarantees
          </p>
          <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-2 tracking-tight">
            Verifiable from CloudTrail and the Tricognita audit chain.
          </h2>
          <p className="text-sm text-[var(--stone-400)] mb-8 max-w-2xl leading-relaxed">
            These aren&apos;t promises in a marketing deck — they&apos;re
            enforced by the code that runs in your account. Every guarantee
            here is verifiable from CloudTrail or the Tricognita audit chain.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {OPERATIONAL_GUARANTEES.map((g) => (
              <div
                key={g.label}
                className="rounded-md border border-[var(--sage-soft)] bg-[var(--ink-deep)] px-4 py-3"
              >
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)]">
                  {g.label}
                </p>
                <p className="text-sm text-[var(--stone-100)] font-medium mt-1">
                  {g.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Traceability */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-3 uppercase">
          Traceability
        </p>
        <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-8 tracking-tight">
          When something breaks, you can prove what happened.
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {TRACEABILITY.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="rounded-[var(--radius)] border border-[var(--sage-soft)] bg-[var(--moss-rise)] p-6 flex flex-col gap-3"
              >
                <Icon size={20} className="text-[var(--matcha-300)]" aria-hidden />
                <h3 className="text-sm font-semibold text-[var(--stone-50)] tracking-tight">
                  {t.title}
                </h3>
                <p className="text-xs text-[var(--stone-400)] leading-relaxed">
                  {t.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Diagram (text-based, deliberate) */}
      <section
        className="border-y"
        style={{
          background: "var(--moss)",
          borderColor: "var(--sage-soft)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-14">
          <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-3 uppercase">
            Architecture
          </p>
          <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-6 tracking-tight">
            The control plane.
          </h2>
          <pre className="text-[11px] font-mono leading-relaxed text-[var(--stone-300)] bg-[var(--ink-deep)] border border-[var(--sage-soft)] rounded-md p-5 overflow-x-auto">{`
  Browser  ──HTTPS──▶  Cloudflare  ──▶  Vercel Edge / BFF (Next.js)
                                              │
                                       ┌──────┼──────┐
                                       ▼      ▼      ▼
                                Session  JIT mint  Audit emit
                                       │      │      │
                                       └──────┼──────┘
                                              ▼
                                     Go API (Fly.io, sin region)
                                       │      │      │
                                       ▼      ▼      ▼
                                  Postgres   Bedrock   AWS STS
                                  (Neon)     SageMaker AssumeRole
                                                       │
                                                       ▼
                                            Customer AWS account
                                            (read-only IAM role)
`}</pre>
          <p className="text-xs text-[var(--stone-500)] mt-4 leading-relaxed">
            Customer cloud data never traverses our control plane. ARIA
            performs assume-role into the customer&apos;s account and
            returns posture artifacts, not raw resources. Cross-tenant
            data sharing requires defeating four enforcement layers
            (edge middleware → BFF session → Go JIT tier → AWS STS).
          </p>
        </div>
      </section>

      {/* Documentation links */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-3 uppercase">
          Reviewer references
        </p>
        <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-2 tracking-tight">
          Deeper documents on request.
        </h2>
        <p className="text-sm text-[var(--stone-400)] mb-6 max-w-2xl leading-relaxed">
          We maintain reviewer-facing documentation that walks through
          tenant isolation per-route, the on-call playbook, scalability
          assumptions, and the cache lifecycle. These are shared with
          design partners under NDA on request.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: "Security architecture summary", note: "Auth, RBAC, tenant isolation, audit, observability." },
            { title: "Tenant isolation audit", note: "Every BFF route classified by enforcement mechanism." },
            { title: "Production readiness", note: "Deployment topology, scaling assumptions, runbook." },
            { title: "Scalability audit", note: "Capacity ceilings, bottlenecks, verification methodology." },
          ].map((d) => (
            <div
              key={d.title}
              className="rounded-md border border-[var(--sage-soft)] bg-[var(--moss-rise)] px-4 py-3"
            >
              <p className="text-sm font-semibold text-[var(--stone-100)]">{d.title}</p>
              <p className="text-xs text-[var(--stone-500)] mt-1">{d.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="border-t"
        style={{
          background: "var(--moss)",
          borderColor: "var(--sage-soft)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-14 text-center">
          <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-3 tracking-tight">
            Bring this to your security team.
          </h2>
          <p className="text-sm text-[var(--stone-400)] mb-6 max-w-xl mx-auto leading-relaxed">
            We&apos;ll walk your reviewers through the architecture, share
            the full documentation suite under NDA, and answer questions
            from your internal infosec process.
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 rounded-md text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--matcha-600)" }}
          >
            Schedule a technical review
          </Link>
        </div>
      </section>
    </>
  );
}
