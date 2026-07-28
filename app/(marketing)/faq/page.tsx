import Link from "next/link";

export const metadata = {
  title: "Procurement & Compliance FAQ — Tricognita",
  description:
    "The questions enterprise procurement, vendor risk, and compliance reviewers ask before signing — answered directly and honestly.",
};

// Published subset of the internal Procurement & Compliance FAQ. Customer-safe,
// self-serve answers; sensitive items (funding, source review, pen-test results)
// are handled under NDA via the trust package. Kept identical in wording to the
// internal doc so a reviewer sees no inconsistency across channels.
const GROUPS: Array<{ heading: string; qas: Array<{ q: string; a: string }> }> = [
  {
    heading: "Company & product",
    qas: [
      {
        q: "What does Tricognita do?",
        a: "Multi-tenant cloud security posture management (CSPM) with AI-assisted remediation across AWS, Azure, and GCP: asset inventory, security findings, compliance scoring, attack-path analysis, and an autonomous-but-supervised remediation engine (ARIA) for known-good fixes. AI is never on the pass/fail verdict path.",
      },
      {
        q: "Where do you run?",
        a: "Application / BFF on Vercel; Go API on Fly.io (region configurable, Asia-Pacific default); Neon Postgres; Upstash Redis. Your raw cloud resources stay in your own account — the control plane reads them in place and does not warehouse your customer data. The posture findings and tamper-evident audit chain the platform produces are stored in the control plane (Neon Postgres) in your selected region.",
      },
      {
        q: "How do our cloud credentials reach you?",
        a: "You grant cross-account access to a Tricognita role, assumed via AWS STS with a mandatory per-tenant ExternalId. The platform never receives or stores long-lived customer cloud credentials. Azure and GCP use the equivalent federated Service-Principal / Workload-Identity pattern.",
      },
    ],
  },
  {
    heading: "Compliance status (stated honestly)",
    qas: [
      {
        q: "Do you have SOC 2?",
        a: "Type II is in progress with an external auditor; the completion timeline is shared under NDA. Type I evidence is available on request.",
      },
      {
        q: "ISO 27001 / HIPAA / PCI / FedRAMP?",
        a: "ISO 27001: not yet certified; many underlying controls are documented. HIPAA / PCI: not in scope — the platform does not process PHI or cardholder data. FedRAMP: not currently planned. We will not claim a certification we do not hold.",
      },
      {
        q: "Encryption?",
        a: "At rest: AES-256 across Postgres, Redis, and S3 archives; customer cloud credentials are KMS envelope-encrypted at the application layer. In transit: TLS 1.2+ everywhere with HSTS preload. Customer-managed KMS (BYOK) is on the roadmap, not today.",
      },
    ],
  },
  {
    heading: "Security & access",
    qas: [
      {
        q: "Who has access to customer data inside Tricognita?",
        a: "Production access is restricted and audit-logged; support access is read-only through an internal admin tier with time-limited, audit-logged impersonation — no silent impersonation. Sub-processors do not receive plaintext customer data.",
      },
      {
        q: "Tenant isolation?",
        a: "Every customer-data row carries a tenant id that is part of the signed session, the JIT token minted for upstream calls, and every database query. Cross-tenant requests are rejected, not merely hidden. Details on the Architecture and Trust pages.",
      },
      {
        q: "Auditability?",
        a: "Every state-changing action is recorded in an append-only, SHA-256 hash-linked audit log. Tampering with a row breaks every downstream hash. Customers can export their full audit trail at any time.",
      },
    ],
  },
  {
    heading: "Operations & exit",
    qas: [
      {
        q: "Support and incident response?",
        a: "Founding-team support during business hours (IST). Customer-reported incidents are acknowledged the same business day, with status updates until resolution and a post-incident report afterward. A formal 24/7 SLA is on the roadmap — see the Status page for current commitments.",
      },
      {
        q: "RTO / RPO and backups?",
        a: "Vercel rollback under ~1 minute; Fly rollback under ~2 minutes; Neon point-in-time recovery within plan retention with continuous replication (~seconds RPO). S3 archives are versioned; audit logs are never deleted from production.",
      },
      {
        q: "What happens to our data when we leave?",
        a: "Cancellation triggers a 30-day grace period. On end-of-grace, customer-data rows are deleted from all tables and Redis keys are purged by tenant pattern. Audit logs are retained for the regulatory window in the agreement (typically 7 years). A deletion certificate is provided on request.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-20">
      <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-2">Procurement &amp; Compliance</p>
      <h1 className="text-4xl font-bold text-zinc-50 mb-4">Procurement &amp; Compliance FAQ</h1>
      <p className="text-zinc-400 max-w-2xl mb-4">
        The questions enterprise procurement, vendor-risk, and compliance reviewers ask before
        signing — answered directly. The answers here are identical to those in our security
        review pack and on a call; consistency across channels is the point.
      </p>
      <p className="text-zinc-500 text-sm mb-12">
        For a security questionnaire (SIG / CAIQ / VSA), the DPA, or source/architecture review under NDA,{" "}
        <Link href="/contact" className="text-violet-400 hover:underline">contact us</Link> or email{" "}
        <span className="text-zinc-300">security@tricognita.com</span>.
      </p>

      {GROUPS.map((g) => (
        <div key={g.heading} className="mb-12 border-t border-zinc-800 pt-8">
          <h2 className="text-2xl font-semibold text-white mb-6">{g.heading}</h2>
          <div className="space-y-6">
            {g.qas.map((qa) => (
              <div key={qa.q}>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">{qa.q}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{qa.a}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-zinc-800 pt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link href="/trust" className="text-cyan-400 hover:underline">Trust Center →</Link>
        <Link href="/architecture" className="text-cyan-400 hover:underline">Architecture →</Link>
        <Link href="/security" className="text-cyan-400 hover:underline">Security →</Link>
        <Link href="/status" className="text-cyan-400 hover:underline">Status &amp; SLA →</Link>
        <Link href="/dpa" className="text-cyan-400 hover:underline">DPA →</Link>
      </div>
    </section>
  );
}
