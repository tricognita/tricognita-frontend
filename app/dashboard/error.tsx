"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button, Card, EmptyState, VStack, HStack } from "@/lib/ui";

/**
 * Dashboard error boundary — Next.js App Router automatically wraps every
 * route segment with this component if it exists in the same directory.
 *
 * Triggered on:
 *   - Unhandled exceptions during render
 *   - Server Component errors during streaming
 *   - Unhandled rejections in client components within /dashboard/*
 *
 * Behavior:
 *   - Logs the error to the console + (best-effort) to the BFF for telemetry
 *   - Shows a calm, branded recovery UI — never exposes a stack trace
 *   - Offers a single "Retry" action that calls Next's reset() handler
 *   - Offers a "Back to overview" fallback that hard-navigates to /dashboard
 *
 * Demo safety: this boundary is the difference between a crashed component
 * showing a blank white screen mid-demo vs degrading to a controlled placeholder.
 */

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Console log for engineering visibility; never surfaces to the user.
    // eslint-disable-next-line no-console
    console.error("[dashboard:error-boundary]", {
      message: error.message,
      digest: error.digest,
    });

    // Best-effort BFF telemetry — fire-and-forget; ignore failures so this
    // error handler can never itself throw and re-trigger the boundary.
    if (typeof window !== "undefined") {
      fetch("/api/telemetry/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface: "dashboard",
          digest: error.digest ?? null,
          path:
            typeof window !== "undefined"
              ? window.location.pathname
              : null,
          // Deliberately NOT including the raw message or stack — those
          // might contain user/tenant data. The digest is the routing key.
          ts: new Date().toISOString(),
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [error]);

  return (
    <main className="min-h-[60vh] max-w-2xl mx-auto px-4 py-16 flex items-center">
      <Card variant="default" density="spacious" className="w-full">
        <VStack gap="lg" align="center">
          <EmptyState
            icon={<AlertOctagon size={32} className="text-[var(--ember-glow)]" />}
            title="Something went wrong loading this view."
            description="The error has been logged to our telemetry. You can retry the load, or return to the overview while we investigate."
            variant="default"
          />
          <HStack gap="sm" align="center" justify="center">
            <Button variant="primary" size="md" onClick={reset} icon={<RefreshCcw size={14} />}>
              Retry
            </Button>
            <Link href="/dashboard" prefetch={false}>
              <Button variant="ghost" size="md" icon={<Home size={14} />}>
                Back to overview
              </Button>
            </Link>
          </HStack>
          {error.digest && (
            <p className="text-[10px] font-mono text-[var(--stone-600)] mt-2">
              Reference: <span className="text-[var(--stone-500)]">{error.digest}</span>
            </p>
          )}
        </VStack>
      </Card>
    </main>
  );
}
