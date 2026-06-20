"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useSession } from "@/lib/use-session";

const AWS_REGIONS_DEFAULT = ["us-east-1", "ap-south-1"];
const AWS_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-south-1", "ap-southeast-1", "ap-northeast-1",
  "eu-west-1", "eu-central-1", "ca-central-1",
];
const FRAMEWORKS = ["CIS AWS", "SOC 2", "DPDP", "NIST 800-53", "ISO 27001", "PCI-DSS"];

type Step = "welcome" | "connect" | "alerts" | "done";
const STEPS: Step[] = ["welcome", "connect", "alerts", "done"];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: me } = useSWR(
    "/api/auth/me",
    (u: string) => fetch(u).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const [step, setStep]           = useState<Step>("welcome");
  const [label, setLabel]         = useState("");
  const [roleArn, setRoleArn]     = useState("");
  const [accountId, setAccountId] = useState("");
  const [extId, setExtId]         = useState("");
  const [regions, setRegions]     = useState<string[]>(AWS_REGIONS_DEFAULT);
  const [alertEmail, setAlertEmail] = useState(me?.email ?? "");
  const [framework, setFramework] = useState("CIS AWS");
  const [saving, setSaving]       = useState(false);
  const [credError, setCredError] = useState<string | null>(null);

  const stepIdx = STEPS.indexOf(step);

  function toggleRegion(r: string) {
    setRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  async function saveCredential() {
    if (!roleArn) { next(); return; } // skip if empty
    setSaving(true); setCredError(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "aws", label: label || "My AWS Account", role_arn: roleArn, account_id: accountId, external_id: extId, regions }),
      });
      if (!res.ok) throw new Error("Failed to save");
      next();
    } catch {
      setCredError("Could not save — you can add credentials later from Settings.");
      next();
    } finally {
      setSaving(false);
    }
  }

  function next() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }

  function finish() {
    if (typeof window !== "undefined") localStorage.setItem("trico_onboarded", "1");
    router.push("/dashboard");
  }

  const percent = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4">

      {/* Progress bar */}
      <div className="w-full max-w-xl mb-8">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Setup</span>
          <span className="text-[10px] font-mono text-zinc-600">{stepIdx + 1} / {STEPS.length}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-xl space-y-6">

        {/* ── Step 1: Welcome ─────────────────────────────────────────────── */}
        {step === "welcome" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-700 to-cyan-700 mx-auto flex items-center justify-center">
              <span className="text-2xl font-black text-white">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-50">Welcome to Tricognita</h1>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                ARIA-powered cloud security for AWS. This 3-step setup connects your account,
                sets up alerts, and starts your first scan. Takes about 2 minutes.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { icon: "🔍", label: "Connect AWS" },
                { icon: "🔔", label: "Alert email" },
                { icon: "🚀", label: "Start scanning" },
              ].map(({ icon, label }) => (
                <div key={label} className="rounded-xl bg-zinc-800/60 p-3 space-y-1">
                  <p className="text-xl">{icon}</p>
                  <p className="text-[10px] text-zinc-400">{label}</p>
                </div>
              ))}
            </div>
            {/* Trust reassurance row */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 grid grid-cols-3 gap-2 text-left">
              {[
                { dot: "bg-emerald-500", t: "Tenant-isolated",     s: "Your data is scoped to your tenant." },
                { dot: "bg-emerald-500", t: "Read-only by default", s: "No writes until you opt in." },
                { dot: "bg-violet-500",  t: "Observe Mode",         s: "ARIA watches; you approve actions." },
              ].map(r => (
                <div key={r.t} className="flex items-start gap-2">
                  <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.dot}`} />
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-200">{r.t}</p>
                    <p className="text-[10px] text-zinc-500 leading-snug">{r.s}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={next} className="w-full py-3 text-sm font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-xl transition-colors">
              Get started →
            </button>
            <button onClick={finish} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Skip setup, go to dashboard
            </button>
          </div>
        )}

        {/* ── Step 2: Connect AWS ─────────────────────────────────────────── */}
        {step === "connect" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-zinc-50">Connect your AWS account</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Create a cross-account IAM role so ARIA can scan your resources read-only.
              </p>
            </div>

            <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 p-3 text-xs text-zinc-400 leading-relaxed">
              <span className="text-zinc-300 font-semibold">Quick setup:</span>{" "}
              In AWS Console → IAM → Create Role → Trusted entity:{" "}
              <code className="text-violet-400 font-mono">arn:aws:iam::123456789012:root</code>{" "}
              → Attach <code className="text-violet-400">ReadOnlyAccess</code> + <code className="text-violet-400">SecurityAudit</code>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Account label</label>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Production" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">IAM Role ARN <span className="text-violet-400">*</span></label>
                <input value={roleArn} onChange={e => setRoleArn(e.target.value)} placeholder="arn:aws:iam::123456789012:role/TricognitaReadOnly" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">AWS Account ID</label>
                  <input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="123456789012" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">External ID</label>
                  <input value={extId} onChange={e => setExtId(e.target.value)} placeholder="optional" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Regions</label>
                <div className="flex flex-wrap gap-1.5">
                  {AWS_REGIONS.map(r => (
                    <button key={r} type="button" onClick={() => toggleRegion(r)}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${regions.includes(r) ? "bg-violet-700/60 text-violet-200 ring-1 ring-violet-600" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {credError && <p className="text-xs text-amber-400">{credError}</p>}

            <div className="flex gap-3">
              <button onClick={next} className="flex-1 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-xl transition-colors">
                Skip for now
              </button>
              <button onClick={saveCredential} disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white rounded-xl transition-colors">
                {saving ? "Connecting…" : "Connect & continue →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Alerts ──────────────────────────────────────────────── */}
        {step === "alerts" && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-zinc-50">Set up alert notifications</h2>
              <p className="text-xs text-zinc-500 mt-1">
                ARIA will email you when it detects critical findings or takes autonomous actions.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Alert email</label>
                <input
                  type="email"
                  value={alertEmail || me?.email || ""}
                  onChange={e => setAlertEmail(e.target.value)}
                  placeholder="security@yourcompany.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Primary compliance framework</label>
                <div className="grid grid-cols-3 gap-2">
                  {FRAMEWORKS.map(f => (
                    <button key={f} type="button" onClick={() => setFramework(f)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${framework === f ? "bg-violet-700/60 text-violet-200 ring-1 ring-violet-600" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={next} className="flex-1 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-xl transition-colors">
                Skip
              </button>
              <button onClick={next}
                className="flex-1 py-2.5 text-sm font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-xl transition-colors">
                Save & continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ────────────────────────────────────────────────── */}
        {step === "done" && (
          <DoneStep finish={finish} framework={framework} />
        )}
      </div>
    </div>
  );
}

// ── Done step (filters card list by session role / modules) ───────────────────

function DoneStep({ finish, framework }: { finish: () => void; framework: string }) {
  const { role, modules } = useSession();

  const ALL_CARDS: Array<{ label: string; desc: string; href: string; module?: string; roles?: string[] }> = [
    { label: "Findings",     desc: "ARIA-detected misconfigurations",          href: "/dashboard/findings",     module: "Findings"     },
    { label: "Compliance",   desc: `${framework} posture score`,               href: "/dashboard/compliance",   module: "Compliance"   },
    { label: "Threat Intel", desc: "IOC lookup & MITRE ATT&CK",                href: "/dashboard/threat-intel", module: "Threat Intel" },
    { label: "K8s Audit",    desc: "CIS K8s benchmark scan",                   href: "/dashboard/k8s",          roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
    { label: "ARIA Console", desc: "Real-time policy + remediation engine",    href: "/dashboard/aria",         roles: ["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS"] },
    { label: "Settings",     desc: "Approval mode, alerts, integrations",      href: "/dashboard/settings",     roles: ["ADMIN", "SECOPS"] },
  ];

  function visible(card: typeof ALL_CARDS[number]): boolean {
    if (modules && modules.length > 0 && card.module) return modules.includes(card.module);
    if (card.roles && (!role || !card.roles.includes(role))) return false;
    return true;
  }

  const cards = ALL_CARDS.filter(visible).slice(0, 4);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-900/60 ring-2 ring-emerald-700/50 mx-auto flex items-center justify-center text-3xl">
        ✓
      </div>
      <div>
        <h2 className="text-xl font-bold text-zinc-50">You&apos;re all set.</h2>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          ARIA is ready. Your first scan will run in the next few minutes.
          You&apos;re in <span className="text-violet-300">Observe Mode</span> — read-only, tenant-isolated, no writes until you opt in.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left">
        {cards.map(item => (
          <a key={item.href} href={item.href}
            className="rounded-xl bg-zinc-800/60 border border-zinc-700 p-3 hover:border-violet-700/50 transition-colors group">
            <p className="text-xs font-semibold text-zinc-200 group-hover:text-violet-300 transition-colors">{item.label}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{item.desc}</p>
          </a>
        ))}
      </div>
      <button onClick={finish}
        className="w-full py-3 text-sm font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-xl transition-colors">
        Go to dashboard →
      </button>
    </div>
  );
}
