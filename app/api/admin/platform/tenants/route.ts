import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";
import { PLATFORM_TENANT } from "@/lib/tenant-assign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/platform/tenants  { name, slug, plan? }
 *
 * Creates the Go-side `tenants` row for a new customer. Without that row the Go
 * API fails closed for the tenant (api/dbtenant/resolve.go), so run this BEFORE
 * inviting the customer's first admin with `POST /api/auth/users { tenantId: slug }`.
 *
 * Gate: ADMIN of the platform tenant with an MFA-verified session. The Go API
 * re-checks all of this from the signed JIT claims; this route only refuses early.
 */
export const POST = authedRoute(async ({ ctx, session, token, req }) => {
  if (session.role !== "ADMIN" || session.tenantId !== PLATFORM_TENANT) {
    logRoute(ctx, "warn", "admin.platform.tenants.forbidden", { actor_role: session.role });
    return ctx.errorJson({ error: "platform_admin_only" }, 403);
  }
  let body: { name?: unknown; slug?: unknown; plan?: unknown };
  try {
    body = await req.json();
  } catch {
    return ctx.errorJson({ error: "invalid_json" }, 400);
  }
  const payload = {
    name: typeof body.name === "string" ? body.name.trim() : "",
    slug: typeof body.slug === "string" ? body.slug.trim() : "",
    plan: typeof body.plan === "string" ? body.plan : undefined,
  };

  let upstream: Response;
  try {
    upstream = await fetch(`${GO_API}/api/platform/tenants`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-ID": ctx.requestId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    logRoute(ctx, "error", "admin.platform.tenants.backend_unreachable");
    return ctx.errorJson({ error: "backend_unreachable" }, 502);
  }
  const text = await upstream.text();
  logRoute(ctx, upstream.ok ? "info" : "warn", "admin.platform.tenants.created", {
    status: upstream.status,
    slug: payload.slug,
  });
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
});
