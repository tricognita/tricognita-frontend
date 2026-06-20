import { GO_API } from "@/lib/jit-secret";
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
 *   - The forward to Go is best-effort with a short timeout. Failures
 *     log to the BFF observability layer so an operator can find them,
 *     but never bubble back to the user — auditing is a side-effect, not
 *     a precondition.
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

  logRoute(ctx, "info", "audit.client_event.accepted", {
    type: body.type,
    resource: auditRow.resource,
    tenant_id: session.tenantId,
  });

  // Best-effort forward to Go. The Go side does the actual write into the
  // hash-linked audit_logs table. If the backend is down, we still have the
  // BFF log line above as a fallback record.
  try {
    const upstream = await fetch(`${GO_API}/api/audit/client-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-ID": ctx.requestId,
      },
      body: JSON.stringify(auditRow),
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) {
      logRoute(ctx, "warn", "audit.client_event.upstream_non_ok", {
        upstream_status: upstream.status,
      });
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // 502 to the upstream isn't user-visible; the client fire-and-forgets.
    logRoute(ctx, "warn", "audit.client_event.upstream_unreachable", {
      detail,
    });
  }

  // Always succeed from the client's perspective — audit is best-effort.
  return Response.json({ accepted: true });
});
