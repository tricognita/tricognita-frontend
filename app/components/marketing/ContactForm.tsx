"use client";

import { useId, useState, type FormEvent } from "react";
import {
  CONTACT_INTENTS,
  CONTACT_TOPICS,
  contactCloudOptions,
  contactServiceOptions,
  effectiveIntent,
  leadPayload,
  serviceStateFor,
  type ContactCloud,
  type ContactIntent,
  type ContactPrefill,
  type ContactTopic,
} from "@/lib/marketing/contact";

/**
 * Contact and scoping-call form (Content Master §19, Rev B.1).
 *
 * Posts to the existing public /api/leads endpoint (no backend change); the
 * payload is built by lib/marketing/contact.ts. Service and cloud choices come
 * from the registry; a Launching service can only register interest, so the
 * intent follows the chosen service's state.
 */

const ROLES = ["Founder / CEO", "CTO / Head of Engineering", "Security", "Compliance", "Engineering", "Other"];
const ACCOUNTS = ["1", "2–5", "6–20", "More than 20", "Not sure"];
const DRIVERS = ["Customer security review", "SOC 2", "ISO 27001", "Internal", "Other"];

const FIELD =
  "w-full min-h-11 rounded-xl border border-hair bg-bg px-3 py-2.5 text-sm text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; name: string; email: string } | { kind: "error" };

export function ContactForm({ prefill }: { prefill: ContactPrefill }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [intent, setIntent] = useState<ContactIntent>(prefill.intent);
  const [serviceId, setServiceId] = useState<string>(prefill.serviceId ?? "");
  const [cloud, setCloud] = useState<string>(prefill.cloud ?? "");
  const [topic, setTopic] = useState<string>(prefill.topic ?? "");
  const ids = { intentNote: useId(), cloudNote: useId(), emailNote: useId(), error: useId() };

  const services = contactServiceOptions();
  const clouds = contactCloudOptions();
  const selectedService = services.find((s) => s.id === serviceId);
  const selectedCloud = clouds.find((c) => c.value === cloud);

  const cloudValue = (cloud || undefined) as ContactCloud | undefined;

  function chooseService(id: string) {
    setServiceId(id);
    setIntent((current) => effectiveIntent(current, id || undefined, cloudValue));
    if (id && !topic) setTopic("services");
  }

  function chooseCloud(value: string) {
    setCloud(value);
    setIntent((current) => effectiveIntent(current, serviceId || undefined, (value || undefined) as ContactCloud | undefined));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          leadPayload({
            intent,
            topic: (topic || undefined) as ContactTopic | undefined,
            serviceId: serviceId || undefined,
            cloud: cloudValue,
            source: prefill.source,
            name: get("name"),
            email: get("email"),
            organisation: get("organisation"),
            role: get("role"),
            accounts: get("accounts"),
            driver: get("driver"),
            message: get("message"),
          }),
        ),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState({ kind: "sent", name: get("name").split(" ")[0] ?? "", email: get("email") });
    } catch {
      setState({ kind: "error" });
    }
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-hair bg-surface p-6">
        <p className="text-base font-semibold text-fg">Thanks{state.name ? `, ${state.name}` : ""}.</p>
        <p className="mt-2 text-sm text-muted">
          {intent === "scoping"
            ? `We'll email you at ${state.email} to arrange a scoping call.`
            : `We'll reply to you at ${state.email}.`}
        </p>
      </div>
    );
  }

  const sending = state.kind === "sending";
  const serviceState = selectedService ? serviceStateFor(selectedService.id, cloudValue) : undefined;
  const launchingService = selectedService && serviceState !== "available";
  const cloudNotAvailable = selectedCloud?.servicesState && selectedCloud.servicesState !== "available";

  return (
    <form onSubmit={onSubmit} className="space-y-5" aria-describedby={state.kind === "error" ? ids.error : undefined}>
      {prefill.source && <input type="hidden" name="source" value={prefill.source} />}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-fg">What do you need?</span>
          <select
            name="intent"
            required
            className={FIELD}
            value={intent}
            onChange={(e) => setIntent(effectiveIntent(e.target.value as ContactIntent, serviceId || undefined, cloudValue))}
            aria-describedby={launchingService ? ids.intentNote : undefined}
          >
            {CONTACT_INTENTS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
          {launchingService && (
            <span id={ids.intentNote} className="block text-xs text-muted">
              {selectedService.name} is not yet bookable
              {cloudValue && selectedCloud && selectedService.state === "available" ? ` on ${selectedCloud.label}` : ""}: we&apos;ll
              register your interest rather than book it.
            </span>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">Service</span>
          <select name="service" className={FIELD} value={serviceId} onChange={(e) => chooseService(e.target.value)}>
            <option value="">Not sure yet</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.state === "available" ? s.name : `${s.name} — ${s.stateLabel}`}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">About</span>
          <select name="topic" className={FIELD} value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">Choose one (optional)</option>
            {CONTACT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">Name</span>
          <input name="name" required autoComplete="name" className={FIELD} maxLength={120} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">Work email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={FIELD}
            maxLength={200}
            aria-describedby={ids.emailNote}
          />
          <span id={ids.emailNote} className="block text-xs text-muted">
            We reply to this address.
          </span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">Organisation</span>
          <input name="organisation" required autoComplete="organization" className={FIELD} maxLength={200} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">Role</span>
          <select name="role" required className={FIELD} defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">Cloud environment</span>
          <select
            name="cloud"
            required
            className={FIELD}
            value={cloud}
            onChange={(e) => chooseCloud(e.target.value)}
            aria-describedby={cloudNotAvailable ? ids.cloudNote : undefined}
          >
            <option value="" disabled>
              Choose one
            </option>
            {clouds.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {cloudNotAvailable && (
            <span id={ids.cloudNote} className="block text-xs text-muted">
              {selectedCloud.label} support is being expanded; we&apos;ll confirm what applies to your environment.
            </span>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-fg">How many accounts, subscriptions or projects?</span>
          <select name="accounts" className={FIELD} defaultValue="">
            <option value="">Optional</option>
            {ACCOUNTS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-fg">What&apos;s driving this?</span>
          <select name="driver" className={FIELD} defaultValue="">
            <option value="">Optional</option>
            {DRIVERS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-fg">What do you need secured, and by when?</span>
        <textarea name="message" rows={4} className={FIELD} maxLength={1000} placeholder="For example, a customer review deadline." />
      </label>
      <div className="space-y-3">
        <button type="submit" className="btn-2026 btn-primary" disabled={sending}>
          {sending ? "Sending…" : intent === "scoping" ? "Request a scoping call" : "Send"}
        </button>
        <p className="text-xs text-muted">
          We use these details only to reply to you. See our{" "}
          <a href="/legal/privacy" className="underline underline-offset-2">
            Privacy policy
          </a>
          .
        </p>
        {state.kind === "error" && (
          <p id={ids.error} role="alert" className="text-sm" style={{ color: "var(--status-danger)" }}>
            Your request wasn&apos;t sent. Check your connection and try again, or email contact@tricognita.com.
          </p>
        )}
      </div>
    </form>
  );
}
