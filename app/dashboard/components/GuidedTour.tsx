"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

/**
 * GuidedTour — first-run / demo-mode walkthrough.
 *
 * Phase 20 — design partner activation. A lightweight 5-step
 * sequential overlay that introduces the platform to:
 *   - first-time users (auto-shown once, dismissible forever)
 *   - demo presenters (re-openable from the navigation)
 *
 * Persistence: a single localStorage key remembers dismissal.
 * Clearing it (or visiting in incognito) re-shows the tour.
 *
 * Design intent:
 *   - Doesn't anchor to DOM elements (would break on layout changes).
 *   - Each step is self-contained narrative + link.
 *   - Five steps, < 60 seconds to skim.
 *   - Skip button always visible.
 *
 * Not yet:
 *   - Element-anchored tooltips (Phase 21+ if pilots ask for it).
 *   - Branching paths (different tour for different role) — same role
 *     model is fine for the first version.
 */

const STORAGE_KEY = "tricognita.tour.dismissed_v1";

interface TourStep {
  title: string;
  body: React.ReactNode;
  cta?: { label: string; href: string };
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to Tricognita",
    body: (
      <>
        <p>
          A 60-second tour to orient you. Tricognita is a multi-tenant cloud
          security posture management platform with AI-assisted remediation.
        </p>
        <p>
          The dashboard renders against synthetic demo data — no real cloud
          connection is required to explore.
        </p>
      </>
    ),
  },
  {
    title: "Findings + attack graph",
    body: (
      <>
        <p>
          Start with <strong>Findings</strong> for the prioritized list, or{" "}
          <strong>Attack Graph</strong> to see how individual findings chain
          into reachable attack paths.
        </p>
        <p>
          The graph is where Tricognita earns its keep — a public bucket
          alone is a finding; the same bucket reachable through admin IAM is
          an incident.
        </p>
      </>
    ),
    cta: { label: "Open Findings", href: "/dashboard/findings" },
  },
  {
    title: "Workflow: SOC + queue + incidents",
    body: (
      <>
        <p>
          <strong>SOC</strong> is the morning triage view — active incidents
          and critical findings on one screen.
        </p>
        <p>
          <strong>Queue</strong> is the prioritized analyst work list. Items
          carry SLA chips (informational) so aging stays visible.
        </p>
        <p>
          <strong>Incidents</strong> is the full lifecycle: declare → assign →
          acknowledge → escalate → resolve. Every operator action lands in
          the activity timeline.
        </p>
      </>
    ),
    cta: { label: "Open SOC view", href: "/dashboard/soc" },
  },
  {
    title: "Remediation with ARIA",
    body: (
      <>
        <p>
          ARIA proposes a fix for each finding: the action, the target
          resource, the predicted impact, and the rollback plan.
        </p>
        <p>
          By default, nothing runs without human approval. Autonomous mode is
          opt-in per tenant for narrow well-understood patterns only.
        </p>
      </>
    ),
    cta: { label: "Open ARIA", href: "/dashboard/aria" },
  },
  {
    title: "Reporting + exports",
    body: (
      <>
        <p>
          The <strong>Executive</strong> dashboard is the CISO-level 30-second
          read. The <strong>Exports</strong> page covers compliance PDFs,
          findings CSV, audit CSV, SIEM NDJSON, SOC 2 evidence pack.
        </p>
        <p>
          Webhook subscriptions push the same event stream to your Slack,
          SIEM, or ticketing system.
        </p>
      </>
    ),
    cta: { label: "Open Executive view", href: "/dashboard/executive" },
  },
];

interface Props {
  /** When true, ignore the dismissed flag and force the tour open. */
  forceOpen?: boolean;
  /** Callback when the tour closes (used by the "Reopen" affordance). */
  onClose?: () => void;
}

export function GuidedTour({ forceOpen, onClose }: Props): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Defer setState to the microtask queue so React Compiler doesn't
    // flag this as synchronous cascading render.
    const id = window.setTimeout(() => {
      if (forceOpen) {
        setOpen(true);
        setStepIndex(0);
        return;
      }
      try {
        const dismissed = window.localStorage.getItem(STORAGE_KEY);
        if (!dismissed) {
          setOpen(true);
          setStepIndex(0);
        }
      } catch {
        /* localStorage unavailable — just don't auto-open */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [forceOpen]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* swallow — user can still close */
    }
    setOpen(false);
    onClose?.();
  }, [onClose]);

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i >= STEPS.length - 1) {
        // Last step → dismiss.
        dismiss();
        return i;
      }
      return i + 1;
    });
  }, [dismiss]);

  if (!open) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Tricognita guided tour"
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--mist)] bg-[var(--ink)] p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-[var(--moss)] opacity-60">
            Step {stepIndex + 1} of {STEPS.length}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip tour"
            className="text-xs text-[var(--moss)] opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>

        <h2 className="mb-2 text-base font-semibold text-[var(--moss)]">
          {step.title}
        </h2>
        <div className="mb-4 space-y-2 text-sm text-[var(--moss)] opacity-90 [&_p]:leading-relaxed">
          {step.body}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs text-[var(--moss)] opacity-60 hover:opacity-100"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step.cta && (
              <Link
                href={step.cta.href}
                onClick={dismiss}
                className="rounded border border-[var(--mist)] px-3 py-1.5 text-xs text-[var(--moss)] hover:bg-[var(--stone)]"
              >
                {step.cta.label}
              </Link>
            )}
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded bg-[var(--matcha-500)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:opacity-90"
            >
              {isLast ? "Done" : "Next"}
              {!isLast && <ArrowRight size={12} />}
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`h-1 w-6 rounded-full ${
                i === stepIndex
                  ? "bg-[var(--matcha-500)]"
                  : i < stepIndex
                    ? "bg-[var(--moss)] opacity-40"
                    : "bg-[var(--mist)]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * resetGuidedTour — clears the dismissed flag, e.g., for an admin
 * "show tour" affordance or for a demo presenter starting a session.
 */
export function resetGuidedTour(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* swallow */
  }
}
