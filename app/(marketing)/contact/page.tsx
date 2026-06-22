"use client";

import { useState } from "react";
import Link from "next/link";

const TRUST_ITEMS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: "Security experts",
    desc: "Talk to experienced architects",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    label: "Quick response",
    desc: "We'll reply within 1 business day",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    label: "Your data is safe",
    desc: "We never share your information",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid work email.");
    if (!form.company.trim()) return setError("Company is required.");
    if (form.message.trim().length < 10) return setError("Tell us a bit more about your use case.");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("sent");
    } catch {
      setError("Network error. Please try again later.");
      setStatus("error");
    }
  }

  return (
    <div className="relative min-h-screen bg-[#05070A] overflow-hidden">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{
        background: [
          "radial-gradient(ellipse 800px 600px at 50% -10%, rgba(124,58,237,0.12), transparent 60%)",
          "radial-gradient(ellipse 500px 400px at 90% 60%, rgba(124,58,237,0.06), transparent 60%)",
        ].join(","),
      }} />

      <section className="max-w-3xl mx-auto px-6 pt-24 pb-28">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400 mb-4">
            Contact Sales
          </p>
          <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.06] mb-5">
            Talk to a security architect<span className="text-violet-400">.</span>
          </h1>
          <p className="text-zinc-400 text-base max-w-md mx-auto leading-relaxed">
            Share a few details and we&apos;ll get back to you within one business day with a scoped implementation agenda.
          </p>
        </div>

        {/* Trust row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {TRUST_ITEMS.map((t) => (
            <div key={t.label} className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
              <div className="w-8 h-8 rounded-lg bg-violet-950/60 border border-violet-800/40 flex items-center justify-center flex-shrink-0 text-violet-400 mt-0.5">
                {t.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-white mb-0.5">{t.label}</p>
                <p className="text-[11px] text-zinc-500 leading-snug">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form / Success */}
        {status === "sent" ? (
          <div className="rounded-2xl border border-violet-700/40 bg-violet-950/20 p-10 text-center"
            style={{ boxShadow: "0 0 60px rgba(124,58,237,0.1)" }}>
            <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-5">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-violet-300">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Thanks, {form.name.split(" ")[0]}.</h2>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Your request is queued. A Tricognita architect will reach out shortly at{" "}
              <span className="text-violet-300 font-mono">{form.email}</span>.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className="rounded-2xl border border-zinc-800/70 bg-[#0d0b18] p-7 space-y-5"
            style={{ boxShadow: "0 0 0 1px rgba(45,36,89,0.3), 0 32px 64px -16px rgba(0,0,0,0.6)" }}
          >
            {/* Row 1 */}
            <div className="grid md:grid-cols-2 gap-5">
              <InputField
                label="Full name"
                id="name"
                value={form.name}
                onChange={(v) => update("name", v)}
                placeholder="Enter your full name"
                autoComplete="name"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                }
              />
              <InputField
                label="Work email"
                id="email"
                type="email"
                value={form.email}
                onChange={(v) => update("email", v)}
                placeholder="name@company.com"
                autoComplete="email"
                icon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
                }
              />
            </div>

            {/* Row 2 */}
            <InputField
              label="Company"
              id="company"
              value={form.company}
              onChange={(v) => update("company", v)}
              placeholder="Enter your company name"
              autoComplete="organization"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="1"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>
              }
            />

            {/* Row 3 — Textarea */}
            <div>
              <label htmlFor="message" className="block text-[13px] font-medium text-zinc-300 mb-2">
                What are you trying to solve? <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-zinc-600 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </span>
                <textarea
                  id="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  placeholder="Cloud providers, compliance scope, team size, timeline..."
                  className="w-full rounded-xl bg-zinc-950/60 border border-zinc-700/60 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors resize-y"
                />
              </div>
            </div>

            {/* Privacy note */}
            <p className="flex items-center gap-2 text-[11px] text-zinc-600 justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Your information is confidential and will only be used by our team.
            </p>

            {/* Error */}
            {error && (
              <div role="alert" className="rounded-lg border border-rose-800/50 bg-rose-950/30 px-4 py-3 text-xs text-rose-300 flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "sending"}
              className="relative w-full py-4 rounded-xl font-bold text-base text-white overflow-hidden transition-all disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)",
                boxShadow: "0 0 32px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              {/* Shimmer */}
              <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-in-out" />
              <span className="relative flex items-center justify-center gap-2">
                {status === "sending" ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                    Sending…
                  </>
                ) : (
                  <>
                    Request Platform Access
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </>
                )}
              </span>
            </button>
          </form>
        )}

        {/* Footer note */}
        <p className="text-center text-[12px] text-zinc-600 mt-5">
          By submitting, you agree to our{" "}
          <Link href="/privacy" className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2">
            privacy policy
          </Link>
          . We never share your information.
        </p>
      </section>
    </div>
  );
}

function InputField({
  id, label, value, onChange, type = "text", placeholder, autoComplete, icon,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; autoComplete?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[13px] font-medium text-zinc-300 mb-2">
        {label} <span className="text-rose-400">*</span>
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-zinc-950/60 border border-zinc-700/60 pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
      </div>
    </div>
  );
}
