"use client";

import React from "react";

export function FirstExperience() {
  const steps = [
    {
      title: "Connect your cloud environment",
      desc: "(Read-only access, no changes applied)"
    },
    {
      title: "ARIA analyzes configurations, permissions, and active risks",
      desc: "Agentless topology scan and risk assessment."
    },
    {
      title: "You receive a structured findings report",
      desc: "(with severity, blast radius, and cost impact)"
    },
    {
      title: "Review and approve remediation actions",
      desc: "(or stay in observe mode)"
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-24 border-t border-zinc-900">
      <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">ONBOARDING PIPELINE</p>
      <h2 className="text-3xl font-bold text-white mb-2">What Happens When You Start</h2>
      <p className="text-zinc-500 mb-12 text-sm">No writes. No disruption. Full visibility within 24 hours.</p>

      <div className="grid md:grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <div key={i} className="relative rounded border border-zinc-800 p-5 bg-zinc-950 flex flex-col justify-between min-h-[160px]">
             <div className="absolute top-3 right-4 font-mono text-zinc-800 text-3xl font-black">{i + 1}</div>
             <div>
                <p className="text-sm font-bold text-zinc-100 mb-2 pr-8">{step.title}</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{step.desc}</p>
             </div>
          </div>
        ))}
      </div>
      <p className="mt-8 font-mono text-[10px] text-zinc-600 uppercase tracking-widest text-center">
        “No actions are executed without policy constraints or approval settings.”
      </p>
    </section>
  );
}

export function ExecutionProof() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 border-t border-zinc-900">
      <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">OPERATIONAL VERIFICATION</p>
      <h2 className="text-3xl font-bold text-white mb-12">Real Incident Resolution</h2>

      <div className="grid lg:grid-cols-2 gap-12 items-start">
        <div className="rounded border border-zinc-800 bg-zinc-950/50 p-6 font-mono text-[11px] leading-relaxed relative overflow-hidden">
          <div className="absolute top-0 right-0 px-2 py-1 bg-emerald-500/10 border-l border-b border-emerald-500/20 text-emerald-500 text-[9px] font-bold uppercase tracking-widest">
            [ SIMULATED ENVIRONMENT ]
          </div>
          <div className="space-y-4">
            <div className="flex gap-4">
              <span className="text-zinc-600 w-24 flex-shrink-0 uppercase tracking-widest">Incident:</span>
              <span className="text-rose-400">Public S3 bucket exposed</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-600 w-24 flex-shrink-0 uppercase tracking-widest">Detection:</span>
              <span className="text-emerald-400">Identified in 3.2 seconds</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-600 w-24 flex-shrink-0 uppercase tracking-widest">Analysis:</span>
              <span className="text-zinc-300">Blast radius: 2 services affected</span>
            </div>
            <div className="flex gap-4">
              <span className="text-zinc-600 w-24 flex-shrink-0 uppercase tracking-widest">Action:</span>
              <span className="text-zinc-300">Policy generated → approval requested → access restricted</span>
            </div>
            <div className="flex gap-4 pt-4 border-t border-zinc-900">
              <span className="text-zinc-600 w-24 flex-shrink-0 uppercase tracking-widest font-bold">Result:</span>
              <span className="text-emerald-400 font-bold tracking-widest">RISK ELIMINATED IN 11 SECONDS</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Built for Real Infrastructure</h3>
          <div className="grid gap-3">
            {[
              "All actions are logged with full traceability",
              "Every execution can be reviewed and rolled back",
              "Automation operates within defined policy boundaries",
              "Designed for multi-tenant, isolated environments"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded border border-zinc-900 bg-zinc-950/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-400">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest italic pt-4">
            “Currently deployed in early-stage cloud-native environments”
          </p>
        </div>
      </div>
    </section>
  );
}

export function ConversionCTA() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-32 text-center">
      <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-4">COMMAND</p>
      <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
        Stop responding.<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
          Start controlling.
        </span>
      </h2>
      <p className="text-zinc-500 mb-10 text-lg">
        Deploy the autonomous control plane. Your infrastructure. Your governance. Zero alert fatigue.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <a href="/register" className="px-8 py-4 bg-violet-600 text-white font-bold rounded text-sm hover:bg-violet-500 transition-colors">
          Start Free Audit
        </a>
        <a href="/contact" className="px-8 py-4 border border-zinc-700 text-zinc-300 font-bold rounded text-sm hover:border-zinc-500 transition-colors">
          Apply for Founding Access
        </a>
      </div>
      <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs font-mono text-zinc-600">
        <span>● AGENTLESS DEPLOYMENT</span>
        <span>● JIT CRYPTOGRAPHIC GOVERNANCE</span>
        <span>● IMMUTABLE AUDIT TRAIL</span>
        <span>● TENANT-ISOLATED EXECUTION</span>
      </div>
    </section>
  );
}
