"use client";

import { useState } from "react";

export default function ContactContent() {
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
      if (!res.ok) {
        throw new Error("Failed to send message");
      }
      setStatus("sent");
    } catch {
      setError("Network error. Please try again later.");
      setStatus("error");
    }
  }

  return (
    <section className="max-w-3xl mx-auto px-6 pt-20 pb-24">
      <div className="text-center mb-10">
        <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-3">Contact Sales</p>
        <h1 className="text-4xl font-bold text-zinc-50 tracking-tight">Talk to a security architect.</h1>
        <p className="mt-4 text-sm text-zinc-400 max-w-xl mx-auto">
          Share a few details and we will respond within one business day with a scoped implementation agenda.
        </p>
      </div>

      {status === "sent" ? (
        <div className="rounded-2xl border border-violet-800/40 bg-violet-950/30 p-8 text-center">
          <h2 className="text-xl font-semibold text-zinc-50 mb-2">Thanks, {form.name.split(" ")[0]}.</h2>
          <p className="text-sm text-zinc-400">
            Your request is queued. A Tricognita architect will reach out shortly at{" "}
            <span className="text-violet-300 font-mono">{form.email}</span>.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Full name" id="name" value={form.name} onChange={(v) => update("name", v)} autoComplete="name" />
            <Field label="Work email" id="email" type="email" value={form.email} onChange={(v) => update("email", v)} autoComplete="email" />
          </div>
          <Field label="Company" id="company" value={form.company} onChange={(v) => update("company", v)} autoComplete="organization" />
          <div>
            <label htmlFor="message" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              What are you trying to solve?
            </label>
            <textarea
              id="message"
              rows={5}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Cloud providers, compliance scope, team size, timeline…"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <button disabled={status === "sending"} className="w-full bg-cyan-500 text-black font-bold py-4 rounded-xl text-lg hover:bg-cyan-400 transition-colors disabled:opacity-50">
            {status === "sending" ? "Sending…" : "Request Platform Access"}
          </button>
          <p className="text-[11px] text-zinc-600 text-center">
            By submitting, you agree to our privacy policy. We never share your information.
          </p>
        </form>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
    </div>
  );
}
