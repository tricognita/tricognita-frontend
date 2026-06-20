"use client";

import { useCallback, useState } from "react";

/**
 * LeadForm — shared lead-capture form for marketing-site CTAs.
 *
 * Phase 20 — design partner funnel. Posts to the public /api/leads
 * endpoint. Used by /request-demo, /pilot-application, /waitlist,
 * and any future audience-specific landing.
 *
 * Design intent:
 *   - Single name + email field for waitlist (low friction).
 *   - Add company + role + use-case for demo + pilot (qualification).
 *   - Honest error state if the lead store is offline (so the visitor
 *     knows to email directly rather than assuming success).
 *   - Visible "sent" state with the message the API returned (handles
 *     both fresh-submission and deduped responses gracefully).
 */

type LeadKind = "request_demo" | "pilot_application" | "waitlist" | "contact";

type FieldSet = "minimal" | "qualified";

interface Props {
  kind: LeadKind;
  /** Headline shown above the form. */
  title: string;
  /** Subtitle below the title. */
  subtitle?: string;
  /** Which fields to render. "minimal" = name+email; "qualified" = + company/role/use-case. */
  fieldSet: FieldSet;
  /** Submit button label. */
  submitLabel: string;
  /** Optional one-line context message rendered above the form. */
  preamble?: string;
}

type State = "idle" | "sending" | "sent" | "error";

const CLOUD_OPTIONS = [
  { value: "", label: "—" },
  { value: "aws", label: "AWS" },
  { value: "azure", label: "Azure" },
  { value: "gcp", label: "GCP" },
  { value: "multi", label: "Multi-cloud" },
  { value: "unknown", label: "Not sure yet" },
];

export function LeadForm(props: Props): React.JSX.Element {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [useCase, setUseCase] = useState("");
  const [primaryCloud, setPrimaryCloud] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [state, setState] = useState<State>("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !email.trim()) return;
      setState("sending");
      setErrorMessage(null);
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: props.kind,
            name: name.trim(),
            email: email.trim(),
            company: company.trim() || undefined,
            role: role.trim() || undefined,
            use_case: useCase.trim() || undefined,
            context:
              primaryCloud || teamSize || timeframe
                ? {
                    primary_cloud: primaryCloud || undefined,
                    team_size: teamSize.trim() || undefined,
                    timeframe: timeframe.trim() || undefined,
                  }
                : undefined,
          }),
        });
        if (!res.ok) {
          let msg = `Something went wrong (${res.status}).`;
          try {
            const body = (await res.json()) as { message?: string; error?: string };
            msg = body.message ?? body.error ?? msg;
          } catch {
            /* keep fallback */
          }
          setErrorMessage(msg);
          setState("error");
          return;
        }
        const body = (await res.json()) as { message?: string };
        setServerMessage(body.message ?? "Thanks. We'll be in touch.");
        setState("sent");
      } catch {
        setErrorMessage("Network error. Please email founders@tricognita.com.");
        setState("error");
      }
    },
    [
      props.kind,
      name,
      email,
      company,
      role,
      useCase,
      primaryCloud,
      teamSize,
      timeframe,
    ],
  );

  const qualified = props.fieldSet === "qualified";

  if (state === "sent") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <div className="mb-2 text-lg font-medium text-emerald-300">
          Got it — thanks.
        </div>
        <div className="text-sm text-zinc-300">{serverMessage}</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">{props.title}</h2>
        {props.subtitle && (
          <p className="mt-1 text-sm text-zinc-400">{props.subtitle}</p>
        )}
      </div>

      {props.preamble && (
        <p className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
          {props.preamble}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Name" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={state === "sending"}
            className={inputClass}
            placeholder="Your name"
            maxLength={120}
          />
        </Field>
        <Field label="Work email" required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === "sending"}
            className={inputClass}
            placeholder="you@company.com"
            maxLength={200}
          />
        </Field>
      </div>

      {qualified && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Company">
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={state === "sending"}
                className={inputClass}
                placeholder="Your company"
                maxLength={200}
              />
            </Field>
            <Field label="Your role">
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={state === "sending"}
                className={inputClass}
                placeholder="CISO, Security Engineer, SOC Lead…"
                maxLength={200}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Primary cloud">
              <select
                value={primaryCloud}
                onChange={(e) => setPrimaryCloud(e.target.value)}
                disabled={state === "sending"}
                className={inputClass}
              >
                {CLOUD_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Team size">
              <input
                type="text"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
                disabled={state === "sending"}
                className={inputClass}
                placeholder="e.g. 5-20"
                maxLength={64}
              />
            </Field>
            <Field label="Timeframe">
              <input
                type="text"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                disabled={state === "sending"}
                className={inputClass}
                placeholder="e.g. this quarter"
                maxLength={64}
              />
            </Field>
          </div>

          <Field label="What are you trying to do?">
            <textarea
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={state === "sending"}
              className={inputClass}
              placeholder="What problem brought you here? What does success look like?"
            />
          </Field>
        </>
      )}

      {state === "error" && errorMessage && (
        <div className="rounded border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "sending" || !name.trim() || !email.trim()}
        className="w-full rounded bg-emerald-500 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : props.submitLabel}
      </button>

      <p className="text-center text-[11px] text-zinc-500">
        We'll only use your details to respond. We don't add you to any list.
      </p>
    </form>
  );
}

const inputClass =
  "w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none disabled:opacity-50";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-400">
        {label}
        {required && <span className="text-rose-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
