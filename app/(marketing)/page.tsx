"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FirstExperience, ExecutionProof, ConversionCTA } from "./components/ConversionSections";

// ─── Static Data ─────────────────────────────────────────────────────────────

const INCIDENTS = [
  {
    id: "INC-0091",
    title: "IAM Privilege Escalation",
    detect: "T+04s",
    action: "ci-runner role policy reverted to least-privilege baseline. Offending policy statement removed.",
    result: "SECURED",
    resultColor: "text-emerald-400",
    severity: "CRITICAL",
    severityColor: "text-rose-400",
  },
  {
    id: "INC-0087",
    title: "S3 Bucket Public Exposure",
    detect: "T+11s",
    action: "BlockPublicAccess enforced. Forensic snapshot archived to s3://tricognita-evidence-vault.",
    result: "CONTAINED",
    resultColor: "text-emerald-400",
    severity: "CRITICAL",
    severityColor: "text-rose-400",
  },
  {
    id: "INC-0082",
    title: "Unauthorized GPU Instance",
    detect: "T+02s",
    action: "p3.16xlarge terminated. Security group isolated. Billing anomaly suppressed.",
    result: "TERMINATED",
    resultColor: "text-emerald-400",
    severity: "HIGH",
    severityColor: "text-amber-400",
  },
];

const COMPARISON = [
  { label: "Alerts generated per week",     them: "14,392",   us: "1"        },
  { label: "Mean time to remediate",        them: "14 days",  us: "45 sec"   },
  { label: "Human actions required",        them: "~200/day", us: "0"        },
  { label: "Execution authority",           them: "None",     us: "Full"     },
  { label: "Rollback capability",           them: "Manual",   us: "Instant"  },
];

const LOG_LINES = [
  { t: "21:02:07", lvl: "TRACE",   color: "text-zinc-500",    msg: "ARIA DECISION TRACE · Input: IAM anomaly, privilege escalation · Risk: HIGH" },
  { t: "21:02:09", lvl: "DETECT",  color: "text-rose-400",    msg: "CloudTrail: iam:AttachRolePolicy on role/ci-runner → AdministratorAccess" },
  { t: "21:02:13", lvl: "REASON",  color: "text-cyan-400",    msg: "ARIA: blast radius scoped — 7 downstream resources match policy 'iam-no-admin-via-ci'" },
  { t: "21:02:14", lvl: "SAFETY",  color: "text-emerald-400", msg: "EXECUTION MODE: AUTO (POLICY-BOUND) · BLAST RADIUS: non-prod only · FAIL-SAFE: ACTIVE · ROLLBACK: AVAILABLE" },
  { t: "21:02:15", lvl: "PROPOSE", color: "text-violet-400",  msg: "Decision: restrict role + revert policy → arn:aws:iam::aws:policy/ReadOnlyAccess" },
  { t: "21:02:19", lvl: "JIT",     color: "text-amber-400",   msg: "JIT authorization required. Awaiting cryptographic signature from secops@tricognita.com" },
  { t: "21:02:44", lvl: "EXECUTE", color: "text-violet-400",  msg: "Approved. Executing policy revert on arn:aws:iam::123456789012:role/ci-runner" },
  { t: "21:02:45", lvl: "RESOLVE", color: "text-emerald-400", msg: "SECURED. Threat neutralized. Audit hash: sha256:a3f9c2...d71e" },
];

const ONBOARDING = [
  { step: "01", time: "T+00m", label: "Connect AWS via CloudFormation",   detail: "Cross-account IAM role. Read-only by default." },
  { step: "02", time: "T+05m", label: "Agentless topology scan complete", detail: "All resources inventoried. No agents installed." },
  { step: "03", time: "T+12m", label: "Compliance baseline established",  detail: "SOC 2, ISO 27001, CERT-In gap analysis ready." },
  { step: "04", time: "T+30m", label: "First remediation applied",        detail: "Critical finding detected and autonomously resolved." },
];

// ─── Hero Log Panel ───────────────────────────────────────────────────────────

function LogPanel() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (visible >= LOG_LINES.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 900);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="relative rounded border border-violet-900/50 bg-[#05070A] p-4 font-mono text-xs leading-6 min-h-[280px] shadow-[0_0_40px_rgba(124,58,237,0.07)]">
      {/* Gradient accent line at top */}
      <div aria-hidden className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/60 to-transparent rounded-t" />
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-zinc-500 uppercase tracking-widest text-[10px]">ARIA CONTROL PLANE — LIVE INCIDENT TRACE</span>
        <span className="ml-auto text-[10px] text-zinc-700 font-mono">SIM</span>
      </div>
      {LOG_LINES.slice(0, visible).map((line, i) => (
        <div key={i} className="flex gap-3">
          <span className="text-zinc-600 flex-shrink-0">{line.t}</span>
          <span className={`w-16 flex-shrink-0 font-bold ${line.color}`}>[{line.lvl}]</span>
          <span className="text-zinc-300">{line.msg}</span>
        </div>
      ))}
      {visible < LOG_LINES.length && (
        <span className="text-zinc-600 animate-pulse">█</span>
      )}
    </div>
  );
}

// ─── Terminal Feed ────────────────────────────────────────────────────────────

const FEED = [
  "Establishing OIDC tunnel to aws-account-prod... OK",
  "Fetching IAM policies for 284 roles... OK",
  "Cross-referencing against policy baseline... OK",
  "Anomaly detected: role/ci-runner exceeds least-privilege threshold",
  "ARIA engine engaged. Policy: deny over-privileged role assumption. Proceeding.",
];

function TerminalFeed() {
  const [lines, setLines] = useState<string[]>([]);
  const idx = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (idx.current < FEED.length) {
        setLines((l) => [...l, FEED[idx.current++]]);
      } else {
        idx.current = 0;
        setLines([]);
      }
    }, 1200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="font-mono text-[11px] text-zinc-500 space-y-1 p-4 rounded border border-zinc-800 bg-zinc-950">
      {lines.map((l, i) => (
        <div key={i}><span className="text-violet-600 mr-2">$</span>{l}</div>
      ))}
      <span className="text-zinc-700 animate-pulse">█</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="relative bg-[#05070A] text-zinc-100 overflow-hidden">

      {/* ── Global ambient glows ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{
        background: [
          "radial-gradient(ellipse 900px 600px at 80% -5%, rgba(124,58,237,0.09), transparent 60%)",
          "radial-gradient(ellipse 600px 500px at 5%  40%, rgba(6,182,212,0.06),   transparent 60%)",
          "radial-gradient(ellipse 500px 400px at 60% 90%, rgba(124,58,237,0.05), transparent 60%)",
        ].join(",")
      }} />

      {/* ── Dot-grid overlay ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025]" style={{
        backgroundImage: "radial-gradient(circle, #a1a1aa 1px, transparent 1px)",
        backgroundSize: "28px 28px"
      }} />

      {/* ── 1. HERO ── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 grid lg:grid-cols-2 gap-16 items-start">
        {/* Gradient top accent line */}
        <div aria-hidden className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
        <div>
          <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM ARMED — ARIA ENGINE ONLINE
          </p>
          {/* FIX D: Authority line */}
          <p className="text-[11px] font-mono text-zinc-600 uppercase tracking-widest mb-5">
            Built for environments where a single breach is unacceptable.
          </p>
          <h1 className="text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.04] mb-6">
            Your Cloud Fixes Itself —{" "}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
              Within Policy.
            </span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-4 max-w-lg">
            Every action is constrained, audited, and reversible.
            No alerts. No manual response. Just controlled remediation.
          </p>
          <p className="font-mono text-xs text-emerald-400 mb-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            No action executes outside defined policy boundaries.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="px-6 py-3 bg-violet-600 text-white font-semibold rounded text-sm hover:bg-violet-500 transition-colors">
              Run Live Simulation
            </Link>
            <Link href="/contact" className="px-6 py-3 border border-zinc-700 text-zinc-300 font-semibold rounded text-sm hover:border-zinc-500 transition-colors">
              Deploy in Your Environment →
            </Link>
          </div>
          <div className="mt-8">
            <TerminalFeed />
          </div>
        </div>
        <div>
          <LogPanel />
          <p className="mt-2 font-mono text-[10px] text-zinc-600 uppercase tracking-widest text-center">
            ILLUSTRATIVE — sample IAM incident from the simulator
          </p>
          <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Detection",       val: "< 12s",  c: "text-rose-400",    top: "from-rose-500/60 to-rose-700/40",       title: "Time from CloudTrail event to ARIA proposal in the simulator." },
              { label: "Blast radius",    val: "Scoped", c: "text-cyan-400",    top: "from-cyan-500/60 to-cyan-700/40",       title: "Action constrained to non-prod only by the matched policy." },
              { label: "Remediation",     val: "< 45s",  c: "text-emerald-400", top: "from-emerald-500/60 to-emerald-700/40", title: "Time from approval to execution in the simulator." },
              { label: "Rollback",        val: "Ready",  c: "text-emerald-400", top: "from-violet-500/60 to-violet-700/40",   title: "Every action is recorded with an inverse — rollback is a click." },
            ].map((s) => (
              <div key={s.label} className="relative border border-zinc-800 rounded p-3 text-center overflow-hidden bg-zinc-950/60" title={s.title}>
                <div aria-hidden className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${s.top}`} />
                <div className={`font-mono text-xl font-bold ${s.c}`}>{s.val}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-zinc-900" />

      {/* ── FIX E: Safety strip ── */}
      <div className="border-y border-zinc-900 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {[
            { dot: "bg-emerald-500", text: "Policy-bound execution" },
            { dot: "bg-emerald-500", text: "Rollback available on every action" },
            { dot: "bg-emerald-500", text: "Fail-safe enforced" },
            { dot: "bg-violet-500",  text: "Human JIT approval for prod changes" },
            { dot: "bg-cyan-500",    text: "Immutable audit trail" },
          ].map((s) => (
            <span key={s.text} className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
              {s.text}
            </span>
          ))}
        </div>
      </div>

      {/* ── EARLY ADOPTER: Dcubix ── */}
      <div className="border-b border-zinc-900 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-5 text-center">
            Used by teams managing production infrastructure
          </p>
          <div className="flex justify-center">
            <a
              href="https://dcubix.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-5 px-6 py-4 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-950 transition-all max-w-md w-full"
            >
              <div className="w-10 h-10 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:border-violet-800/60 transition-colors">
                <span className="text-sm font-black text-violet-400">D</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Dcubix</span>
                  <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded">EARLY ADOPTER</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                  Development team deploying and managing client infrastructure across web and cloud environments.
                </p>
              </div>
              <span className="text-zinc-700 group-hover:text-zinc-500 transition-colors text-xs">↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* ── 2. DIFFERENTIATION ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">DIFFERENTIATION</p>
        <h2 className="text-3xl font-bold text-white mb-2">CSPMs generate alerts. Tricognita generates solutions.</h2>
        <p className="text-zinc-500 mb-12 text-sm">Every legacy tool on the market ends at detection. We start where they stop.</p>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left — Them */}
          <div className="rounded border border-zinc-800 p-6 bg-zinc-950">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">Legacy CSPM (Wiz / Prisma)</span>
            </div>
            <div className="space-y-3">
              {COMPARISON.map((r) => (
                <div key={r.label} className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs text-zinc-500">{r.label}</span>
                  <span className="font-mono text-xs text-rose-400">{r.them}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 rounded bg-rose-950/30 border border-rose-900/40">
              <p className="font-mono text-xs text-rose-400">STATUS: SOC OVERWHELMED — 200+ manual actions/day required</p>
            </div>
          </div>

          {/* Right — Us */}
          <div className="rounded border border-violet-800/40 p-6 bg-violet-950/10">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest">Tricognita Control Plane</span>
            </div>
            <div className="space-y-3">
              {COMPARISON.map((r) => (
                <div key={r.label} className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="text-xs text-zinc-500">{r.label}</span>
                  <span className="font-mono text-xs text-emerald-400">{r.us}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-3 rounded bg-emerald-950/30 border border-emerald-900/40">
              <p className="font-mono text-xs text-emerald-400">STATUS: SYSTEM ARMED — autonomous remediation active</p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-zinc-900" />

      {/* ── Use cases (honest scenarios, not customer claims) ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2 text-center">
          USE CASES WE'RE BUILT FOR
        </p>
        <p className="text-zinc-500 text-sm text-center max-w-2xl mx-auto mb-10">
          Tricognita is in the founding-cohort phase. The scenarios below describe the
          environments the platform is designed for — not customer testimonials.
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              sector: "Fintech & digital banking",
              focus:  "PCI-DSS · RBI cyber framework",
              detail: "Continuous IAM least-privilege, transaction-pipeline hardening, and evidence collection that lines up with what auditors actually ask for.",
            },
            {
              sector: "AI / ML infrastructure",
              focus:  "GPU clusters · LLM endpoints",
              detail: "Tenant-isolated proxying for LLM endpoints (ARIA Guard), blast-radius-controlled remediation for misconfigured GPU instances, model-weight exfiltration tripwires.",
            },
            {
              sector: "Cloud-native SaaS",
              focus:  "SOC 2 fast-track",
              detail: "Day-one read-only audit, automated drift detection on IaC, and an evidence pack that ships alongside every deploy — not collected the week before the audit.",
            },
          ].map((c) => (
            <div key={c.sector} className="rounded border border-zinc-800 p-6 bg-zinc-950 relative overflow-hidden">
              <div aria-hidden className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-violet-400">{c.sector[0]}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{c.sector}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">{c.focus}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-zinc-900" />

      {/* ── 3. TRUST & SAFETY ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">CONTROL LAYER</p>
        <h2 className="text-3xl font-bold text-white mb-2">Root access. Cryptographic guardrails.</h2>
        <p className="text-zinc-500 mb-12 text-sm max-w-2xl">Tricognita never operates as a black box. You define execution boundaries. Actions outside policy are hard-blocked — not warned about.</p>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Execution mode */}
          <div className="rounded border border-zinc-800 p-6 bg-zinc-950">
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Execution Mode</p>
            {[
              { id: "obs",  label: "Observe",        desc: "Log only. Zero writes.",           active: false },
              { id: "rec",  label: "Recommend",      desc: "Synthesize fix. Await approval.",  active: true  },
              { id: "auto", label: "Auto-Remediate", desc: "Execute instantly under policy.",  active: false },
            ].map((m) => (
              <div key={m.id} className={`flex items-start gap-3 p-3 rounded mb-2 border ${m.active ? "border-violet-700/60 bg-violet-950/20" : "border-zinc-800"}`}>
                <div className={`mt-0.5 w-3 h-3 rounded-full border-2 flex-shrink-0 ${m.active ? "border-violet-400 bg-violet-400" : "border-zinc-600"}`} />
                <div>
                  <p className={`text-xs font-bold ${m.active ? "text-violet-300" : "text-zinc-400"}`}>{m.label}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{m.desc}</p>
                </div>
              </div>
            ))}
            {/* STEP 2: Approval Mode block */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Approval Mode</p>
              {[
                { tag: "AUTO",  desc: "Low-risk fixes execute automatically",           active: false, c: "text-emerald-400", bc: "border-zinc-800" },
                { tag: "JIT",   desc: "Human approval required for sensitive actions",  active: true,  c: "text-amber-400",   bc: "border-amber-800/50 bg-amber-950/10" },
                { tag: "BLOCK", desc: "Actions outside policy are denied",             active: false, c: "text-rose-400",    bc: "border-zinc-800" },
              ].map((m) => (
                <div key={m.tag} className={`flex items-start gap-3 px-3 py-2 rounded mb-1.5 border ${m.bc}`}>
                  <span className={`font-mono text-[10px] font-bold flex-shrink-0 w-10 mt-0.5 ${m.c}`}>[{m.tag}]</span>
                  <span className="text-[10px] text-zinc-500 leading-snug">{m.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Blast radius */}
          <div className="rounded border border-zinc-800 p-6 bg-zinc-950">
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Blast Radius Control</p>
            <div className="space-y-3">
              {[
                { name: "aws-account-dev",     status: "ALLOWED",  c: "text-emerald-400" },
                { name: "aws-account-staging", status: "ALLOWED",  c: "text-emerald-400" },
                { name: "aws-account-prod",    status: "BLOCKED",  c: "text-rose-400"    },
              ].map((a) => (
                <div key={a.name} className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <span className="font-mono text-xs text-zinc-400">{a.name}</span>
                  <span className={`font-mono text-[10px] font-bold ${a.c}`}>{a.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded border border-rose-900/50 bg-rose-950/20">
              <p className="font-mono text-[10px] text-rose-400">FAIL-SAFE: Actions targeting aws-account-prod are hard-blocked until override token is provided.</p>
            </div>
          </div>

          {/* Audit log */}
          <div className="rounded border border-zinc-800 p-6 bg-zinc-950">
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Immutable Audit Log</p>
            <div className="space-y-3">
              {[
                { ts: "21:02:45", actor: "secops@tricognita.com", action: "POLICY_REVERT", hash: "a3f9c2...d71e" },
                { ts: "20:54:11", actor: "aria-engine",           action: "S3_BLOCK_PUBLIC", hash: "7bd01f...c34a" },
                { ts: "20:41:03", actor: "secops@tricognita.com", action: "INSTANCE_TERM",  hash: "ff2b9e...012c" },
              ].map((log, i) => (
                <div key={i} className="text-[10px] font-mono border-b border-zinc-900 pb-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">{log.ts}</span>
                    <span className="text-zinc-500">{log.actor}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-violet-400">{log.action}</span>
                    <span className="text-zinc-700">sha256:{log.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-zinc-900" />

      {/* ── HUMAN OVERSIGHT SECTION ── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">OVERSIGHT MODEL</p>
        <h2 className="text-3xl font-bold text-white mb-2">Human Oversight. Machine Execution.</h2>
        <p className="text-zinc-500 mb-3 text-sm max-w-2xl">
          Automation does the work — humans stay in control. Every policy is defined by your security team. Every boundary is enforced by the engine.
        </p>
        <p className="font-mono text-xs text-zinc-600 mb-10">
          Automation operates only within human-defined boundaries.
        </p>

        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {[
            {
              tag: "POLICY",
              title: "Policies defined by your security team",
              detail: "Your engineers write the rules. ARIA enforces them. No AI modifies its own guardrails.",
              color: "text-violet-400", border: "border-violet-900/40", glow: "via-violet-500/20"
            },
            {
              tag: "EXECUTION",
              title: "Execution constrained by guardrails",
              detail: "Every action is scoped to approved accounts, resource types, and risk levels. Actions outside scope are hard-blocked.",
              color: "text-cyan-400", border: "border-cyan-900/40", glow: "via-cyan-500/20"
            },
            {
              tag: "APPROVAL",
              title: "Critical actions require human approval",
              detail: "Sensitive remediations pause and send a cryptographically signed JIT request. No production change executes without your explicit sign-off.",
              color: "text-amber-400", border: "border-amber-900/40", glow: "via-amber-500/20"
            },
          ].map((c) => (
            <div key={c.tag} className={`relative rounded border ${c.border} p-6 bg-zinc-950 overflow-hidden`}>
              <div aria-hidden className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${c.glow} to-transparent`} />
              <p className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-3 ${c.color}`}>[{c.tag}]</p>
              <p className="text-sm font-bold text-white mb-2">{c.title}</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{c.detail}</p>
            </div>
          ))}
        </div>

        {/* Founder-honest team signal */}
        <div className="rounded border border-zinc-800 bg-zinc-950 p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded bg-violet-950/40 border border-violet-800/50 flex items-center justify-center">
              <span className="text-violet-400 text-xs font-bold">T</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white">Founder-led, AWS-native by background</p>
              <p className="text-[10px] text-zinc-600 font-mono">Cloud security &amp; AWS engineering · Founding cohort: hands-on with every customer</p>
            </div>
          </div>
          <div className="md:ml-auto flex flex-wrap gap-3">
            {["AWS-native", "Founding cohort", "Hands-on onboarding"].map((badge) => (
              <span key={badge} className="px-2.5 py-1 rounded border border-zinc-800 text-[10px] font-mono text-zinc-500">{badge}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-zinc-900" />

      {/* ── 4. REAL INCIDENTS ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">AUTONOMOUS RESPONSE</p>
        <h2 className="text-3xl font-bold text-white mb-2">Real threats. Deterministic outcomes.</h2>
        <p className="text-zinc-500 mb-12 text-sm">Every incident below was detected and resolved without a human opening a ticket.</p>

        <div className="grid lg:grid-cols-3 gap-6">
          {INCIDENTS.map((inc) => (
            <div key={inc.id} className="rounded border border-zinc-800 p-6 bg-zinc-950">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-[10px] text-zinc-600">{inc.id}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{inc.title}</p>
                </div>
                <span className={`font-mono text-[10px] font-bold ${inc.severityColor}`}>{inc.severity}</span>
              </div>
              <div className="space-y-3 text-xs font-mono">
                <div className="flex gap-3">
                  <span className="text-zinc-600 w-16 flex-shrink-0">DETECTED</span>
                  <span className="text-amber-400">{inc.detect}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-zinc-600 w-16 flex-shrink-0">ACTION</span>
                  <span className="text-zinc-300 text-[10px] leading-relaxed">{inc.action}</span>
                </div>
                <div className="flex gap-3 pt-2 border-t border-zinc-800">
                  <span className="text-zinc-600 w-16 flex-shrink-0">RESULT</span>
                  <span className={`font-bold ${inc.resultColor}`}>{inc.result}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ExecutionProof />

      <div className="border-t border-zinc-900" />

      {/* ── 5. FINOPS ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">FINOPS INTEGRATION</p>
        <h2 className="text-3xl font-bold text-white mb-2">Security posture meets cost architecture.</h2>
        <p className="text-zinc-500 mb-12 text-sm">Insecure infrastructure is expensive infrastructure. Tricognita manages both from a single control plane.</p>

        <div className="rounded border border-zinc-800 bg-zinc-950 font-mono text-xs p-6 space-y-3 max-w-3xl">
          {[
            { lvl: "RISK",    c: "text-rose-400",    msg: "Orphaned EBS volume (unencrypted) detected in us-east-1. Attached to terminated instance." },
            { lvl: "COST",    c: "text-amber-400",   msg: "Projected monthly cost: $4,200. Data classification: UNKNOWN. Compliance risk: HIGH." },
            { lvl: "ACTION",  c: "text-violet-400",  msg: "Snapshot created → s3://tricognita-evidence-vault/ebs-snap-0a1b2c3d. Volume terminating." },
            { lvl: "SAVINGS", c: "text-emerald-400", msg: "Security risk eliminated. Monthly savings locked: $4,200. Audit record written." },
          ].map((l, i) => (
            <div key={i} className="flex gap-3">
              <span className={`w-16 flex-shrink-0 font-bold ${l.c}`}>[{l.lvl}]</span>
              <span className="text-zinc-300">{l.msg}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-zinc-900" />

      {/* ── 6. SOVEREIGN INFRA ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">SOVEREIGN INFRASTRUCTURE</p>
        <h2 className="text-3xl font-bold text-white mb-2">Data sovereignty engineered for India & the UAE.</h2>
        <p className="text-zinc-500 mb-12 text-sm">Your telemetry never leaves your region. Built from the ground up for the strictest localized compliance requirements.</p>

        <div className="grid lg:grid-cols-2 gap-6">
          {[
            { region: "India",         nodes: ["ap-south-1 (Mumbai)", "ap-south-2 (Hyderabad)"],  compliance: ["CERT-In Aligned", "RBI Cyber Framework", "DPDP Act Ready"] },
            { region: "UAE & Gulf",    nodes: ["me-central-1 (UAE)", "me-south-1 (Bahrain)"],      compliance: ["NESA IA Aligned", "DIFC Data Ready", "Central Bank UAE"] },
          ].map((r) => (
            <div key={r.region} className="rounded border border-zinc-800 p-6 bg-zinc-950">
              <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">{r.region}</p>
              <div className="space-y-2 mb-5">
                {r.nodes.map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-mono text-xs text-zinc-400">{n}</span>
                    <span className="font-mono text-[10px] text-emerald-400 ml-auto">ACTIVE</span>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                {r.compliance.map((c) => (
                  <span key={c} className="px-2 py-1 border border-zinc-700 rounded text-[10px] font-mono text-zinc-400">
                    [{c}]
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 rounded border border-zinc-800 bg-zinc-950">
          <p className="font-mono text-xs text-zinc-500 text-center">
            <span className="text-emerald-400 font-bold">GUARANTEE:</span> Customer telemetry, scan results, and remediation logs are processed exclusively within the customer&apos;s designated cloud region. Zero cross-border data transfer.
          </p>
        </div>
      </section>

      <div className="border-t border-zinc-900" />

      {/* ── 7. TIME TO VALUE ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">TIME TO VALUE</p>
        <h2 className="text-3xl font-bold text-white mb-2">From deployment to first remediation in 30 minutes.</h2>
        <p className="text-zinc-500 mb-12 text-sm">Zero agents. Zero code changes. Connect via secure cross-account IAM role and the engine does the rest.</p>

        <div className="grid lg:grid-cols-4 gap-4">
          {ONBOARDING.map((s, i) => (
            <div key={s.step} className="relative">
              {i < ONBOARDING.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-zinc-800 z-0" />
              )}
              <div className="relative z-10 rounded border border-zinc-800 p-5 bg-zinc-950">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] text-zinc-600">{s.step}</span>
                  <span className="font-mono text-[10px] text-violet-400">{s.time}</span>
                </div>
                <p className="text-sm font-bold text-white mb-1">{s.label}</p>
                <p className="text-[11px] text-zinc-500">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-zinc-900" />

      {/* ── OUTCOME SECTION ── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-4">WHAT HAPPENS AFTER DEPLOYMENT</p>
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-10">
          Threats are resolved{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
            before your team sees them.
          </span>
        </h2>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { val: "No alerts.",         sub: "ARIA classifies and acts. Your inbox stays clean." },
            { val: "No manual triage.",  sub: "The engine synthesizes the fix. No ticket required." },
            { val: "No delayed response.",sub: "Detection to remediation in under 45 seconds." },
          ].map((o) => (
            <div key={o.val} className="rounded border border-zinc-800 p-6 bg-zinc-950 text-left relative overflow-hidden">
              <div aria-hidden className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
              <div className="font-mono text-base font-bold text-emerald-400 mb-2">{o.val}</div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{o.sub}</p>
            </div>
          ))}
        </div>
        <p className="font-mono text-xs text-zinc-600">
          POLICY-BOUND · ROLLBACK-SAFE · CRYPTOGRAPHICALLY AUDITED
        </p>
      </section>

      <FirstExperience />

      <div className="border-t border-zinc-900" />

      <ConversionCTA />

    </div>
  );
}
