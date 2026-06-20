import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  return authedRoute(async ({ ctx, session, token }) => {
    try {
      const upstream = await fetch(
        `${GO_API}/api/aria/jobs/${encodeURIComponent(id)}`,
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
        logRoute(ctx, "warn", "aria.job.upstream_non_ok", {
          tenant_id: session.tenantId,
          upstream_status: upstream.status,
          job_id: id,
        });
      }
      return upstream;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logRoute(ctx, "error", "aria.job.upstream_unreachable", {
        tenant_id: session.tenantId,
        job_id: id,
        detail,
      });
      return ctx.errorJson(
        { error: "backend_unreachable", message: "ARIA backend is offline.", detail },
        502,
      );
    }
  })(req);
}
