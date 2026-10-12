import { persistClientAuditEvent } from "@/lib/bff-upstream";
import { authedRoute, logRoute } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/audit/client-event
 *
 * Receives security-relevant audit events from the browser (see
 * lib/audit-events.ts for the catalog), enriches them with server-side
 * session context (tenantId, role), and forwards to the Go API's
 * LogAudit endpoint for hash-linked write into the audit_logs table.
 *
 * Defense-in-depth:
 *   - The client provides `type` + `resource` + `metadata`. The BFF
 *     IGNORES any client-supplied `actor_email`, `tenant_id`, or `role`
 *     — those come from the verified session only.
 *   - Event types are validated against a known allowlist; anything else
 *     is rejected so a compromised browser can't write arbitrary action
 *     names into the audit trail.
 *   - `accepted: true` is returned only after the Go API confirmed the write.
 *     A failed persistence is a 502 `audit_not_persisted` (and an error log),
 *     never a silent success. Browser callers stay fire-and-forget, so a
 *     failure does not block the user flow, but it is no longer hidden.
 */

const ALLOWED_EVENT_TYPES = new Set<string>([
  "auth.login",
  "auth.logout",
  "auth.password_changed",
  "auth.mfa_enabled",
  "auth.mfa_disabled",
  "auth.account_deleted",
  "role.changed",
  "user.invited",
  "user.removed",
  "credentials.connected",
  "credentials.removed",
  "scan.triggered",
  "scan.completed",
  "scan.failed",
  "remediation.approved",
  "remediation.rejected",
  "remediation.executed",
  "alert.acknowledged",
  "alert.dismissed",
  "finding.suppressed",
  "finding.resolved",
  "api_key.created",
  "api_key.revoked",
  "alert_route.created",
  "alert_route.removed",
  "alert_route.toggled",
  "settings.healing_mode_changed",
  "settings.aria_threshold_changed",
]);

interface ClientEvent {
  type?: string;
  resource?: string;
  metadata?: Record<string, unknown>;
  client_ts?: string;
  user_agent?: string;
}

export const POST = authedRoute(async ({ ctx, session, token, req }) => {
  let body: ClientEvent;
  try {
    body = await req.json();
  } catch {
    logRoute(ctx, "warn", "audit.client_event.bad_body");
    return ctx.errorJson({ error: "invalid_json" }, 400);
  }

  // Reject unknown event types to prevent log noise from compromised clients.
  if (typeof body.type !== "string" || !ALLOWED_EVENT_TYPES.has(body.type)) {
    logRoute(ctx, "warn", "audit.client_event.unknown_type", {
      type: body.type,
      tenant_id: session.tenantId,
    });
    return ctx.errorJson({ error: "unknown_event_type" }, 400);
  }

  // Audit row is keyed off the verified session, never the body. This is the
  // critical defense-in-depth invariant: a browser can suggest the event
  // *shape*, but the BFF determines WHO and WHICH TENANT.
  const auditRow = {
    actor_email: session.email,
    tenant_id: session.tenantId,
    actor_role: session.role,
    action: body.type,
    resource: body.resource ?? "",
    metadata: {
      ...(body.metadata ?? {}),
      client_ts: body.client_ts,
      user_agent: body.user_agent,
      request_id: ctx.requestId,
      bff_received_at: new Date().toISOString(),
    },
  };

  // The audit write must really happen. A failed or missing persistence is reported
  // (502) instead of acknowledged; the BFF log line is a diagnostic, not the record.
  const persisted = await persistClientAuditEvent(auditRow, token, ctx.requestId);
  if (!persisted.ok) {
    logRoute(ctx, "error", "audit.client_event.persist_failed", { reason: persisted.reason });
    return ctx.errorJson({ error: "audit_not_persisted" }, 502);
  }
  return Response.json({ accepted: true });
});
