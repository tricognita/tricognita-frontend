import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { logRoute, withRequestContext } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BFF proxy → Go single signed evidence record (GET /api/assurance/evidence/:id).
export async function GET(
  req: Request,
  routeCtx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return withRequestContext(req, async (ctx) => {
    const { id } = await routeCtx.params;
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

    try {
      const upstream = await fetch(
        `${GO_API}/api/assurance/evidence/${encodeURIComponent(id)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Initiated-By": session.email,
            "X-Request-ID": ctx.requestId,
          },
          signal: AbortSignal.timeout(10000),
        },
      );
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
      return ctx.errorJson({ error: "backend_unreachable", detail }, 502);
    }
  });
}
