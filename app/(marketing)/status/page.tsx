export const metadata = { title: "Status & Service Commitments — Tricognita" };

type Tone = "ok" | "target" | "info";

const TONE: Record<Tone, string> = {
  ok:     "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  target: "bg-cyan-500/10 text-cyan-400 ring-cyan-500/30",
  info:   "bg-amber-500/10 text-amber-400 ring-amber-500/30",
};

// Founding-cohort service commitments. These are targets and operating
// practices, not yet a signed uptime SLA — enterprise agreements carry the
// contractual SLA. Kept deliberately honest to match /security and /trust.
const COMMITMENTS: Array<{ title: string; badge: string; tone: Tone; body: string }> = [
  {
    title: "Availability target",
    badge: "99.5% / mo",
    tone: "target",
    body: "Founding-cohort availability target for the control plane. This is a target and operating practice; a contractual uptime SLA is part of enterprise agreements, not this page.",
  },
  {
    title: "Support hours",
    badge: "IST business hours",
    tone: "info",
    body: "Founding-team triage during business hours (IST). A formal 24/7 support SLA is on the roadmap and will replace this line when it ships — we will not claim it before it is real.",
  },
  {
    title: "Incident response",
    badge: "Same business day",
    tone: "ok",
    body: "Critical-path incidents are acknowledged the same business day. Affected customers are notified directly by email; material incidents are also posted here.",
  },
  {
    title: "Data-plane isolation during incidents",
    badge: "Enforced",
    tone: "ok",
    body: "Your cloud data stays in your own account; the control plane orchestrates without warehousing it. A Tricognita control-plane incident does not expose your customer data.",
  },
];

// Real, verifiable dependency transparency — the sub-processors named in the DPA,
// each with a public status page a customer can check independently.
const DEPENDENCIES: Array<{ name: string; role: string; status: string }> = [
  { name: "Vercel",  role: "Application / BFF hosting", status: "https://www.vercel-status.com" },
  { name: "Fly.io",  role: "API compute",              status: "https://status.flyio.net" },
  { name: "Neon",    role: "Managed Postgres",         status: "https://neonstatus.com" },
  { name: "Upstash", role: "Managed Redis",            status: "https://status.upstash.com" },
];

export default function StatusPage() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20">
      <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-2">Status &amp; Service Commitments</p>
      <h1 className="text-4xl font-bold text-zinc-50 mb-4">Operational status and what we commit to</h1>
      <p className="text-zinc-400 max-w-2xl mb-6">
        Tricognita is in its founding-cohort phase. This page states our current service
        commitments honestly — the targets we hold ourselves to today and the ones still
        on the roadmap — plus the independently verifiable status of every dependency we run on.
      </p>
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/30 mb-12">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Control plane: Operational
      </div>

      <h2 className="text-lg font-semibold text-zinc-100 mb-4">Service commitments</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
        {COMMITMENTS.map((c) => (
          <div key={c.title} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-100">{c.title}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ring-1 ${TONE[c.tone]}`}>{c.badge}</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">{c.body}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-zinc-100 mb-4">Dependency status</h2>
      <p className="text-zinc-500 text-sm mb-4 max-w-2xl">
        Our control-plane sub-processors (as named in the DPA). Each publishes an
        independent status page you can check directly.
      </p>
      <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
        {DEPENDENCIES.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-4 bg-zinc-900/40 px-5 py-3">
            <div>
              <span className="text-sm font-semibold text-zinc-100">{d.name}</span>
              <span className="text-xs text-zinc-500 ml-2">{d.role}</span>
            </div>
            <a href={d.status} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline">
              status ↗
            </a>
          </div>
        ))}
      </div>

      <p className="mt-10 text-xs text-zinc-600">
        Report an issue or request the current uptime record from your account team, or email{" "}
        <span className="text-zinc-400">security@tricognita.com</span> for security-affecting incidents.
      </p>
    </section>
  );
}
