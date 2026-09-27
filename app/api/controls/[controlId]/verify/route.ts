import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { logRoute, withRequestContext } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BFF proxy → on-demand control verification ("Verify now").
//
// The browser never reaches the Go API directly. The tenant is taken from the
// verified session cookie and carried in a freshly minted JIT token; the
// specific resource is named only by the opaque id the product already
// showed this session on this same control (see safeResourceRef on the Go
// side) — the BFF is a pass-through for that id, never a place that resolves
// or trusts a raw identifier itself.
//
// Timeout: Go's own assessment path can legitimately run close to its
// internal 2-minute ceiling against a live cloud account. Reusing the ~15s
// budget read routes use would just recreate the exact BFF-timeout-vs-slow-
// backend failure already known from /api/evidence, for a call that is slow
// by design rather than by accident.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ controlId: string }> },
): Promise<Response> {
  const { controlId } = await params;
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
      const upstream = await fetch(
        `${GO_API}/api/controls/${encodeURIComponent(controlId)}/verify${qs ? "?" + qs : ""}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Initiated-By": session.email,
            "X-Request-ID": ctx.requestId,
          },
          signal: AbortSignal.timeout(130_000),
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
      // Never a fixture fallback: an unreachable backend is an unavailable
      // surface, not an empty one.
      return ctx.errorJson({ error: "backend_unreachable", detail }, 502);
    }
  });
}
