import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { logRoute, withRequestContext } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telemetry/client-error
 *
 * Receives client-side error boundary triggers (dashboard/error.tsx,
 * app/error.tsx). Logs to the BFF observability layer for production
 * debugging. Does not write to the audit_logs table — these are
 * operational events, not security events.
 *
 * The client deliberately does NOT send raw error messages or stack
 * traces (those might contain user/tenant data); it sends the Next.js
 * `digest` token + the surface + a timestamp. The BFF log line links
 * the digest to the actor's tenant + email via the verified session,
 * which is what an on-call operator needs to triage.
 *
 * Authentication is best-effort: if no session is present, we still
 * accept the event but log it as anonymous (useful for unauthenticated
 * marketing-route crashes).
 */

interface ClientErrorBody {
  surface?: string;
  digest?: string | null;
  ts?: string;
  path?: string;
}

export async function POST(req: Request): Promise<Response> {
  return withRequestContext(req, async (ctx) => {
    const jar = await cookies();
    const session = await verifySession(jar.get(sessionCookieName())?.value);

    let body: ClientErrorBody = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is OK — the digest may be all the client has.
    }

    logRoute(ctx, "error", "client.error_boundary", {
      surface: typeof body.surface === "string" ? body.surface : "unknown",
      digest: typeof body.digest === "string" ? body.digest : null,
      client_ts: typeof body.ts === "string" ? body.ts : null,
      path: typeof body.path === "string" ? body.path : null,
      // Session-derived fields — never trust the client for these.
      actor_email: session?.email ?? null,
      tenant_id: session?.tenantId ?? null,
      actor_role: session?.role ?? null,
    });

    // Always 204 — the client fire-and-forgets; we don't want it to retry
    // a failed telemetry POST and create a feedback loop.
    return new Response(null, { status: 204 });
  });
}
