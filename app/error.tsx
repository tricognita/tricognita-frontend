"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * App-level error boundary — catches any unhandled exception in routes
 * NOT covered by a more specific boundary (the marketing routes,
 * /onboarding, /login, /register, /reset-password, /contact, etc.).
 *
 * Dashboard routes have their own boundary at app/dashboard/error.tsx
 * which renders inside the dashboard chrome; this top-level boundary
 * intentionally renders a stripped-down recovery surface that does NOT
 * depend on session, navigation, or any data-fetch — because by the time
 * this fires, we can't assume anything about app state.
 *
 * Behavior:
 *   - Logs the error to BFF telemetry (best-effort, fire-and-forget).
 *   - Surfaces the Next.js digest so customer-reported incidents can be
 *     correlated with BFF logs.
 *   - Offers a single "Retry" action via Next's reset() handler.
 *   - Offers a "Back to home" link as a fallback.
 *   - Deliberately uses inline CSS so it's resilient to a globals.css
 *     compilation failure.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app:error-boundary]", {
      message: error.message,
      digest: error.digest,
    });
    if (typeof window !== "undefined") {
      fetch("/api/telemetry/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface: "app",
          digest: error.digest ?? null,
          path:
            typeof window !== "undefined" ? window.location.pathname : null,
          ts: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [error]);

  return (
    <main
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        backgroundColor: "var(--ink, #0B0914)",
        color: "var(--stone-50, #F8F9FA)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "32rem",
          width: "100%",
          padding: "2rem",
          borderRadius: "12px",
          border: "1px solid var(--sage-soft, #1E183D)",
          backgroundColor: "var(--moss-rise, #1A1533)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "10px",
            fontFamily: "ui-monospace, monospace",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--matcha-300, #C4B5FD)",
            marginBottom: "0.5rem",
          }}
        >
          Unexpected error
        </p>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            margin: "0 0 0.5rem",
            color: "var(--stone-50, #F8F9FA)",
          }}
        >
          Something went wrong loading this page.
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--stone-400, #94A3B8)",
            lineHeight: 1.5,
            margin: "0 0 1.5rem",
          }}
        >
          The error has been logged. You can retry, or return to the home
          page while we investigate.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#fff",
              backgroundColor: "var(--matcha-600, #7C3AED)",
              border: "1px solid var(--matcha-700, #6D28D9)",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
          <Link
            href="/"
            prefetch={false}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "var(--stone-300, #CBD5E1)",
              backgroundColor: "transparent",
              border: "1px solid var(--sage-soft, #1E183D)",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            Back to home
          </Link>
        </div>
        {error.digest && (
          <p
            style={{
              fontSize: "10px",
              fontFamily: "ui-monospace, monospace",
              color: "var(--stone-600, #475569)",
              marginTop: "1rem",
            }}
          >
            Reference: <span style={{ color: "var(--stone-500, #64748B)" }}>{error.digest}</span>
          </p>
        )}
      </div>
    </main>
  );
}
