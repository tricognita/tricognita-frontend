"use client";

/**
 * lib/posture-state — shared client-side platform-posture context.
 *
 * Multiple dashboard surfaces (findings, compliance, attack graph, executive)
 * each derive their own "is the backend degraded?" signal from their own
 * SWR error state. That produces inconsistent UX — one tab shows a green
 * status while another shows a red one for the same root cause.
 *
 * usePlatformPosture is the single source of truth. It polls /api/healthz
 * once per minute and exposes:
 *   - status: "healthy" | "degraded" | "outage"
 *   - mode:   "live" | "demo" — Go API self-reported (informational)
 *   - lastChecked: ISO timestamp
 *
 * The DegradedBanner primitive (lib/ui/DegradedBanner.tsx) reads this
 * context and renders a single banner at the top of the dashboard chrome
 * when status !== healthy. Per-route surfaces should NOT render their own
 * "backend offline" banner — they should react to the shared posture.
 *
 * status derivation:
 *   "healthy"  — /api/healthz returned 200 with body.status === "healthy"
 *   "degraded" — /api/healthz returned 200 but body.mode === "demo" or
 *                body.status !== "healthy" (partial reachability)
 *   "outage"   — /api/healthz threw / non-2xx / timeout
 */

import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "./swr-fetcher";

export type PlatformStatus = "healthy" | "degraded" | "outage";

export interface PlatformPosture {
  status: PlatformStatus;
  mode: "live" | "demo" | "unknown";
  lastChecked: string | null;
  upstream?: string;
  /** Human label suitable for a status indicator. */
  label: string;
}

interface HealthzBody {
  status?: string;
  mode?: string;
  upstream?: string;
}

const POLL_INTERVAL_MS = 60_000;

/**
 * usePlatformPosture — read the shared posture state. Returns a stable
 * object so it's cheap to pass around. Components that re-render on
 * posture change should depend on `posture.status` directly.
 */
export function usePlatformPosture(): PlatformPosture {
  const { data, error } = useSWR<HealthzBody>("/api/healthz", fetcher, {
    refreshInterval: POLL_INTERVAL_MS,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const [lastChecked, setLastChecked] = useState<string | null>(null);
  useEffect(() => {
    if (data || error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastChecked(new Date().toISOString());
    }
  }, [data, error]);

  if (error) {
    return {
      status: "outage",
      mode: "unknown",
      lastChecked,
      label: "Platform unreachable — operating in degraded mode",
    };
  }

  if (!data) {
    return {
      status: "healthy",
      mode: "unknown",
      lastChecked,
      label: "Platform healthy",
    };
  }

  const isHealthy = data.status === "healthy" || data.status === "ok";
  const isFrontendOnly = data.status === "frontend_only";
  const isDemo = data.mode === "demo";

  // Frontend-only deployments (OSS showcase, demo environments) are a
  // valid deployment shape — not a degradation. Render healthy so the
  // dashboard doesn't spam a degraded banner. The "Live"/"Simulation Data"
  // badge on the AlertFeed itself is enough to signal data source.
  if (isFrontendOnly) {
    return {
      status: "healthy",
      mode: "demo",
      lastChecked,
      upstream: data.upstream,
      label: "Showcase mode — synthetic data",
    };
  }

  if (!isHealthy || isDemo) {
    return {
      status: "degraded",
      mode: isDemo ? "demo" : "live",
      lastChecked,
      upstream: data.upstream,
      label: isDemo
        ? "Reference data — live telemetry reconnecting"
        : `Platform degraded (status: ${data.status ?? "unknown"})`,
    };
  }

  return {
    status: "healthy",
    mode: "live",
    lastChecked,
    upstream: data.upstream,
    label: "Platform healthy",
  };
}
