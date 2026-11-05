import "server-only";
import { persistClientAuditEvent, type UpstreamSession } from "@/lib/bff-upstream";
import { secretOrError } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

/**
 * Records an action that happens in the BFF (sign-in, sign-out, password change)
 * in the organisation's audit trail, through the Go API. The actor and tenant are
 * the verified session's, never request input.
 *
 * Best effort by design: a failure is logged and reported to the caller as false,
 * but never turns a completed sign-in into an error. It is not silent: the log line
 * names the event, and the trail simply lacks the entry.
 */
export async function recordServerAuditEvent(
  session: UpstreamSession,
  type: string,
  metadata: Record<string, unknown> = {},
  requestId = "",
): Promise<boolean> {
  try {
    if (secretOrError() instanceof Response) {
      console.error(`[server-audit] ${type}: JIT secret not configured; event not recorded`);
      return false;
    }
    const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role as never });
    const result = await persistClientAuditEvent(
      { type, resource: "session", metadata },
      token,
      requestId || `srv-${Date.now().toString(36)}`,
    );
    if (!result.ok) console.error(`[server-audit] ${type}: not persisted (${result.reason})`);
    return result.ok;
  } catch (err) {
    console.error(`[server-audit] ${type}: ${err instanceof Error ? err.message : "failed"}`);
    return false;
  }
}
