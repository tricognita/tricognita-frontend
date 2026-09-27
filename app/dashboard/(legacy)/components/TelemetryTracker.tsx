"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/use-session";

/**
 * TelemetryTracker — invisible component that emits client-side
 * navigation telemetry. Mounted once in the dashboard layout.
 *
 * Phase 16 product intelligence — captures page_view per navigation
 * with the destination path. Tenant + user identity come from the
 * verified session on the server side; the client never asserts a
 * tenant.
 *
 * What this does:
 *   - Emits page_view on every pathname change (deduped: a tab that
 *     re-mounts the layout doesn't double-fire for the same path).
 *
 * What this does NOT do:
 *   - Mouse / scroll tracking.
 *   - Time-on-page measurement (out of scope; aggregate engagement
 *     is computed server-side from page_view counts).
 *   - Cross-session fingerprinting.
 *
 * Failure mode: fetch errors are swallowed silently. Telemetry MUST
 * NOT break navigation.
 */
export function TelemetryTracker(): null {
  const { isAuthenticated, tenantId } = useSession();
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tenantId || !pathname) return;
    // De-dupe: only emit when pathname actually changes.
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const ctrl = new AbortController();
    fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "page_view",
        route: pathname,
      }),
      signal: ctrl.signal,
      // keepalive lets the request survive a navigation away — important
      // for the "user clicked away immediately" case which is the most
      // signal-rich engagement event.
      keepalive: true,
    }).catch(() => {
      /* fail-open */
    });

    return () => ctrl.abort();
  }, [isAuthenticated, tenantId, pathname]);

  return null;
}
