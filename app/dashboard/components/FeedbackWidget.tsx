"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/use-session";
import { Button } from "@/lib/ui/Button";

/**
 * FeedbackWidget — floating bottom-right launcher + popover capture form.
 *
 * Phase 15 — pilot/customer feedback. Always-available friction-capture
 * surface that sits on every dashboard page. Auto-captures:
 *   - current path (via usePathname)
 *   - viewport size (window dimensions at submit time)
 *   - timezone (Intl.DateTimeFormat resolved zone)
 *
 * Does NOT capture: cookies, localStorage, anything beyond what the
 * server already sees in the session.
 *
 * Hidden on the marketing site / unauthenticated routes — this is a
 * dashboard-only surface (mounted inside the dashboard layout).
 *
 * Design intent:
 *   - Out of the way until clicked.
 *   - Single-shot: open, type, send, gone. No long-lived state.
 *   - "Send" returns to a confirmation state for 2 seconds, then closes.
 *   - "Send failed (offline)" if the API returns 503 — surface honestly.
 */

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  onboarding: "Onboarding",
  workflow: "Workflow",
  ui_confusion: "UI confusion",
  integration: "Integration",
  deployment: "Deployment",
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);

type SubmitState = "idle" | "sending" | "sent" | "error";

export function FeedbackWidget(): React.JSX.Element | null {
  const { isAuthenticated } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("general");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Auto-close 2s after successful send.
  useEffect(() => {
    if (state !== "sent") return;
    const t = window.setTimeout(() => {
      setOpen(false);
      setMessage("");
      setState("idle");
    }, 2000);
    return () => window.clearTimeout(t);
  }, [state]);

  const submit = useCallback(async () => {
    if (!message.trim()) return;
    setState("sending");
    setErrMsg(null);
    try {
      const viewport =
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : undefined;
      const timezone =
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined;
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          page_path: pathname ?? "/",
          viewport,
          timezone,
        }),
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { message?: string; error?: string };
          detail = body.message ?? body.error ?? detail;
        } catch {
          /* leave the HTTP fallback */
        }
        setErrMsg(detail);
        setState("error");
        return;
      }
      setState("sent");
    } catch {
      setErrMsg("Network error — your feedback wasn't sent.");
      setState("error");
    }
  }, [category, message, pathname]);

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      {open ? (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="w-[320px] rounded-lg border border-[var(--mist)] bg-[var(--ink)] p-4 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-medium text-[var(--moss)]">
              Send feedback
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback"
              className="text-xs text-[var(--moss)] opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>

          <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--moss)] opacity-70">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={state === "sending" || state === "sent"}
            className="mb-3 w-full rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1 text-xs text-[var(--moss)]"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--moss)] opacity-70">
            What happened?
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={4000}
            disabled={state === "sending" || state === "sent"}
            placeholder="What's confusing, broken, or useful? Page + role are captured automatically."
            className="mb-2 w-full resize-none rounded border border-[var(--mist)] bg-[var(--stone)] px-2 py-1.5 text-xs text-[var(--moss)] placeholder:opacity-50"
          />
          <div className="mb-2 text-[10px] text-[var(--moss)] opacity-50">
            On <span className="font-mono">{pathname ?? "/"}</span> · {message.length}/4000
          </div>

          {state === "sent" ? (
            <div className="rounded border border-[var(--matcha-500)] bg-[var(--matcha-500)]/10 px-2 py-1.5 text-xs text-[var(--matcha-500)]">
              Sent. Thanks — we read every one.
            </div>
          ) : state === "error" ? (
            <div className="mb-2 rounded border border-[var(--ember)] bg-[var(--ember)]/10 px-2 py-1.5 text-xs text-[var(--ember)]">
              {errMsg ?? "Something went wrong."}
            </div>
          ) : null}

          {state !== "sent" && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={state === "sending"}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={submit}
                loading={state === "sending"}
                disabled={!message.trim() || state === "sending"}
              >
                Send
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          className="rounded-full border border-[var(--mist)] bg-[var(--ink)] px-3 py-1.5 text-xs font-medium text-[var(--moss)] shadow-lg hover:bg-[var(--stone)]"
        >
          Feedback
        </button>
      )}
    </div>
  );
}
