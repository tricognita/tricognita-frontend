export const metadata = { title: "Security — Tricognita" };

type Status = "Live" | "In Progress" | "Aligned" | "Compliant";

const STATUS_STYLE: Record<Status, string> = {
  Live:          "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  Compliant:     "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  Aligned:       "bg-cyan-500/10 text-cyan-400 ring-cyan-500/30",
  "In Progress": "bg-amber-500/10 text-amber-400 ring-amber-500/30",
};

const CONTROLS: Array<{ title: string; status: Status; body: string }> = [
  {
    title:  "SOC 2",
    status: "In Progress",
    body:   "Targeting SOC 2 Type II attestation. Control monitoring (access reviews, change management, incident response) is in place today; auditor engagement is scheduled. Trust package available on request.",
  },
  {
    title:  "ISO 27001",
    status: "Aligned",
    body:   "Information security management aligned to Annex A controls and our risk treatment plan. Formal certification is on the roadmap.",
  },
  {
    title:  "GDPR / DPDP",
    status: "Compliant",
    body:   "Lawful processing, data subject rights, and DPA available for EU and Indian deployments. Data is processed in the customer's selected region.",
  },
  {
    title:  "Encryption",
    status: "Live",
    body:   "TLS 1.3 in transit, AES-256 at rest. Customer-managed KMS keys supported for sovereign deployments.",
  },
  {
    title:  "Access controls",
    status: "Live",
    body:   "Just-in-time access for sensitive operations, hardware-backed MFA for operators, and tenant isolation enforced at the API layer (cross-tenant requests are rejected, not just hidden).",
  },
  {
    title:  "Secure SDLC",
    status: "Live",
    body:   "SAST, dependency scanning, container scanning, signed artifacts, and reproducible builds run on every change.",
  },
  {
    title:  "Audit & immutability",
    status: "Live",
    body:   "Every ARIA action — proposal, approval, execution, rollback — is recorded with a SHA-256 hash chain. Logs are write-only from the application's perspective.",
  },
  {
    title:  "Incident response",
    status: "Live",
    body:   "Founding-team triage during business hours (IST). Critical-path incidents are acknowledged the same business day. A formal 24/7 SLA is on the roadmap and will replace this line when it ships.",
  },
];

export default function SecurityPage() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-2">Trust &amp; Security</p>
      <h1 className="text-4xl font-bold text-zinc-50 mb-4">Security at Tricognita</h1>
      <p className="text-zinc-400 max-w-2xl mb-12">
        Our platform is engineered for regulated workloads. The controls below summarize how we
        protect the ARIA control plane and your tenant data — and where we are honest about work
        that is still in progress.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CONTROLS.map((c) => (
          <div key={c.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-zinc-100">{c.title}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${STATUS_STYLE[c.status]}`}>
                {c.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-xs text-zinc-600">
        Request our trust package (control matrix, latest pen-test summary, DPA) via your account team.
      </p>
    </section>
  );
}
