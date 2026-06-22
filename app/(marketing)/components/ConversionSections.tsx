"use client";

import React from "react";

export function FirstExperience() {
  const steps = [
    { title: "Connect your cloud environment",                             desc: "Read-only access, no changes applied." },
    { title: "ARIA analyzes configurations, permissions, and active risks", desc: "Agentless topology scan and risk assessment." },
    { title: "You receive a structured findings report",                    desc: "With severity, blast radius, and cost impact." },
    { title: "Review and approve remediation actions",                      desc: "Or stay in observe mode — your call." },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="divider-glow mb-16" />
      <div className="mb-12">
        <p className="section-label mb-4">Onboarding Pipeline</p>
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3 leading-tight">What Happens When You Start</h2>
        <p className="text-zinc-500 text-sm">No writes. No disruption. Full visibility within 24 hours.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="glow-card accent-top relative p-5 flex flex-col justify-between min-h-[160px] lift">
            <div className="absolute top-3 right-4 font-mono text-zinc-800/60 text-4xl font-black select-none">{i + 1}</div>
            <div>
              <p className="text-sm font-bold text-white mb-2 pr-8 leading-snug">{step.title}</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 font-mono text-[10px] text-zinc-600 uppercase tracking-widest text-center">
        "No actions are executed without policy constraints or approval settings."
      </p>
    </section>
  );
}

export function ExecutionProof() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div className="divider-glow mb-16" />
      <div className="mb-12">
        <p className="section-label mb-4">Operational Verification</p>
        <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight">Real Incident Resolution</h2>
      </div>
      <div className="grid lg:grid-cols-2 gap-10 items-start">
        <div className="terminal relative p-6 font-mono text-[11px] leading-relaxed overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
          <div className="absolute top-3 right-3 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
            SIM
          </div>
          <div className="space-y-4">
            {[
              { label: "Incident",  val: "Public S3 bucket exposed",                                    c: "text-rose-400"    },
              { label: "Detection", val: "Identified in 3.2 seconds",                                   c: "text-emerald-400" },
              { label: "Analysis",  val: "Blast radius: 2 services affected",                           c: "text-zinc-300"    },
              { label: "Action",    val: "Policy generated → approval requested → access restricted",   c: "text-zinc-300"    },
            ].map((r) => (
              <div key={r.label} className="flex gap-4">
                <span className="text-zinc-600 w-20 flex-shrink-0 uppercase tracking-wider text-[10px]">{r.label}:</span>
                <span className={r.c}>{r.val}</span>
              </div>
            ))}
            <div className="flex gap-4 pt-4 border-t border-zinc-800/60">
              <span className="text-zinc-600 w-20 flex-shrink-0 uppercase tracking-wider text-[10px] font-bold">Result:</span>
              <span className="text-emerald-400 font-bold tracking-widest stat-glow">RISK ELIMINATED IN 11 SECONDS</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="section-label">Built for Real Infrastructure</p>
          <div className="grid gap-3">
            {[
              "All actions are logged with full traceability",
              "Every execution can be reviewed and rolled back",
              "Automation operates within defined policy boundaries",
              "Designed for multi-tenant, isolated environments",
            ].map((text, i) => (
              <div key={i} className="glow-card flex items-center gap-3 p-3.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                <span className="text-xs text-zinc-400">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest italic pt-2">
            "Currently deployed in early-stage cloud-native environments"
          </p>
        </div>
      </div>
    </section>
  );
}

export function StatsBar() {
  return (
    <section className="relative border-y border-[rgba(45,36,89,0.5)] bg-[rgba(8,6,16,0.6)] backdrop-blur-sm overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
        {[
          { val: "10x",   label: "Faster Remediation", sub: "vs manual processes",           color: "text-violet-400"  },
          { val: "3.2m",  label: "MTTR",               sub: "Mean time to remediate",         color: "text-cyan-400"    },
          { val: "2.1%",  label: "False Positives",    sub: "Reduced with AI precision",      color: "text-emerald-400" },
          { val: "98.7%", label: "Policy Coverage",    sub: "Across monitored resources",     color: "text-amber-400"   },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 group">
            <span className={`text-4xl lg:text-5xl font-black tracking-tight stat-glow ${s.color} transition-transform duration-300 group-hover:scale-110`}>
              {s.val}
            </span>
            <span className="text-sm font-semibold text-white mt-1">{s.label}</span>
            <span className="text-[11px] text-zinc-500">{s.sub}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Integrations() {
  const tools = [
    { name: "AWS",          abbr: "aws", color: "text-amber-400"   },
    { name: "Azure",        abbr: "Az",  color: "text-blue-400"    },
    { name: "Google Cloud", abbr: "GCP", color: "text-cyan-400"    },
    { name: "Slack",        abbr: "Sl",  color: "text-emerald-400" },
    { name: "PagerDuty",    abbr: "PD",  color: "text-green-400"   },
    { name: "ServiceNow",   abbr: "SN",  color: "text-violet-400"  },
    { name: "GitHub",       abbr: "GH",  color: "text-zinc-300"    },
    { name: "Jira",         abbr: "Ji",  color: "text-blue-300"    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-20 text-center">
      <div className="divider-glow mb-16" />
      <p className="section-label mb-4 justify-center">Built to Integrate</p>
      <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">Works with your stack.</h2>
      <p className="text-zinc-500 text-sm mb-12 max-w-xl mx-auto">Seamlessly integrates with your cloud, DevOps, and security tooling — no agents required.</p>
      <div className="flex flex-wrap justify-center items-center gap-5">
        {tools.map((t) => (
          <div key={t.name} className="flex flex-col items-center gap-2 group cursor-default">
            <div className={`glow-card w-14 h-14 flex items-center justify-center font-bold text-sm ${t.color} group-hover:scale-110 transition-transform duration-200`}>
              {t.abbr}
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">{t.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Testimonial() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20 text-center">
      <div className="divider-glow mb-16" />
      <div className="glow-card accent-top relative p-10 overflow-hidden">
        <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        <div className="text-5xl text-violet-800/50 font-serif leading-none mb-6 select-none">&ldquo;</div>
        <blockquote className="text-lg text-zinc-200 leading-relaxed mb-8 max-w-2xl mx-auto">
          Tricognita reduced our mean time to remediation from hours to seconds. It&apos;s like having a security engineer that never sleeps.
        </blockquote>
        <div className="flex items-center justify-center gap-4">
          <div className="w-10 h-10 rounded-full bg-violet-950 border border-violet-700/50 flex items-center justify-center ring-2 ring-violet-500/10">
            <span className="text-violet-300 font-bold text-sm">A</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-white">Amrush S.</p>
            <p className="text-[11px] text-zinc-500">Head of Security · <span className="text-violet-400">Dcubix</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ConversionCTA() {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-transparent to-cyan-950/20 pointer-events-none" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <div aria-hidden className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, #a1a1aa 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div className="relative max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600/15 border border-violet-500/20 mb-8 ring-4 ring-violet-500/5">
          <span className="text-2xl">🛡</span>
        </div>
        <p className="section-label mb-5 justify-center">Command</p>
        <h2 className="text-4xl lg:text-5xl font-bold text-white mb-5 leading-[1.08]">
          Stop responding.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-300 to-cyan-400">
            Start controlling.
          </span>
        </h2>
        <p className="text-zinc-400 mb-10 text-lg max-w-lg mx-auto leading-relaxed">
          Deploy the autonomous control plane. Your infrastructure. Your governance. Zero alert fatigue.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <a href="/register" className="btn-primary">
            Start Free Audit
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a href="/contact" className="btn-ghost !rounded-lg">
            Apply for Founding Access
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-700" />Agentless Deployment</span>
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-700" />JIT Cryptographic Governance</span>
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-700" />Immutable Audit Trail</span>
          <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-zinc-700" />Tenant-Isolated Execution</span>
        </div>
      </div>
    </section>
  );
}
