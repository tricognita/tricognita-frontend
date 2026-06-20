"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const SECTORS = [
  {
    title: "Fintech & Digital Banking",
    region: "India · UAE",
    gradient: "from-emerald-500/10 to-teal-500/5",
    border: "hover:border-emerald-500/30",
    accent: "text-emerald-400",
    dot: "bg-emerald-400",
    description:
      "Hardening transaction pipelines, PCI-DSS continuous compliance, and fraud-detection infrastructure for regulated financial institutions.",
    focus: ["PCI-DSS Automation", "Transaction Infra Hardening", "Secrets Management"],
    compliance: ["PCI-DSS", "ISO 27001", "RBI Guidelines"],
  },
  {
    title: "AI Labs & GenAI SaaS",
    region: "Global",
    gradient: "from-violet-500/10 to-purple-500/5",
    border: "hover:border-violet-500/30",
    accent: "text-violet-400",
    dot: "bg-violet-400",
    description:
      "Securing GPU clusters, model weights, and LLM inference endpoints against prompt injection, data exfiltration, and supply chain compromise.",
    focus: ["LLM Guard Proxy", "Model Exfiltration Defense", "Prompt Injection Guardrails"],
    compliance: ["EU AI Act", "SOC 2", "ISO 42001"],
  },
  {
    title: "Public Sector & GovTech",
    region: "India · UAE",
    gradient: "from-blue-500/10 to-indigo-500/5",
    border: "hover:border-blue-500/30",
    accent: "text-blue-400",
    dot: "bg-blue-400",
    description:
      "High-sovereignty cloud deployments with Post-Quantum Cryptography, Zero Trust architecture, and immutable audit trails for government entities.",
    focus: ["Sovereign Cloud Deployment", "PQC Migration", "FedRAMP / NESA Alignment"],
    compliance: ["NESA IA", "CERT-In", "FedRAMP"],
  },
  {
    title: "Web3, Crypto & DeFi",
    region: "Global",
    gradient: "from-amber-500/10 to-orange-500/5",
    border: "hover:border-amber-500/30",
    accent: "text-amber-400",
    dot: "bg-amber-400",
    description:
      "Multi-cloud node security, hot-wallet infrastructure isolation, MPC key management, and smart contract environment protection.",
    focus: ["Node Hardening", "MPC Security", "VPC Isolation"],
    compliance: ["SOC 2", "ISO 27001"],
  },
  {
    title: "Healthcare & BioTech SaaS",
    region: "India · UAE · Global",
    gradient: "from-rose-500/10 to-pink-500/5",
    border: "hover:border-rose-500/30",
    accent: "text-rose-400",
    dot: "bg-rose-400",
    description:
      "PHI exposure scanning, HIPAA continuous compliance automation, and EHR hardening for healthcare SaaS platforms handling sensitive patient data.",
    focus: ["PHI Exposure Scanning", "HIPAA Automation", "EHR Hardening"],
    compliance: ["HIPAA", "SOC 2", "ISO 27001"],
  },
  {
    title: "Venture-Backed SaaS",
    region: "Global",
    gradient: "from-cyan-500/10 to-blue-500/5",
    border: "hover:border-cyan-500/30",
    accent: "text-cyan-400",
    dot: "bg-cyan-400",
    description:
      "SOC 2 fast-tracking, automated evidence collection, and CI/CD security hardening for high-growth SaaS companies closing enterprise deals.",
    focus: ["SOC2 Fast-Track", "Evidence Collection", "CI/CD Security"],
    compliance: ["SOC 2 Type II", "ISO 27001", "GDPR"],
  },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: "blur(4px)" },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as any } },
};

export default function SolutionsPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: "radial-gradient(800px 600px at 70% 10%, rgba(99,102,241,0.07), transparent 60%), radial-gradient(600px 500px at 20% 80%, rgba(16,185,129,0.05), transparent 60%)" }} />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 text-center border-b border-white/5">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl mx-auto px-6">
          <motion.p variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Vertical Intelligence — Tailored for Your Industry
          </motion.p>
          <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.05] mb-6">
            Solutions Built for<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Your Threat Model.
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Tricognita provides specialized defense frameworks tailored to the unique risk landscape
            of modern industries operating across India and the UAE.
          </motion.p>

          {/* Region trust badges */}
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mt-10">
            {["🇮🇳 India (CERT-In / RBI)", "🇦🇪 UAE (NESA IA)", "🌐 SOC 2 — In Progress", "🔐 ISO 27001 — Aligned", "⚖️ GDPR"].map((b) => (
              <span key={b} className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                {b}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Sector Cards ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div
          variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {SECTORS.map((sector) => (
            <motion.div key={sector.title} variants={fadeUp} className="h-full">
              <div className={`group relative h-full flex flex-col p-8 rounded-2xl bg-gradient-to-br ${sector.gradient} border border-white/5 ${sector.border} transition-all duration-500 backdrop-blur-sm`}>

                <div className="flex items-start justify-between mb-5">
                  <h2 className="text-[18px] font-bold text-white leading-tight max-w-[200px]">{sector.title}</h2>
                  <span className={`text-[10px] font-bold ${sector.accent} bg-zinc-950/50 px-2 py-1 rounded-full border border-white/5 whitespace-nowrap ml-2`}>
                    {sector.region}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 leading-relaxed flex-1 mb-6">{sector.description}</p>

                {/* Focus tags */}
                <div className="mb-5">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-2">Core Capabilities</p>
                  <div className="flex flex-wrap gap-2">
                    {sector.focus.map((f) => (
                      <span key={f} className={`text-[10px] px-2.5 py-1 rounded-lg bg-zinc-950/60 border border-white/5 ${sector.accent} font-medium`}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Compliance standards */}
                <div className="pt-5 border-t border-white/5">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mb-2">Compliance Standards</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sector.compliance.map((c) => (
                      <span key={c} className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Custom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-8 grid md:grid-cols-2 gap-6"
        >
          <div className="p-10 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Don&apos;t see your industry?</p>
              <h3 className="text-2xl font-bold text-white mb-3">Custom Security Architecture</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Our elite engineering team specializes in custom security architecture for unconventional tech stacks and regulated environments.
              </p>
            </div>
            <Link href="/contact" className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors text-sm self-start">
              Request Custom Consultation →
            </Link>
          </div>

          <div className="p-10 rounded-2xl border relative overflow-hidden flex flex-col justify-between"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.08) 100%)", borderColor: "rgba(99,102,241,0.3)" }}>
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.1),transparent_60%)]" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-3">India & UAE Priority</p>
              <h3 className="text-2xl font-bold text-white mb-3">Regional Compliance Experts</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Dedicated support for CERT-In, RBI cybersecurity frameworks (India) and NESA IA, DIFC (UAE). We speak your regulator&apos;s language.
              </p>
            </div>
            <Link href="/pricing" className="relative mt-8 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors text-sm self-start">
              View Regional Pricing →
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
