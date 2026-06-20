/**
 * lib/integrations/slack — first-party Slack adapter.
 *
 * Phase 12 — first-party integration. Customers paste their Slack
 * Incoming Webhook URL; we register it as a `webhook` subscription with a
 * Slack-Block-Kit formatter so events arrive as readable, actionable
 * messages instead of raw JSON.
 *
 * Slack workspace setup (for the customer):
 *   1. https://api.slack.com/apps → Create New App → From scratch
 *   2. Incoming Webhooks → Activate → Add New Webhook to Workspace
 *   3. Copy the https://hooks.slack.com/services/T.../B.../... URL
 *   4. Paste into /dashboard/integrations/slack and pick events
 *
 * This module provides:
 *   - SLACK_URL_PATTERN   — validates a paste before save
 *   - formatForSlack()    — converts a PlatformEvent → Block Kit payload
 *
 * The dispatcher (lib/webhook-dispatch.ts) doesn't know about Slack
 * directly — it just POSTs the event JSON. For Slack we override the
 * body via a "formatter" property on the subscription (future commit).
 * Today, the simpler approach is: customers pick "Slack" in the UI;
 * we mint a subscription with a `formatter: "slack"` flag and the
 * dispatcher reads the flag and routes through this formatter.
 *
 * For the v1 implementation we ship the FORMATTER + the URL VALIDATOR.
 * Wiring it into the dispatcher is one line (a conditional in
 * attemptDelivery) and is tracked in the integrations doc.
 */

import type { PlatformEvent } from "../events";

// Slack Incoming Webhook URLs always match this pattern.
// services/T<workspace>/B<channel>/<32-char secret>
export const SLACK_URL_PATTERN =
  /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]{20,}$/;

export function isValidSlackUrl(raw: string): boolean {
  return SLACK_URL_PATTERN.test(raw);
}

// Slack Block Kit block types we use.
interface SlackHeaderBlock {
  type: "header";
  text: { type: "plain_text"; text: string; emoji?: boolean };
}
interface SlackSectionBlock {
  type: "section";
  text?: { type: "mrkdwn"; text: string };
  fields?: Array<{ type: "mrkdwn"; text: string }>;
}
interface SlackContextBlock {
  type: "context";
  elements: Array<{ type: "mrkdwn"; text: string }>;
}
interface SlackDividerBlock {
  type: "divider";
}
type SlackBlock =
  | SlackHeaderBlock
  | SlackSectionBlock
  | SlackContextBlock
  | SlackDividerBlock;

export interface SlackPayload {
  text: string; // fallback for older clients + notifications
  blocks: SlackBlock[];
}

// ─── Per-event formatter ─────────────────────────────────────────────────────

interface FormatContext {
  event: PlatformEvent;
  /** Public dashboard URL — used for deep-link buttons. */
  dashboardBase: string;
}

/**
 * formatForSlack — converts a PlatformEvent into a Slack Block Kit
 * payload. Falls back to a generic format for unrecognized event types
 * so a new event type never breaks Slack delivery.
 */
export function formatForSlack(event: PlatformEvent): SlackPayload {
  const dashboardBase =
    process.env.NEXT_PUBLIC_DASHBOARD_BASE_URL ?? "https://tricognita.com";
  const ctx: FormatContext = { event, dashboardBase };

  switch (event.type) {
    case "scan.completed":
      return formatScanComplete(ctx);
    case "scan.failed":
      return formatScanFailed(ctx);
    case "finding.created":
      return formatFindingCreated(ctx);
    case "remediation.approved":
    case "remediation.executed":
      return formatRemediation(ctx, "approved");
    case "remediation.rejected":
      return formatRemediation(ctx, "rejected");
    case "incident.declared":
      return formatIncident(ctx);
    case "platform.degraded":
      return formatPlatformDegraded(ctx);
    case "platform.recovered":
      return formatPlatformRecovered(ctx);
    default:
      return formatGeneric(ctx);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function emoji(level: "good" | "warn" | "bad" | "info"): string {
  return (
    { good: ":white_check_mark:", warn: ":warning:", bad: ":rotating_light:", info: ":information_source:" }[level] ?? ":information_source:"
  );
}

function actorLine(event: PlatformEvent): string {
  if (!event.actor) return "_System_";
  return `\`${event.actor.email}\` · ${event.actor.role}`;
}

function tenantLine(event: PlatformEvent): string {
  return event.tenant_id ? `Tenant \`${event.tenant_id}\`` : "Platform-level";
}

function contextBlock(event: PlatformEvent): SlackContextBlock {
  const parts = [
    actorLine(event),
    tenantLine(event),
    `Event \`${event.id}\``,
  ];
  if (event.correlation_id) parts.push(`Request \`${event.correlation_id}\``);
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text: parts.join("  ·  ") }],
  };
}

// ── Per-event formatters ────────────────────────────────────────────────────

function formatScanComplete(ctx: FormatContext): SlackPayload {
  const e = ctx.event as PlatformEvent<"scan.completed">;
  const d = e.data;
  const isClean = d.findings_count === 0;
  const text = isClean
    ? `${emoji("good")} Scan ${d.scan_id} complete — environment clean`
    : `${emoji("warn")} Scan ${d.scan_id} complete — ${d.findings_count} findings`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Findings*\n${d.findings_count}` },
          { type: "mrkdwn", text: `*Critical*\n${d.critical_count}` },
          { type: "mrkdwn", text: `*High*\n${d.high_count}` },
          {
            type: "mrkdwn",
            text: `*Mode*\n${d.simulated ? "Simulated (backend offline)" : "Live"}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${ctx.dashboardBase}/dashboard/findings|View findings →>`,
        },
      },
      contextBlock(ctx.event),
    ],
  };
}

function formatScanFailed(ctx: FormatContext): SlackPayload {
  const e = ctx.event as PlatformEvent<"scan.failed">;
  const d = e.data;
  const text = `${emoji("bad")} Scan ${d.scan_id} failed (${d.reason})`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Reason:* ${d.reason}\n*Error:* \`${d.error}\`` },
      },
      contextBlock(ctx.event),
    ],
  };
}

function formatFindingCreated(ctx: FormatContext): SlackPayload {
  const e = ctx.event as PlatformEvent<"finding.created">;
  const d = e.data;
  const sevEmoji =
    d.severity === "CRITICAL" ? emoji("bad") : d.severity === "HIGH" ? emoji("warn") : emoji("info");
  const text = `${sevEmoji} ${d.severity} finding: ${d.title}`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Resource:* \`${d.resource}\`\n*Risk score:* ${d.risk_score}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${ctx.dashboardBase}/dashboard/findings?focus=${d.finding_id}|Open finding →>`,
        },
      },
      contextBlock(ctx.event),
    ],
  };
}

function formatRemediation(
  ctx: FormatContext,
  verb: "approved" | "rejected",
): SlackPayload {
  const e = ctx.event as PlatformEvent<"remediation.approved" | "remediation.rejected" | "remediation.executed">;
  const d = e.data;
  const text =
    verb === "approved"
      ? `${emoji("good")} Remediation ${verb}: ${d.action_type}`
      : `${emoji("warn")} Remediation ${verb}: ${d.action_type}`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Action:* \`${d.action_id}\`\n${d.target_arn ? `*Target:* \`${d.target_arn}\`` : ""}`,
        },
      },
      contextBlock(ctx.event),
    ],
  };
}

function formatIncident(ctx: FormatContext): SlackPayload {
  const e = ctx.event as PlatformEvent<"incident.declared">;
  const d = e.data;
  const sevEmoji =
    d.severity === "critical" ? emoji("bad") : d.severity === "major" ? emoji("warn") : emoji("info");
  const text = `${sevEmoji} Incident declared: ${d.title}`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Severity:* ${d.severity}\n*Scope:* ${d.scope}${
            d.affected_subsystem ? `\n*Subsystem:* \`${d.affected_subsystem}\`` : ""
          }`,
        },
      },
      contextBlock(ctx.event),
    ],
  };
}

function formatPlatformDegraded(ctx: FormatContext): SlackPayload {
  const e = ctx.event as PlatformEvent<"platform.degraded">;
  const text = `${emoji("bad")} Platform degraded`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: e.data.detail ? `*Detail:* \`${e.data.detail}\`` : "Platform status changed to degraded.",
        },
      },
      contextBlock(ctx.event),
    ],
  };
}

function formatPlatformRecovered(ctx: FormatContext): SlackPayload {
  const text = `${emoji("good")} Platform recovered`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      contextBlock(ctx.event),
    ],
  };
}

function formatGeneric(ctx: FormatContext): SlackPayload {
  // Fallback for any event type without a specific formatter.
  const text = `:link: ${ctx.event.type}`;
  return {
    text,
    blocks: [
      { type: "header", text: { type: "plain_text", text, emoji: true } },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "```" + JSON.stringify(ctx.event.data, null, 2).slice(0, 1500) + "```",
        },
      },
      contextBlock(ctx.event),
    ],
  };
}
