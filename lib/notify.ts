/**
 * lib/notify.ts — Tricognita Centralized Notification Dispatcher
 *
 * Handles two notification channels simultaneously:
 *   1. In-app: Pushes an event to Upstash Redis so the Admin dashboard
 *              NotificationCenter can poll and surface it in real-time.
 *   2. Email:  Sends an email via AWS SES using the project's existing
 *              AWS credentials. No additional keys required.
 *
 * Usage:
 *   await notify({
 *     type: "new_user",
 *     title: "New User Registered",
 *     body: "Alice (alice@co.com) signed up as VIEWER.",
 *     emailTo: [process.env.CONTACT_TO_EMAIL!],
 *     emailSubject: "[Tricognita] New User Registered",
 *     emailText: "...",
 *   });
 */

import { Redis } from "@upstash/redis";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotifyType =
  | "new_user"        // self-registration or admin invite
  | "user_updated"    // role change, status change
  | "new_contact"     // public contact form submission
  | "new_lead"        // founding access / marketing form
  | "scan_complete"   // cloud scan finished
  | "critical_finding"// CRITICAL severity finding detected
  | "action_approved" // ARIA remediation action approved
  | "action_rejected" // ARIA remediation action rejected
  | "jit_approved"    // Zero-trust JIT access approved
  | "jit_rejected"    // Zero-trust JIT access rejected
  | "jit_requested"   // Zero-trust JIT access requested (needs admin attention)
  | "healing_mode"    // ARIA healing mode changed
  | "api_key_created" // new API key generated
  | "incident"        // security incident
  | "info";           // generic informational

export interface NotifyPayload {
  /** Event type — maps to an icon/colour in the dashboard */
  type: NotifyType;
  /** Short headline shown in the notification bell */
  title: string;
  /** Longer description shown in the notification panel */
  body: string;
  /**
   * Tenant ownership of the event. When set, the event is also written to
   * `tricognita:notifications:tenant:{tenantId}` so non-ADMIN users of that
   * tenant can see it via /api/notifications. When omitted, the event is
   * considered platform-level (new contact, new lead, etc.) and only
   * platform ADMINs see it.
   *
   * Closes G1 from docs/SECURITY_TENANT_AUDIT.md — eliminates the
   * cross-tenant leakage risk where a non-admin of tenant A could see
   * notifications about tenant B.
   */
  tenantId?: string;
  /** Override the in-app notification's list key (default: tricognita:notifications:admin) */
  listKey?: string;
  /** Email recipients. If empty, no email is sent. */
  emailTo?: string[];
  /** Email subject line */
  emailSubject?: string;
  /** Plain-text email body */
  emailText?: string;
  /** HTML email body (optional) */
  emailHtml?: string;
}

// Canonical key names — exported so the reader (/api/notifications) and any
// future cleanup job use the same strings.
export const ADMIN_NOTIF_KEY = "tricognita:notifications:admin";
export function tenantNotifKey(tenantId: string): string {
  return `tricognita:notifications:tenant:${tenantId}`;
}

export interface EmailLog {
  id: string;
  type: NotifyType;
  from_email: string;
  to_email: string;
  subject: string;
  status: "sent" | "failed";
  error?: string;
  timestamp: string;
}

// ── Redis client (lazy singleton) ─────────────────────────────────────────────

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ── AWS SES client (lazy singleton) ───────────────────────────────────────────

let _ses: SESClient | null = null;
function getSES(): SESClient | null {
  if (_ses) return _ses;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  _ses = new SESClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: { accessKeyId, secretAccessKey },
  });
  return _ses;
}

function routeEmail(type: NotifyType): string {
  const SYSTEM_EVENTS = new Set([
    "scan_complete", "critical_finding", "action_approved", "action_rejected",
    "jit_approved", "jit_rejected", "jit_requested", "healing_mode",
    "api_key_created", "incident", "info"
  ]);
  
  if (SYSTEM_EVENTS.has(type)) {
    return "alerts@tricognita.com";
  }
  return "info@tricognita.com";
}

async function logEmail(redis: Redis | null, log: EmailLog) {
  if (!redis) return;
  try {
    await redis.lpush("tricognita:email:logs", JSON.stringify(log));
    await redis.ltrim("tricognita:email:logs", 0, 499); // keep latest 500 emails
  } catch (err) {
    console.error("[notify] Failed to persist email log:", err);
  }
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function notify(payload: NotifyPayload): Promise<void> {
  const { type, title, body, tenantId, listKey, emailTo, emailSubject, emailText, emailHtml } = payload;

  const event = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    body,
    tenant_id: tenantId ?? null,
    timestamp: new Date().toISOString(),
    read: false,
  };

  const redis = getRedis();

  // ── 1. In-app notification (Redis) ─────────────────────────────────────────
  // Tenant-scoped writes go to BOTH the tenant key (so non-ADMIN users of
  // that tenant see them) AND the admin key (so platform ADMINs see every
  // tenant's events from one place). Untenanted events (lead/contact form,
  // etc.) go to the admin key only.
  try {
    if (redis) {
      const payload = JSON.stringify(event);
      // If the caller pinned a specific key, honor it (legacy path).
      if (listKey) {
        await redis.lpush(listKey, payload);
        await redis.ltrim(listKey, 0, 199);
      } else {
        // Always write to admin key for cross-tenant ADMIN visibility.
        await redis.lpush(ADMIN_NOTIF_KEY, payload);
        await redis.ltrim(ADMIN_NOTIF_KEY, 0, 199);
        // Also write to tenant-scoped key when tenant context is known —
        // this is the leg that closes G1.
        if (tenantId) {
          const tKey = tenantNotifKey(tenantId);
          await redis.lpush(tKey, payload);
          await redis.ltrim(tKey, 0, 199);
        }
      }
    }
  } catch (err) {
    console.error("[notify] Redis push failed:", err);
  }

  // ── 2. Email via AWS SES with Retries & Fallback ───────────────────────────
  if (emailTo && emailTo.length > 0 && emailSubject) {
    const ses = getSES();
    let fromEmail = routeEmail(type);
    
    if (ses) {
      let attempts = 0;
      let success = false;
      let lastError = "";

      while (attempts < 3 && !success) {
        attempts++;
        try {
          await ses.send(new SendEmailCommand({
            Source: fromEmail,
            Destination: { ToAddresses: emailTo },
            Message: {
              Subject: { Data: emailSubject, Charset: "UTF-8" },
              Body: {
                Text: { Data: emailText || body, Charset: "UTF-8" },
                ...(emailHtml ? { Html: { Data: emailHtml, Charset: "UTF-8" } } : {}),
              },
            },
          }));
          success = true;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.error(`[notify] SES email failed (attempt ${attempts}):`, lastError);
          
          // If we fail on info@ and this is the last attempt, fallback to alerts@ if it's a critical system error.
          // Since system events already use alerts@, this fallback is mostly for ensuring delivery.
          if (attempts === 3 && fromEmail === "info@tricognita.com") {
            fromEmail = "alerts@tricognita.com";
            // One final Hail Mary attempt
            try {
              await ses.send(new SendEmailCommand({
                Source: fromEmail,
                Destination: { ToAddresses: emailTo },
                Message: {
                  Subject: { Data: `[FALLBACK] ${emailSubject}`, Charset: "UTF-8" },
                  Body: { Text: { Data: emailText || body, Charset: "UTF-8" } },
                },
              }));
              success = true;
            } catch (fallbackErr) {
              lastError = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            }
          } else {
            // Exponential backoff: 500ms, 1000ms
            await new Promise(res => setTimeout(res, attempts * 500));
          }
        }
      }

      // Log the result to Redis for tracking
      await logEmail(redis, {
        id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        from_email: fromEmail,
        to_email: emailTo.join(", "),
        subject: emailSubject,
        status: success ? "sent" : "failed",
        error: success ? undefined : lastError,
        timestamp: new Date().toISOString(),
      });

      if (!success) {
        // Emit critical alert into notification center about email pipeline failure
        await notify({
          type: "incident",
          title: "Email Dispatch Failed",
          body: `Failed to send email to ${emailTo[0]} after 3 attempts. Error: ${lastError}`,
        });
      }

    } else {
      console.warn(
        `[notify] AWS SES not configured. Email NOT sent.\n` +
        `  To: ${emailTo.join(", ")}\n` +
        `  Subject: ${emailSubject}`
      );
    }
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

const ADMIN_EMAIL = "alerts@tricognita.com";

export const notifyNewUser = (name: string, email: string, role: string) =>
  notify({
    type: "new_user",
    title: "New User Account Created",
    body: `${name} (${email}) joined as ${role}`,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita] New User: ${name}`,
    emailText: `A new user account has been created on Tricognita.\n\nName: ${name}\nEmail: ${email}\nRole: ${role}\nTime: ${new Date().toUTCString()}`,
  });

export const notifyUserInvited = (name: string, email: string, role: string, invitedByEmail: string) =>
  notify({
    type: "new_user",
    title: "Team Member Invited",
    body: `${invitedByEmail} invited ${name} (${email}) as ${role}`,
    emailTo: [ADMIN_EMAIL, email], // notify admin AND the invited user
    emailSubject: `[Tricognita] You've been invited to Tricognita`,
    emailText: `Hi ${name},\n\nYou have been invited to join Tricognita as a ${role}.\n\nPlease visit https://tricognita.com/login to set up your account.\n\nIf you have any questions, reply to this email.\n\nThe Tricognita Team`,
  });

export const notifyContactForm = (name: string, email: string, company: string, message: string) =>
  notify({
    type: "new_contact",
    title: "New Contact Form Submission",
    body: `${name} from ${company} (${email}) sent a message`,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita] New Contact: ${company}`,
    emailText: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}\n\nMessage:\n${message}`,
  });

export const notifyNewLead = (company: string, email: string, provider: string, size: string) =>
  notify({
    type: "new_lead",
    title: "New Founding Access Application",
    body: `${company} (${size} seats) applied — ${provider} — ${email}`,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita] Founding Lead: ${company}`,
    emailText: `New Founding Access application:\n\nCompany: ${company}\nEmail: ${email}\nCloud Provider: ${provider}\nTeam Size: ${size}\nTime: ${new Date().toUTCString()}\n\nReview the lead in the Admin Dashboard → Notifications.`,
  });

// All notification helpers below accept an optional trailing `tenantId`
// parameter. When provided, the event is written to both the admin key AND
// the per-tenant key so non-ADMIN users of that tenant see it via
// /api/notifications. Untenanted calls (legacy) still flow to admin-only.

export const notifyCriticalFinding = (title: string, resource: string, severity: string, riskScore: number, tenantId?: string) =>
  notify({
    type: "critical_finding",
    title: `⚠ ${severity} Finding Detected`,
    body: `${title} on ${resource} (Risk: ${riskScore})`,
    tenantId,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita ALERT] ${severity} Security Finding: ${title}`,
    emailText: `A ${severity} severity security finding has been detected.\n\nFinding: ${title}\nResource: ${resource}\nRisk Score: ${riskScore}\nTime: ${new Date().toUTCString()}\n\nLog in to your dashboard immediately to review and remediate:\nhttps://tricognita.com/dashboard/findings`,
  });

export const notifyActionApproved = (actionId: string, actionType: string, approvedBy: string, tenantId?: string) =>
  notify({
    type: "action_approved",
    title: "ARIA Action Approved",
    body: `${actionType} (${actionId}) approved by ${approvedBy}`,
    tenantId,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita] Action Approved: ${actionType}`,
    emailText: `An ARIA remediation action has been approved.\n\nAction ID: ${actionId}\nType: ${actionType}\nApproved By: ${approvedBy}\nTime: ${new Date().toUTCString()}`,
  });

export const notifyActionRejected = (actionId: string, actionType: string, rejectedBy: string, tenantId?: string) =>
  notify({
    type: "action_rejected",
    title: "ARIA Action Rejected",
    body: `${actionType} (${actionId}) rejected by ${rejectedBy}`,
    tenantId,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita] Action Rejected: ${actionType}`,
    emailText: `An ARIA remediation action has been rejected.\n\nAction ID: ${actionId}\nType: ${actionType}\nRejected By: ${rejectedBy}\nTime: ${new Date().toUTCString()}`,
  });

export const notifyJITRequested = (requester: string, resource: string, reason: string, tenantId?: string) =>
  notify({
    type: "jit_requested",
    title: "JIT Access Request",
    body: `${requester} requested access to ${resource}`,
    tenantId,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita] JIT Access Requested by ${requester}`,
    emailText: `A Zero-Trust JIT access request needs your approval.\n\nRequester: ${requester}\nResource: ${resource}\nReason: ${reason}\nTime: ${new Date().toUTCString()}\n\nReview and approve at:\nhttps://tricognita.com/dashboard/zero-trust`,
  });

export const notifyJITApproved = (requestId: string, approvedBy: string, requesterEmail?: string, tenantId?: string) =>
  notify({
    type: "jit_approved",
    title: "JIT Access Approved",
    body: `Request ${requestId} approved by ${approvedBy}`,
    tenantId,
    emailTo: requesterEmail ? [ADMIN_EMAIL, requesterEmail] : [ADMIN_EMAIL],
    emailSubject: `[Tricognita] Your JIT Access Request Was Approved`,
    emailText: `Your Zero-Trust JIT access request has been approved.\n\nRequest ID: ${requestId}\nApproved By: ${approvedBy}\nTime: ${new Date().toUTCString()}\n\nYour temporary access is now active. It will expire automatically per policy.`,
  });

export const notifyJITRejected = (requestId: string, rejectedBy: string, requesterEmail?: string, tenantId?: string) =>
  notify({
    type: "jit_rejected",
    title: "JIT Access Rejected",
    body: `Request ${requestId} rejected by ${rejectedBy}`,
    tenantId,
    emailTo: requesterEmail ? [ADMIN_EMAIL, requesterEmail] : [ADMIN_EMAIL],
    emailSubject: `[Tricognita] Your JIT Access Request Was Rejected`,
    emailText: `Your Zero-Trust JIT access request has been rejected.\n\nRequest ID: ${requestId}\nRejected By: ${rejectedBy}\nTime: ${new Date().toUTCString()}\n\nIf you believe this is a mistake, please contact your administrator.`,
  });

export const notifyHealingModeChange = (mode: string, changedBy: string, tenantId?: string) =>
  notify({
    type: "healing_mode",
    title: "ARIA Healing Mode Changed",
    body: `Mode set to ${mode} by ${changedBy}`,
    tenantId,
    emailTo: [ADMIN_EMAIL],
    emailSubject: `[Tricognita] ARIA Mode Changed to ${mode}`,
    emailText: `ARIA's healing mode has been changed.\n\nNew Mode: ${mode}\nChanged By: ${changedBy}\nTime: ${new Date().toUTCString()}\n\nIf this was unauthorized, please review your audit trail:\nhttps://tricognita.com/dashboard/audit-trail`,
  });

export const notifyScanComplete = (accountId: string, findingsCount: number, criticalCount: number, tenantId?: string) =>
  notify({
    type: "scan_complete",
    title: "Cloud Scan Complete",
    body: `${accountId}: ${findingsCount} findings (${criticalCount} critical)`,
    tenantId,
    emailTo: criticalCount > 0 ? [ADMIN_EMAIL] : [],
    emailSubject: criticalCount > 0
      ? `[Tricognita ALERT] Scan Complete — ${criticalCount} Critical Findings`
      : `[Tricognita] Scan Complete`,
    emailText: `Your cloud security scan has completed.\n\nAccount: ${accountId}\nTotal Findings: ${findingsCount}\nCritical Findings: ${criticalCount}\nTime: ${new Date().toUTCString()}\n\nView results:\nhttps://tricognita.com/dashboard/findings`,
  });
