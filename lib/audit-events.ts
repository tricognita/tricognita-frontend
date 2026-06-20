/**
 * lib/audit-events — client-side audit event helper.
 *
 * Emits a structured audit event for security-relevant user actions taken
 * in the dashboard. Each event flows:
 *
 *   browser  →  POST /api/audit/client-event  →  Go API audit_logs table
 *
 * The Go-side write goes through `LogAudit(userID, action, resource,
 * metadata)` (api/main.go) which inserts into audit_logs with hash-linking
 * via api/auditchain.go for tamper evidence.
 *
 * What to emit:
 *   - auth events            (login, logout, password change, MFA enable/disable)
 *   - role changes           (when an admin modifies another user's role)
 *   - remediation approvals  (operator approves/rejects an ARIA action)
 *   - scan execution         (manual fleet scan trigger from dashboard)
 *   - alert acknowledgements (operator marks an alert as triaged)
 *   - API key events         (key created, revoked)
 *   - tenant administration  (account changes, credential mgmt)
 *
 * What NOT to emit:
 *   - Read-only navigation (no business value in audit chain)
 *   - Filter/sort changes within a route (UI state, not auditable)
 *   - Failed network calls (those are in BFF logs by request_id already)
 *
 * Production behavior:
 *   - The fetch is fire-and-forget (await but catch all errors).
 *   - Failures don't block the user flow — auditing is best-effort from
 *     the client side; the BFF route is the authoritative writer.
 *   - Includes the swr-fetcher correlation id so the audit row and the
 *     BFF request log can be cross-referenced.
 */

import { newRequestId } from "./swr-fetcher";

export type AuditEventType =
  // Authentication lifecycle
  | "auth.login"
  | "auth.logout"
  | "auth.password_changed"
  | "auth.mfa_enabled"
  | "auth.mfa_disabled"
  | "auth.account_deleted"
  // Authorization / role administration
  | "role.changed"
  | "user.invited"
  | "user.removed"
  // Cloud account / credentials administration
  | "credentials.connected"
  | "credentials.removed"
  // Scan + remediation lifecycle
  | "scan.triggered"
  | "scan.completed"
  | "scan.failed"
  | "remediation.approved"
  | "remediation.rejected"
  | "remediation.executed"
  // Alert + finding handling
  | "alert.acknowledged"
  | "alert.dismissed"
  | "finding.suppressed"
  | "finding.resolved"
  // API key lifecycle
  | "api_key.created"
  | "api_key.revoked"
  // Alert routing
  | "alert_route.created"
  | "alert_route.removed"
  | "alert_route.toggled"
  // Healing mode / platform settings
  | "settings.healing_mode_changed"
  | "settings.aria_threshold_changed";

interface AuditEventPayload {
  type: AuditEventType;
  /** What the action targeted — finding id, ARN, role, etc. */
  resource?: string;
  /** Action-specific structured data. Stored verbatim in audit_logs.metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * emitAuditEvent — best-effort client-side audit log emission.
 *
 * Posts to /api/audit/client-event which authenticates the session and
 * forwards to the Go API. Returns void; never throws — auditing must
 * never block the user flow.
 *
 * The function is async only so callers may optionally await it; the
 * common pattern is fire-and-forget:
 *
 *   onClick={() => {
 *     revoke(key.id);
 *     emitAuditEvent({ type: "api_key.revoked", resource: key.id });
 *   }}
 */
export async function emitAuditEvent(payload: AuditEventPayload): Promise<void> {
  try {
    const requestId = newRequestId();
    await fetch("/api/audit/client-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({
        type: payload.type,
        resource: payload.resource,
        metadata: payload.metadata,
        // Browser-side context — useful for forensics. The BFF route adds
        // tenant_id + user_id from the session before writing to audit_logs.
        client_ts: new Date().toISOString(),
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      }),
      keepalive: true,
    });
  } catch {
    // Auditing is best-effort from the client. Failures are silent so they
    // never disrupt the user action that triggered them. The BFF route
    // logs its own failures via lib/bff-log.
  }
}
