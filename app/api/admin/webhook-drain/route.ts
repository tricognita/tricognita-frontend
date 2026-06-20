import { logRoute, withRequestContext } from "@/lib/bff-log";
import { drainRetryQueue } from "@/lib/webhook-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/webhook-drain
 *
 * Cron entry point that drains ready entries from the webhook retry
 * queue. Vercel Cron Jobs hits this on a schedule (vercel.json) every
 * minute. Each invocation processes up to 100 ready retries; if more
 * are pending, the next cron tick picks them up.
 *
 * Auth: simple shared-secret header. Vercel cron headers include
 * `Authorization: Bearer <CRON_SECRET>` where the secret is set in
 * Vercel env. Operator-triggered drains (e.g. from /admin/operations
 * "Drain now" button) use the same secret via a same-origin proxy.
 *
 * Not session-authed because cron isn't a user — it's the platform
 * itself. Wrong-auth requests get 401 + structured log entry.
 */

export async function POST(req: Request): Promise<Response> {
  return withRequestContext(req, async (ctx) => {
    const auth = req.headers.get("authorization") ?? "";
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      logRoute(ctx, "error", "webhook_drain.no_cron_secret");
      return ctx.errorJson(
        { error: "cron_not_configured" },
        503,
      );
    }
    if (auth !== `Bearer ${expected}`) {
      logRoute(ctx, "warn", "webhook_drain.unauth");
      return ctx.errorJson({ error: "unauthorized" }, 401);
    }

    const startedAt = Date.now();
    const processed = await drainRetryQueue();
    logRoute(ctx, "info", "webhook_drain.complete", {
      processed,
      duration_ms: Date.now() - startedAt,
    });
    return Response.json({ processed });
  });
}
