import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { logRoute, withRequestContext } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BFF proxy → the control catalogue with this tenant's current state.
//
// The browser never reaches the Go API directly. The tenant is taken from the
// verified session cookie and carried in a freshly minted JIT token, so a
// caller cannot name a tenant and the backend resolves it server-side.
export async function GET(req: Request): Promise<Response> {
  return withRequestContext(req, async (ctx) => {
    const jar = await cookies();
    const session = await verifySession(jar.get(sessionCookieName())?.value);
    if (!session) {
      logRoute(ctx, "warn", "unauthenticated");
      return ctx.errorJson({ error: "authentication_required" }, 401);
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
      const upstream = await fetch(`${GO_API}/api/controls${qs ? "?" + qs : ""}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Initiated-By": session.email,
          "X-Request-ID": ctx.requestId,
        },
        signal: AbortSignal.timeout(15000),
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
      // Never a fixture fallback: an unreachable backend is an unavailable
      // surface, not an empty one.
      return ctx.errorJson({ error: "backend_unreachable", detail }, 502);
    }
  });
}
