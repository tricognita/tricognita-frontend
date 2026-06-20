"use client";

import Link from "next/link";

// Services with client pain points — the "slight anger" hook
const SERVICES = [
  {
    category: "Cloud Hardening & Governance",
    hook: "Your IAM is a liability you haven't found yet.",
    accent: "from-violet-500 to-purple-600",
    glow: "rgba(139,92,246,0.12)",
    borderHover: "hover:border-violet-500/40",
    accentText: "text-violet-400",
    items: [
      "AWS Well-Architected Security Review",
      "IAM Least-Privilege & Access Hardening",
      "VPC & Network Security Architecture",
      "Security Monitoring Stack Deployment",
      "Automated Vulnerability Scanning",
    ],
    stat: { val: "68%", label: "of breaches start with over-privileged IAM" },
  },
  {
    category: "Offensive Security — Red Team",
    hook: "If we can breach you, so can they.",
    accent: "from-rose-500 to-red-600",
    glow: "rgba(244,63,94,0.12)",
    borderHover: "hover:border-rose-500/40",
    accentText: "text-rose-400",
    items: [
      "Multi-Cloud Adversary Emulation",
      "Internal & External Web App Pentesting",
      "Cloud Infrastructure Breach Simulation",
      "Red Team Operations & Target Recon",
    ],
    stat: { val: "< 2h", label: "avg time to first critical finding in new environments" },
  },
  {
    category: "DevSecOps & Supply Chain",
    hook: "Your pipeline ships code. And vulnerabilities.",
    accent: "from-cyan-500 to-blue-600",
    glow: "rgba(6,182,212,0.12)",
    borderHover: "hover:border-cyan-500/40",
    accentText: "text-cyan-400",
    items: [
      "CI/CD Pipeline Security & Automation",
      "SBOM (Software Bill of Materials) Management",
      "Secure Software Supply Chain Audits",
      "IaC (Infrastructure as Code) Drift Detection",
    ],
    stat: { val: "91%", label: "of companies ship undetected secrets in their pipelines" },
  },
  {
    category: "Advanced Infrastructure",
    hook: "Kubernetes is powerful. And dangerously misconfigured.",
    accent: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.12)",
    borderHover: "hover:border-emerald-500/40",
    accentText: "text-emerald-400",
    items: [
      "Kubernetes (EKS/AKS/GKE) Hardening",
      "Generative AI & LLM Security Audits",
      "Edge, IoT & Greengrass Security",
      "Post-Quantum Cryptography Assessment",
    ],
    stat: { val: "60%", label: "of K8s clusters have at least one critical exposure" },
  },
  {
    category: "Managed Defense — MDR/IR",
    hook: "Alerts at 2am don't wake up your SOC fast enough.",
    accent: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.12)",
    borderHover: "hover:border-amber-500/40",
    accentText: "text-amber-400",
    items: [
      "24/7 Managed Detection & Response",
      "Incident Response & Forensic Recovery",
      "Ransomware Resilience-as-a-Service",
      "Zero Trust Architecture Implementation",
    ],
    stat: { val: "14 days", label: "avg dwell time before breach detection — industry average" },
  },
  {
    category: "Compliance & FinOps",
    hook: "Compliance-as-a-checkbox is how audits become nightmares.",
    accent: "from-indigo-500 to-violet-600",
    glow: "rgba(99,102,241,0.12)",
    borderHover: "hover:border-indigo-500/40",
    accentText: "text-indigo-400",
    items: [
      "Compliance-as-a-Service (SOC2 / PCI-DSS)",
      "Multi-Cloud FinOps & Governance",
      "Security ROI & Cost Optimization",
      "Cyber-Resilience Strategy Consulting",
    ],
    stat: { val: "$4.2M", label: "avg cost of a data breach — IBM 2024" },
  },
  {
    category: "Elite Cloud Engineering",
    hook: "Secure-by-design isn't a feature. It's the foundation.",
    accent: "from-pink-500 to-rose-600",
    glow: "rgba(236,72,153,0.12)",
    borderHover: "hover:border-pink-500/40",
    accentText: "text-pink-400",
    items: [
      "Secure Fullstack App Development",
      "Custom Enterprise Software on AWS",
      "High-Performance Landing Page Engineering",
      "Application Maintenance & Hands-on Support",
    ],
    stat: { val: "By design", label: "security baked into the architecture, not bolted on at the end" },
  },
];

export default function ServicesPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{
        background: [
          "radial-gradient(ellipse 900px 600px at 75% 0%, rgba(124,58,237,0.07), transparent 60%)",
          "radial-gradient(ellipse 600px 400px at 10% 60%, rgba(6,182,212,0.05), transparent 60%)",
        ].join(",")
      }} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025]" style={{
        backgroundImage: "radial-gradient(circle, #a1a1aa 1px, transparent 1px)",
        backgroundSize: "28px 28px"
      }} />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 text-center">
        <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        <div className="max-w-4xl mx-auto px-6">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            The threat is already inside your perimeter
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.05] mb-6">
            25 Services Built to Fix<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              What You Haven&apos;t Discovered Yet.
            </span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Most security teams find out about breaches from attackers, not their tools.
            Tricognita detects, reasons, and fixes — before that call comes.
          </p>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-4">
            {["Agentless", "Policy-Bound Execution", "SOC 2 Type II", "India & UAE Coverage", "Zero Alert Fatigue"].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded border border-zinc-800 bg-zinc-950 text-xs text-zinc-400 font-mono">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar (platform invariants, not contracted SLAs) ── */}
      <div className="border-y border-zinc-900 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { val: "25+",      label: "Specialized Services"  },
            { val: "Read-only", label: "Default Access Mode"  },
            { val: "Tenant",   label: "Isolated Execution"    },
            { val: "0",        label: "Agents Required"       },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-mono text-2xl font-bold text-violet-400">{s.val}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Service Cards ── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((svc) => (
            <div
              key={svc.category}
              className={`group relative flex flex-col p-7 rounded border border-zinc-800 ${svc.borderHover} bg-zinc-950 transition-all duration-300 overflow-hidden`}
              style={{ boxShadow: `inset 0 0 40px ${svc.glow}` }}
            >
              {/* Gradient top line */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${svc.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />

              {/* Hook — emotional angle */}
              <p className={`text-[10px] font-mono uppercase tracking-widest ${svc.accentText} mb-3`}>
                {svc.hook}
              </p>

              <h2 className="text-[16px] font-bold text-white mb-5">{svc.category}</h2>

              <ul className="space-y-2.5 flex-1">
                {svc.items.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                    <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br ${svc.accent}`} />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Stat — the anger hook */}
              <div className="mt-6 pt-5 border-t border-zinc-900">
                <div className={`font-mono text-xl font-bold ${svc.accentText}`}>{svc.stat.val}</div>
                <div className="text-[10px] text-zinc-600 mt-1 leading-relaxed">{svc.stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Banner */}
        <div
          className="mt-8 relative overflow-hidden rounded border p-12 flex flex-col md:flex-row items-center justify-between gap-8"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.06) 100%)", borderColor: "rgba(124,58,237,0.3)" }}
        >
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(124,58,237,0.08),transparent_60%)]" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-widest text-violet-400 font-mono mb-2">Stop waiting for the breach report.</p>
            <h2 className="text-3xl font-bold text-white mb-2">Every day without autonomous defense<br />is a day attackers are ahead of you.</h2>
            <p className="text-zinc-400 text-sm max-w-md">No agents. No disruption. Deploy in 30 minutes via cross-account IAM role. Your first findings report is delivered within 24 hours.</p>
          </div>
          <div className="relative flex flex-col gap-3 items-center flex-shrink-0">
            <Link href="/contact" className="px-8 py-4 bg-violet-600 text-white font-bold rounded text-sm hover:bg-violet-500 transition-colors whitespace-nowrap">
              Talk to a Security Architect
            </Link>
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Run live simulation →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
