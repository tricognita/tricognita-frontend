import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute, proxyRoute } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = proxyRoute("/api/aria/config/settings");

export const PUT = authedRoute(async ({ ctx, session, token, req }) => {
  const body = await req.json().catch(() => ({}));
  try {
    const upstream = await fetch(`${GO_API}/api/aria/config/settings`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Initiated-By": session.email,
        "X-Request-ID": ctx.requestId,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      logRoute(ctx, "warn", "settings.upstream_non_ok", {
        tenant_id: session.tenantId,
        upstream_status: upstream.status,
      });
    }
    return upstream;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logRoute(ctx, "error", "settings.upstream_unreachable", {
      tenant_id: session.tenantId,
      detail,
    });
    return ctx.errorJson(
      { error: "backend_unreachable", message: "Settings backend is offline.", detail },
      502,
    );
  }
});
