/**
 * lib/notification-routing — severity-based notification routing.
 *
 * Phase 13 — notification workflow routing. Decides what channels an
 * event flows to based on severity, type, and quiet-hours policy.
 * Sits between the event bus (lib/events.ts) and the actual dispatch
 * legs (notify.ts for email + in-app, webhook-dispatch.ts for webhooks).
 *
 * Design:
 *   - Pure functions: routes(event) returns a RoutingDecision; the
 *     caller does the actual fan-out.
 *   - Tenant-scoped: every routing decision keys off event.tenant_id.
 *   - Quiet-hours: optional per-tenant config that suppresses
 *     non-critical events outside business hours (typed but config
 *     loading is BFF-side; this module accepts the config as input).
 *   - Severity-based escalation chain: critical → page + email + Slack;
 *     major → email + Slack; minor → in-app only; info → in-app only.
 *
 * What this module does NOT do:
 *   - Send anything. Returns a decision; caller invokes dispatch.
 *   - Persist anything. Routing is stateless; acknowledgement tracking
 *     lives on the incident model itself.
 */

import type { PlatformEvent } from "./events";

// ─── Channels ────────────────────────────────────────────────────────────────

export type NotificationChannel =
  | "in_app"        // shows in /api/notifications feed
  | "email"         // routed via lib/notify.ts SES dispatch
  | "webhook"       // routed via lib/webhook-dispatch.ts (Slack/Jira/etc.)
  | "page";         // future: PagerDuty integration via webhook

export type RoutingSeverity = "critical" | "major" | "minor" | "info";

export interface RoutingDecision {
  channels: NotificationChannel[];
  severity: RoutingSeverity;
  /** Reason string surfaced in audit logs / debug output. */
  reason: string;
  /** When true, suppression applied — caller should NOT fire any channel. */
  suppressed: boolean;
}

// ─── Quiet hours config ─────────────────────────────────────────────────────

export interface QuietHoursConfig {
  /** IANA timezone (e.g. "Asia/Kolkata"). */
  timezone: string;
  /** Start hour in 24h local time (inclusive). */
  start_hour: number;
  /** End hour in 24h local time (exclusive). */
  end_hour: number;
  /** Severity threshold — events ≥ this are NEVER suppressed. */
  threshold: RoutingSeverity;
  /** Channels to suppress during quiet hours. Defaults to ["email", "webhook"]. */
  suppress_channels?: NotificationChannel[];
}

const RANK: Record<RoutingSeverity, number> = {
  info: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

/**
 * Returns true if the supplied date is within the quiet-hours window
 * for the given config. Handles wraparound (e.g. 22:00 → 07:00).
 */
function isQuietHour(now: Date, cfg: QuietHoursConfig): boolean {
  let hour: number;
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: cfg.timezone,
    });
    hour = parseInt(fmt.format(now), 10);
  } catch {
    // Bad timezone — fail open (don't suppress) to avoid silently dropping events.
    return false;
  }
  if (Number.isNaN(hour)) return false;
  if (cfg.start_hour === cfg.end_hour) return false;
  if (cfg.start_hour < cfg.end_hour) {
    return hour >= cfg.start_hour && hour < cfg.end_hour;
  }
  // Wraparound (e.g. 22 → 7): in quiet hours if hour >= start OR hour < end
  return hour >= cfg.start_hour || hour < cfg.end_hour;
}

// ─── Severity inference ─────────────────────────────────────────────────────

/**
 * Infer a routing severity from an event. Event-specific data takes
 * precedence (incidents carry their own severity); otherwise we map by
 * event type.
 */
export function inferSeverity(event: PlatformEvent): RoutingSeverity {
  // Incident events carry severity in payload.
  if (
    event.type === "incident.declared" ||
    event.type === "incident.acknowledged" ||
    event.type === "incident.resolved"
  ) {
    const sev = (event.data as { severity?: string }).severity;
    if (sev === "critical" || sev === "major" || sev === "minor" || sev === "info") {
      return sev;
    }
  }

  // Finding events: payload severity → routing severity.
  if (event.type === "finding.created") {
    const sev = (event.data as { severity?: string }).severity;
    if (sev === "CRITICAL") return "critical";
    if (sev === "HIGH") return "major";
    if (sev === "MEDIUM") return "minor";
    return "info";
  }

  // Scan / remediation / platform events default by type.
  if (event.type === "scan.failed" || event.type === "remediation.failed") {
    return "major";
  }
  if (event.type === "platform.degraded") return "major";
  if (event.type === "scan.completed" || event.type === "platform.recovered") {
    return "info";
  }
  if (
    event.type === "remediation.approved" ||
    event.type === "remediation.rejected" ||
    event.type === "remediation.executed" ||
    event.type === "remediation.proposed"
  ) {
    return "minor";
  }
  if (
    event.type === "credentials.connected" ||
    event.type === "credentials.removed" ||
    event.type === "api_key.created" ||
    event.type === "api_key.revoked" ||
    event.type === "settings.healing_mode_changed" ||
    event.type === "settings.aria_threshold_changed"
  ) {
    return "minor";
  }
  return "info";
}

// ─── Routing rules ──────────────────────────────────────────────────────────

/**
 * The base severity → channels map. Customizable in future per-tenant
 * config; for now, the platform default.
 */
const BASE_CHANNELS_BY_SEVERITY: Record<RoutingSeverity, NotificationChannel[]> = {
  critical: ["in_app", "email", "webhook", "page"],
  major: ["in_app", "email", "webhook"],
  minor: ["in_app", "webhook"],
  info: ["in_app"],
};

/**
 * routes(event, quietHours?) — compute the routing decision.
 *
 * The caller (typically a BFF route or worker) invokes the channels
 * returned. This module makes NO outbound calls.
 */
export function routes(
  event: PlatformEvent,
  quietHours?: QuietHoursConfig,
  now: Date = new Date(),
): RoutingDecision {
  const severity = inferSeverity(event);
  let channels = [...BASE_CHANNELS_BY_SEVERITY[severity]];
  let reason = `severity=${severity}`;
  let suppressed = false;

  // Apply quiet-hours suppression if configured AND event is below threshold.
  if (quietHours && RANK[severity] < RANK[quietHours.threshold]) {
    if (isQuietHour(now, quietHours)) {
      const suppress = quietHours.suppress_channels ?? ["email", "webhook"];
      channels = channels.filter((c) => !suppress.includes(c));
      reason = `${reason}, quiet_hours_applied`;
      // If we removed every channel, mark fully suppressed.
      if (channels.length === 0) suppressed = true;
    }
  }

  return { channels, severity, reason, suppressed };
}

/**
 * shouldEscalate — true when an event warrants automatic page-out.
 * Returns false for any event suppressed by quiet hours.
 */
export function shouldEscalate(event: PlatformEvent): boolean {
  const sev = inferSeverity(event);
  return sev === "critical";
}
