/**
 * lib/lifecycle — derived customer lifecycle stage per tenant.
 *
 * Phase 17 — customer lifecycle visibility. Translates usage signals
 * into a single stage label per tenant so the commercial admin
 * console can answer "which customers need attention?" without
 * reading raw counters.
 *
 * Stages (in order of maturity):
 *   signed_up   — tenant exists, no meaningful usage yet
 *   activating  — first scan completed but no integrations / no exports
 *   activated   — using core workflows (scans + at least one of:
 *                 export, webhook, incident workflow)
 *   engaged     — recurring multi-week usage across multiple
 *                 dimensions; the "happy customer" stage
 *   dormant     — was previously active but no usage for ≥30 days
 *   churning    — was previously active but no usage for ≥60 days
 *
 * This module is pure derivation — no Redis writes. Reads come from
 * usage-accounting (per-period counters) so the same data backs
 * both the customer's plan page and the commercial console.
 *
 * Honest by design: the thresholds are documented in
 * docs/PRICING_MODEL.md so customers can verify how their stage
 * is computed.
 */

import type { TenantUsageSummary } from "./usage-accounting";

export type LifecycleStage =
  | "signed_up"
  | "activating"
  | "activated"
  | "engaged"
  | "dormant"
  | "churning";

export interface LifecycleAssessment {
  stage: LifecycleStage;
  reasoning: string;
  /** Threshold-meeting signals — for the admin console UI. */
  signals: {
    has_scanned: boolean;
    has_exported: boolean;
    has_webhook: boolean;
    has_incident: boolean;
    has_remediation: boolean;
    months_with_usage: number;
  };
}

/**
 * deriveLifecycle — pure-function lifecycle stage from a usage history.
 *
 * Expects `history` to be ordered newest-first (current month at index 0)
 * with `months` >= 3 for accurate dormancy detection. If fewer months
 * are supplied, the assessment may be too optimistic (lifecycle
 * "dormant" requires ≥30 day gap detection).
 */
export function deriveLifecycle(
  history: TenantUsageSummary[],
): LifecycleAssessment {
  const current = history[0];
  const monthsWithUsage = history.filter((m) => totalActivity(m) > 0).length;

  const signals = {
    has_scanned: anyHas(history, "scans"),
    has_exported: anyHas(history, "exports"),
    has_webhook: anyHas(history, "webhooks_delivered"),
    has_incident: anyHas(history, "incidents_declared"),
    has_remediation: anyHas(history, "remediations_approved"),
    months_with_usage: monthsWithUsage,
  };

  // No usage anywhere — they signed up but haven't done anything.
  if (monthsWithUsage === 0) {
    return {
      stage: "signed_up",
      reasoning: "No recorded usage in trailing history.",
      signals,
    };
  }

  // Prior usage but current and last 1+ months are zero — dormant or churning.
  if (current && totalActivity(current) === 0) {
    const consecutiveZero = countLeadingZeros(history);
    if (consecutiveZero >= 2) {
      return {
        stage: "churning",
        reasoning: `Last ${consecutiveZero} months had zero usage despite prior activity.`,
        signals,
      };
    }
    return {
      stage: "dormant",
      reasoning: "Current month has zero usage; prior months had usage.",
      signals,
    };
  }

  // Activating: has scanned but no other meaningful surface yet.
  const hasOtherSurface =
    signals.has_exported ||
    signals.has_webhook ||
    signals.has_incident ||
    signals.has_remediation;
  if (signals.has_scanned && !hasOtherSurface) {
    return {
      stage: "activating",
      reasoning:
        "Scans started but no exports, webhooks, incidents, or remediations yet.",
      signals,
    };
  }

  // Engaged: at least 3 months of usage AND uses at least 3 distinct dimensions.
  const dimensionCount = countDimensions(signals);
  if (monthsWithUsage >= 3 && dimensionCount >= 3) {
    return {
      stage: "engaged",
      reasoning: `Recurring usage across ${monthsWithUsage} months and ${dimensionCount} workflow surfaces.`,
      signals,
    };
  }

  // Otherwise: activated (using core workflows but not yet "engaged" by tenure).
  return {
    stage: "activated",
    reasoning: `Using ${dimensionCount} workflow surface(s); needs sustained engagement to graduate.`,
    signals,
  };
}

function totalActivity(m: TenantUsageSummary): number {
  return Object.values(m.counters).reduce((a, b) => a + b, 0);
}

function anyHas(
  history: TenantUsageSummary[],
  dim: keyof TenantUsageSummary["counters"],
): boolean {
  return history.some((m) => (m.counters[dim] ?? 0) > 0);
}

function countLeadingZeros(history: TenantUsageSummary[]): number {
  let n = 0;
  for (const m of history) {
    if (totalActivity(m) === 0) n += 1;
    else break;
  }
  return n;
}

function countDimensions(signals: LifecycleAssessment["signals"]): number {
  return (
    (signals.has_scanned ? 1 : 0) +
    (signals.has_exported ? 1 : 0) +
    (signals.has_webhook ? 1 : 0) +
    (signals.has_incident ? 1 : 0) +
    (signals.has_remediation ? 1 : 0)
  );
}

/**
 * stageLabel — display-friendly label per stage.
 */
export const STAGE_LABELS: Record<LifecycleStage, string> = {
  signed_up: "Signed up",
  activating: "Activating",
  activated: "Activated",
  engaged: "Engaged",
  dormant: "Dormant",
  churning: "Churning",
};

/**
 * stageIntent — semantic intent for the UI badge.
 */
export const STAGE_INTENT: Record<
  LifecycleStage,
  "info" | "warning" | "success" | "danger"
> = {
  signed_up: "info",
  activating: "info",
  activated: "info",
  engaged: "success",
  dormant: "warning",
  churning: "danger",
};
