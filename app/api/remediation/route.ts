import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { logRoute, withRequestContext } from "@/lib/bff-log";
import { canDo, type Capability } from "@/lib/rbac";
import { DEFAULT_UPSTREAM_TIMEOUT_MS } from "@/lib/remediation-timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BFF proxy → this tenant's remediations.
//
// Two operations with two different capabilities, which is why the capability
// check lives here rather than in middleware: apiRequiredRoles matches by path
// prefix and cannot see the method, so it grants the coarse SECOPS tier and
// this route narrows it. Reading the queue is not the same permission as asking
// for a change to a customer's cloud.
//
// The browser never names a tenant and never holds a JIT token. Nothing in the
// body reaches the backend as authority: the Go handler resolves the account,
// region and resource from the tenant's own assessment records.

export async function GET(req: Request): Promise<Response> {
  return proxy(req, "GET", "/api/remediation", null);
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  return proxy(req, "POST", "/api/remediation", body, "requestRemediation");
}

async function proxy(
  req: Request,
  method: "GET" | "POST",
  upstreamPath: string,
  body: string | null,
  capability?: Capability,
  timeoutMs: number = DEFAULT_UPSTREAM_TIMEOUT_MS,
): Promise<Response> {
  return withRequestContext(req, async (ctx) => {
    const jar = await cookies();
    const session = await verifySession(jar.get(sessionCookieName())?.value);
    if (!session) {
      logRoute(ctx, "warn", "unauthenticated");
      return ctx.errorJson({ error: "authentication_required" }, 401);
    }
    if (capability && !canDo(session.role, capability)) {
      // Refused here, before the backend is touched. The backend enforces its
      // own scope as well; this is not the only gate, it is the first one.
      logRoute(ctx, "warn", "capability_denied", {
        tenant_id: session.tenantId,
        capability,
      });
      return ctx.errorJson({ error: "forbidden", message: `your role cannot ${capability}` }, 403);
    }

    const check = secretOrError();
    if (check instanceof Response) {
      logRoute(ctx, "error", "jit_not_configured");
      return ctx.respond(check);
    }
    const token = await getJitToken({
      sub: session.email,
      tenantId: session.tenantId,
      role: session.role,
    });

    const qs = new URL(req.url).searchParams.toString();
    try {
      const upstream = await fetch(`${GO_API}${upstreamPath}${qs ? "?" + qs : ""}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Initiated-By": session.email,
          "X-Request-ID": ctx.requestId,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body } : {}),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!upstream.ok) {
        logRoute(ctx, "warn", "upstream.non_ok", {
          tenant_id: session.tenantId,
          upstream_status: upstream.status,
        });
        return ctx.respond(upstream);
      }
      return ctx.respond(Response.json(await upstream.json()));
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logRoute(ctx, "error", "upstream.unreachable", {
        tenant_id: session.tenantId,
        detail,
      });
      // Never a fixture fallback. A remediation surface that cannot be reached
      // is unavailable, and pretending otherwise on a mutation path would be
      // the most damaging possible lie: the customer would believe a change
      // had been requested.
      return ctx.errorJson({ error: "backend_unreachable", detail }, 502);
    }
  });
}

export { proxy as remediationProxy };
