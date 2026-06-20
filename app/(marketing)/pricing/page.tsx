"use client";
import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    tag: "OBSERVE", name: "Observe", subtitle: "Audit Mode",
    price: { monthly: "Free → ₹15,000", annual: "Free → ₹12,500" },
    freeNote: "14-day free read-only audit, then ₹15,000/mo",
    highlight: false, badge: "Start Here", badgeColor: "text-zinc-400 border-zinc-700",
    accentTop: "from-zinc-600/40 to-zinc-800/20", accentText: "text-zinc-400",
    features: [
      { t: "14-day read-only audit", bold: true },
      { t: "No writes, no risk", bold: true },
      { t: "Full findings report", bold: true },
      { t: "First findings delivered within 24 hours", bold: false },
    ],
    cta: "Start Free Audit", ctaStyle: "border border-zinc-700 text-zinc-200 hover:border-zinc-500", link: "/contact",
  },
  {
    tag: "GROWTH", name: "Remediate", subtitle: "Controlled Execution",
    price: { monthly: "₹45,000", annual: "₹37,500" },
    freeNote: null, founding: true,
    highlight: true, badge: "Founding Rate (Limited)", badgeColor: "text-violet-300 border-violet-700",
    accentTop: "from-violet-500/60 to-cyan-600/30", accentText: "text-violet-400",
    features: [
      { t: "Everything in Observe", bold: false },
      { t: "Up to 8 cloud accounts", bold: false },
      { t: "ARIA autonomous remediation (JIT mode)", bold: true },
      { t: "Policy-bound execution · blast radius controls", bold: true },
      { t: "Rollback available on every action", bold: true },
      { t: "SOC 2 · ISO 27001 · CERT-In evidence packs (in progress; CIS AWS shipping today)", bold: false },
      { t: "Attack path graph visualization", bold: false },
      { t: "Slack + webhook alert routing", bold: false },
      { t: "Priority support (IST hours)", bold: false },
    ],
    cta: "Apply for Founding Access", ctaStyle: "bg-violet-600 text-white hover:bg-violet-500", link: "#founding",
  },
  {
    tag: "ADVANCED", name: "Autonomous", subtitle: "Full Control",
    price: { monthly: "₹95,000", annual: "₹79,000" },
    freeNote: null,
    highlight: false, badge: "Full Control", badgeColor: "text-cyan-400 border-cyan-800",
    accentTop: "from-cyan-500/50 to-emerald-600/20", accentText: "text-cyan-400",
    features: [
      { t: "Everything in Remediate", bold: false },
      { t: "Unlimited cloud accounts", bold: false },
      { t: "Auto-remediation mode (policy-bound)", bold: true },
      { t: "Multi-account AWS Organizations", bold: false },
      { t: "FinOps + Security unified controls", bold: false },
      { t: "IaC drift detection (Terraform/CDK)", bold: false },
      { t: "Kubernetes audit (EKS/AKS/GKE)", bold: false },
      { t: "Dedicated Slack + named engineer", bold: false },
      { t: "Immutable audit logs · SHA-256 signed", bold: true },
    ],
    cta: "Talk to a Security Architect", ctaStyle: "border border-zinc-700 text-zinc-200 hover:border-cyan-600/60", link: "/contact",
  },
];

function FoundingModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ company: "", provider: "AWS", size: "", email: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded border border-violet-800/50 bg-[#05070A] p-8 shadow-[0_0_60px_rgba(124,58,237,0.15)]" onClick={e => e.stopPropagation()}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent rounded-t" />
        {submitted ? (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center mx-auto mb-4">
              <span className="text-emerald-400 text-lg font-bold">✓</span>
            </div>
            <p className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest mb-2">APPLICATION RECEIVED</p>
            <p className="text-white font-bold mb-2">We'll be in touch within 24 hours.</p>
            <p className="text-xs text-zinc-500">Our founding team reviews each application personally.</p>
            <button onClick={onClose} className="mt-6 text-xs text-zinc-600 hover:text-zinc-400 font-mono">[ CLOSE ]</button>
          </div>
        ) : (
          <>
            <p className="font-mono text-[10px] text-violet-400 uppercase tracking-widest mb-1">[ FOUNDING ACCESS ]</p>
            <h2 className="text-lg font-bold text-white mb-1">Apply for Founding Security Program</h2>
            <p className="text-xs text-zinc-500 mb-6">Limited to 5 teams. Enrollment closes after initial cohort is filled.</p>
            
            {error && <div className="mb-4 p-2 bg-red-950/40 border border-red-800/50 text-red-400 text-xs rounded">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Company Name</label>
                <input required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white font-mono placeholder-zinc-700 focus:outline-none focus:border-violet-700 transition-colors"
                  placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Work Email</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white font-mono placeholder-zinc-700 focus:outline-none focus:border-violet-700 transition-colors"
                  placeholder="founder@acmecorp.com" />
              </div>
              <div>
                <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Primary Cloud Provider</label>
                <select required value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-700 transition-colors">
                  <option>AWS</option>
                  <option>Cloudflare</option>
                  <option>GCP</option>
                  <option>Azure</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5">Team Size</label>
                <select required value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-violet-700 transition-colors">
                  <option value="">Select…</option>
                  <option>1–10</option>
                  <option>11–50</option>
                  <option>51–200</option>
                  <option>200+</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 py-3 bg-violet-600 text-white font-bold rounded text-sm hover:bg-violet-500 transition-colors disabled:opacity-50">
                  {loading ? "Submitting..." : "Apply for Founding Access"}
                </button>
                <button type="button" onClick={onClose} className="px-4 py-3 border border-zinc-800 text-zinc-500 rounded text-sm hover:border-zinc-700 transition-colors font-mono text-xs">
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-zinc-700 font-mono text-center">Pricing locked at founding rate for 12 months</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [region, setRegion] = useState<"IN" | "AE">("IN");
  const [showModal, setShowModal] = useState(false);

  function handlePlanCta(link: string) {
    if (link === "#founding") { setShowModal(true); return; }
  }

  return (
    <div className="relative bg-[#05070A] text-zinc-100 overflow-hidden">
      {showModal && <FoundingModal onClose={() => setShowModal(false)} />}

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ background: "radial-gradient(ellipse 800px 500px at 70% 0%, rgba(124,58,237,0.07), transparent 60%)" }} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, #a1a1aa 1px, transparent 1px)", backgroundSize: "28px 28px" }} />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-12 text-center">
        <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        <div className="max-w-3xl mx-auto px-6">
          <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-4">PRICING</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            Priced on infrastructure risk,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">not seat count.</span>
          </h1>
          <p className="text-zinc-500 text-sm mb-6 max-w-xl mx-auto">Built for fast-scaling cloud teams without dedicated security engineers.</p>

          {/* Region + Billing toggles */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex border border-zinc-800 bg-zinc-950 rounded overflow-hidden font-mono text-xs">
              {(["IN", "AE"] as const).map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={`px-5 py-2.5 transition-all ${region === r ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
                  {r === "IN" ? "🇮🇳 India" : "🇦🇪 UAE"}
                </button>
              ))}
            </div>
            {region === "IN" && (
              <div className="inline-flex border border-zinc-800 bg-zinc-950 rounded overflow-hidden font-mono text-xs">
                <button onClick={() => setAnnual(false)} className={`px-4 py-2.5 transition-all ${!annual ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400"}`}>MONTHLY</button>
                <button onClick={() => setAnnual(true)}  className={`px-4 py-2.5 transition-all ${annual  ? "bg-violet-700 text-white" : "text-zinc-600 hover:text-zinc-400"}`}>ANNUAL <span className="text-emerald-400 ml-1">−17%</span></button>
              </div>
            )}
          </div>
        </div>
      </section>

      {region === "IN" ? (
        <>
          {/* ── Founding Program ── */}
          <div className="max-w-7xl mx-auto px-6 mb-8">
            <div className="relative rounded border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
              <div className="p-7 flex flex-col md:flex-row md:items-start gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[10px] font-bold text-violet-400 border border-violet-800/60 px-2 py-1 rounded">[ FOUNDING ACCESS ]</span>
                    <span className="font-mono text-[10px] text-zinc-600">5 teams · limited</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mb-1">Founding Security Program</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">We're onboarding a limited number of teams to deploy Tricognita in real production environments. Founding teams work directly with the engineering team and shape the product roadmap.</p>
                </div>
                <div className="flex flex-col gap-4 md:items-end">
                  <ul className="space-y-1.5">
                    {["Full platform access","Direct support from founding team","Priority feature influence","Preferential pricing locked for 12 months"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-violet-700/60 text-violet-300 font-semibold rounded text-sm hover:bg-violet-950/40 transition-all">
                    Apply for Founding Access <span className="text-violet-600">→</span>
                  </button>
                  <p className="font-mono text-[10px] text-zinc-700">Enrollment closes after initial cohort is filled.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── India Plans ── */}
          <section className="max-w-7xl mx-auto px-6 pb-16">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">India Deployment</span>
              <span className="px-2 py-1 rounded border border-zinc-800 text-[10px] font-mono text-zinc-600">INR · GST applicable</span>
            </div>
            <p className="font-mono text-[10px] text-zinc-600 mb-7">Observe Mode is always free for 14 days. No credit card required.</p>
            <div className="grid md:grid-cols-3 gap-5">
              {PLANS.map((plan) => (
                <div key={plan.name} className={`relative flex flex-col rounded border overflow-hidden ${plan.highlight ? "border-violet-700/50 shadow-[0_0_40px_rgba(124,58,237,0.08)]" : "border-zinc-800"} bg-zinc-950`}>
                  <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${plan.accentTop}`} />
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className={`font-mono text-[10px] font-bold uppercase tracking-widest ${plan.accentText}`}>[{plan.tag}]</p>
                        <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                        <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{plan.subtitle}</p>
                        {(plan as any).founding && (
                          <span className="mt-1.5 inline-block font-mono text-[9px] font-bold text-violet-400 border border-violet-800/50 px-2 py-0.5 rounded">[ FOUNDING ACCESS ]</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono border px-2 py-1 rounded flex-shrink-0 ${plan.badgeColor}`}>{plan.badge}</span>
                    </div>

                    <div className="mt-4 mb-5 pb-5 border-b border-zinc-900">
                      {plan.freeNote ? (
                        <>
                          <p className="font-mono text-xs font-bold text-emerald-400 mb-1">FREE for 14 days</p>
                          <p className="text-[11px] text-zinc-500 font-mono">then ₹15,000/month</p>
                          <p className="text-[10px] text-zinc-700 font-mono mt-1">Read-only. No writes. No risk.</p>
                        </>
                      ) : (
                        <>
                          <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold font-mono text-white">{annual ? plan.price.annual : plan.price.monthly}</span>
                            <span className="text-zinc-600 text-xs font-mono mb-1">/month</span>
                          </div>
                          {annual && <p className="text-[10px] text-emerald-400/70 font-mono mt-0.5">billed annually</p>}
                        </>
                      )}
                    </div>

                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map((f) => (
                        <li key={f.t} className="flex items-start gap-2.5">
                          <span className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${f.bold ? "bg-emerald-500" : "bg-zinc-700"}`} />
                          <span className={`text-xs leading-snug ${f.bold ? "text-zinc-200 font-medium" : "text-zinc-500"}`}>{f.t}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.link === "#founding" ? (
                      <button onClick={() => setShowModal(true)}
                        className={`mt-6 w-full py-3 rounded text-sm font-semibold transition-all ${plan.ctaStyle}`}>
                        {plan.cta}
                      </button>
                    ) : (
                      <Link href={plan.link} className={`mt-6 block text-center py-3 rounded text-sm font-semibold transition-all ${plan.ctaStyle}`}>
                        {plan.cta}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        /* ── UAE View ── */
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">UAE & Gulf Deployment</span>
            <span className="px-2 py-1 rounded border border-amber-800/40 text-[10px] font-mono text-amber-600">SOVEREIGN INFRASTRUCTURE</span>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded border border-amber-900/30 bg-zinc-950 p-8 relative overflow-hidden">
              <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
              <p className="font-mono text-[10px] text-amber-500 uppercase tracking-widest mb-4">[ENTERPRISE · REGULATED]</p>
              <h2 className="text-2xl font-bold text-white mb-2">Custom deployment for regulated and sovereign environments.</h2>
              <p className="font-mono text-[10px] text-amber-600/80 mb-4">Pricing aligned to infrastructure scale and risk exposure.</p>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">UAE and Gulf deployments operate under distinct data sovereignty requirements. Pricing reflects the deployment architecture, compliance scope, and in-country processing requirements — not seat count.</p>
              {[
                { tag: "DATA",       text: "All telemetry processed within UAE region. Zero cross-border transfer." },
                { tag: "COMPLIANCE", text: "NESA IA · DIFC Data Protection · Central Bank UAE aligned." },
                { tag: "DEPLOYMENT", text: "Dedicated onboarding with a certified security architect." },
                { tag: "SUPPORT",    text: "Gulf-timezone support. Arabic available on request." },
              ].map(r => (
                <div key={r.tag} className="flex items-start gap-3 text-xs mb-3">
                  <span className="font-mono text-amber-600 font-bold flex-shrink-0 w-24">[{r.tag}]</span>
                  <span className="text-zinc-400 leading-snug">{r.text}</span>
                </div>
              ))}
              <Link href="/contact" className="mt-4 inline-flex items-center px-6 py-3 bg-amber-600 text-white font-bold rounded text-sm hover:bg-amber-500 transition-colors">
                Contact for Deployment
              </Link>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950 p-8">
              <div className="mb-5 border-b border-zinc-900 pb-4">
                <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Every UAE deployment includes</p>
                <p className="text-[11px] text-rose-400 font-mono">Limited onboarding slots for UAE deployments.</p>
              </div>
              <ul className="space-y-3">
                {[
                  { t: "In-country data processing (me-central-1 or customer VPC)", b: true },
                  { t: "Dedicated security architect onboarding (2-week)", b: true },
                  { t: "Observe Mode audit (14 days, read-only) before any execution", b: true },
                  { t: "Custom policy definition with your security team", b: false },
                  { t: "NESA IA compliance evidence pack", b: false },
                  { t: "Immutable audit trail with cryptographic signing", b: false },
                  { t: "Human JIT approval required for all production changes", b: false },
                  { t: "Monthly posture report delivered to CISO", b: false },
                ].map(f => (
                  <li key={f.t} className="flex items-start gap-2.5">
                    <span className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${f.b ? "bg-amber-500" : "bg-zinc-700"}`} />
                    <span className={`text-xs leading-snug ${f.b ? "text-zinc-200 font-medium" : "text-zinc-500"}`}>{f.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <div className="border-t border-zinc-900" />

      {/* ── Bottom CTA ── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-3">GTM ENTRY POINT</p>
        <p className="font-mono text-xs text-rose-500/70 mb-4">One exposed key is enough to compromise your entire infrastructure.</p>
        <h2 className="text-3xl font-bold text-white mb-3">Start with a free 14-day read-only audit.</h2>
        <p className="font-mono text-xs text-emerald-400 mb-8">No agents · No code changes · No credit card · Revoke access any time</p>
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <Link href="/contact" className="px-8 py-4 bg-violet-600 text-white font-bold rounded text-sm hover:bg-violet-500 transition-colors">
            Start Free Audit
          </Link>
          <button onClick={() => setShowModal(true)} className="px-8 py-4 border border-zinc-700 text-zinc-300 font-bold rounded text-sm hover:border-zinc-500 transition-colors">
            Apply for Founding Access
          </button>
        </div>
        <div className="text-center mb-10">
          <p className="text-zinc-300 text-sm mb-1">
            Connect your cloud → We scan → You receive a full report in 24h
          </p>
          <p className="text-zinc-500 text-xs font-mono">
            No writes. No risk. No commitment.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-[10px] font-mono text-zinc-700">
          <span>● POLICY-BOUND EXECUTION</span>
          <span>● ROLLBACK SAFE</span>
          <span>● IMMUTABLE AUDIT TRAIL</span>
          <span>● TENANT-ISOLATED</span>
        </div>
      </section>
    </div>
  );
}
