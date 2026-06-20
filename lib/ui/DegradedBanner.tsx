"use client";

import * as React from "react";
import { AlertTriangle, WifiOff, RefreshCw } from "lucide-react";
import type { PlatformPosture } from "../posture-state";
import { Button } from "./Button";
import { HStack } from "./Stack";
import { cn } from "./cn";

/**
 * DegradedBanner — full-width banner shown at the top of the dashboard
 * chrome when platform posture is "degraded" or "outage".
 *
 * Pulled from a single shared posture state so every route reads the
 * SAME signal — closes the "tab A green, tab B red" inconsistency.
 *
 * Intent:
 *   - "degraded" → amber, "reference data" tone. Reassuring; no panic.
 *   - "outage"   → ember, "we know" tone. Specific about what failed.
 *
 * Always includes:
 *   - clear language about what's broken
 *   - what the user CAN still do (read cached posture, read audit, etc.)
 *   - a retry affordance
 *   - the last-checked timestamp so the user knows the data isn't stale
 *
 * Caller is expected to render this conditionally based on
 * `posture.status !== "healthy"`. The banner is a fixed-height element;
 * dashboard pages should leave room at the top.
 */

interface Props {
  posture: PlatformPosture;
  onRetry?: () => void;
  /** Hide the dismiss button — used when the banner is structural. */
  hideDismiss?: boolean;
  /** Override the className for layout context. */
  className?: string;
}

export function DegradedBanner({
  posture,
  onRetry,
  hideDismiss = false,
  className,
}: Props) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  if (posture.status === "healthy") return null;

  const isOutage = posture.status === "outage";
  const icon = isOutage ? (
    <WifiOff size={14} className="text-[var(--ember-glow)]" />
  ) : (
    <AlertTriangle size={14} className="text-[var(--amber-clay)]" />
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "border-b px-6 py-2.5",
        isOutage
          ? "bg-[color-mix(in_oklch,var(--ember)_10%,transparent)] border-[color-mix(in_oklch,var(--ember)_25%,transparent)]"
          : "bg-[color-mix(in_oklch,var(--amber-clay)_10%,transparent)] border-[color-mix(in_oklch,var(--amber-clay)_25%,transparent)]",
        className,
      )}
    >
      <HStack gap="sm" align="center" justify="between" wrap>
        <HStack gap="sm" align="center" className="min-w-0">
          {icon}
          <div className="min-w-0">
            <p
              className={cn(
                "text-xs font-semibold",
                isOutage
                  ? "text-[var(--ember-glow)]"
                  : "text-[var(--amber-clay)]",
              )}
            >
              {posture.label}
            </p>
            <p className="text-[10px] text-[var(--stone-500)] mt-0.5">
              {isOutage
                ? "Live telemetry is unreachable. Findings, compliance, and audit views are operating on cached posture. Destructive actions are temporarily disabled."
                : "Live scan results are temporarily unavailable. The dashboard shows the most recent posture snapshot until the backend reconnects."}
              {posture.lastChecked && (
                <span className="ml-1 text-[var(--stone-600)]">
                  · last checked{" "}
                  {new Date(posture.lastChecked).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </HStack>
        <HStack gap="sm" align="center" className="shrink-0">
          {onRetry && (
            <Button
              variant="ghost"
              size="xs"
              icon={<RefreshCw size={10} />}
              onClick={onRetry}
            >
              Retry
            </Button>
          )}
          {!hideDismiss && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss platform status banner"
            >
              Dismiss
            </Button>
          )}
        </HStack>
      </HStack>
    </div>
  );
}
