import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Both routes are ADMIN-only — the platform-tenant administrator manages
// the organization registry. authedRoute already verifies session; we add
// an inline role check before doing any upstream work.

export const GET = authedRoute(async ({ ctx, session, token }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "organizations.forbidden", { actor_role: session.role });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  try {
    const upstream = await fetch(`${GO_API}/api/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Initiated-By": session.email,
        "X-Request-ID": ctx.requestId,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) {
      logRoute(ctx, "warn", "organizations.upstream_non_ok", {
        upstream_status: upstream.status,
      });
    }
    return upstream;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logRoute(ctx, "error", "organizations.upstream_unreachable", { detail });
    return ctx.errorJson(
      { error: "backend_unreachable", message: "Organizations registry is offline.", detail },
      502,
    );
  }
});

export const POST = authedRoute(async ({ ctx, session, token, req }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "organizations.forbidden", { actor_role: session.role });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const body = await req.json().catch(() => ({}));
  if (!body.name) {
    return ctx.errorJson({ error: "Organization name is required" }, 400);
  }
  try {
    const upstream = await fetch(`${GO_API}/api/organizations`, {
      method: "POST",
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
      logRoute(ctx, "warn", "organizations.create_upstream_non_ok", {
        upstream_status: upstream.status,
      });
    }
    return upstream;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logRoute(ctx, "error", "organizations.create_upstream_unreachable", { detail });
    return ctx.errorJson(
      { error: "backend_unreachable", message: "Organizations registry is offline.", detail },
      502,
    );
  }
});
