import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  CATEGORIES,
  readTenantFeedback,
  submitFeedback,
  type FeedbackCategory,
} from "@/lib/feedback";
import { emitTelemetry } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST   /api/feedback   — submit a feedback entry (any authenticated role)
 * GET    /api/feedback   — read the caller's TENANT's recent feedback
 *
 * Submission is tenant-scoped via session; the submitter cannot forge
 * a different tenant. The admin-wide inbox lives at /api/admin/feedback.
 *
 * Why this route is not ADMIN-only:
 *   The whole point of feedback is friction capture from non-admin
 *   users. Restricting submission to ADMIN would defeat it.
 */

const MAX_MESSAGE_LEN = 4000;
const VALID_CATEGORIES = new Set<FeedbackCategory>(CATEGORIES);

export const POST = authedRoute(async ({ ctx, session, req }) => {
  const body = (await req.json().catch(() => ({}))) as {
    category?: string;
    message?: string;
    page_path?: string;
    viewport?: string;
    timezone?: string;
  };

  const message = (body.message ?? "").toString().trim();
  if (!message) {
    return ctx.errorJson({ error: "message required" }, 400);
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return ctx.errorJson({ error: "message too long" }, 400);
  }

  const category = (body.category ?? "general") as FeedbackCategory;
  if (!VALID_CATEGORIES.has(category)) {
    return ctx.errorJson({ error: "invalid category" }, 400);
  }

  const pagePath = (body.page_path ?? "").toString().slice(0, 256);
  // User-agent comes from the request header (server-controlled), not the
  // body — the client cannot lie about it via the JSON body.
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const entry = await submitFeedback({
    tenantId: session.tenantId,
    userEmail: session.email,
    userRole: session.role,
    category,
    message,
    pagePath,
    userAgent,
    viewport: body.viewport,
    timezone: body.timezone,
  });

  if (!entry) {
    logRoute(ctx, "warn", "feedback.redis_unavailable", { category });
    return ctx.errorJson(
      {
        error: "feedback_store_offline",
        message:
          "Your feedback wasn't saved because the feedback store is offline. " +
          "Please email it to support instead.",
      },
      503,
    );
  }

  logRoute(ctx, "info", "feedback.submitted", {
    feedback_id: entry.id,
    category: entry.category,
    page_path: entry.page_path,
    message_length: entry.message.length,
  });

  // Telemetry — fire-and-forget; never blocks the response.
  emitTelemetry({
    type: "feedback.submitted",
    tenantId: session.tenantId,
    userEmail: session.email,
    role: session.role,
    route: entry.page_path,
    data: { category: entry.category },
  });

  return Response.json({ ok: true, id: entry.id }, { status: 201 });
});

export const GET = authedRoute(async ({ ctx, session }) => {
  const entries = await readTenantFeedback(session.tenantId, 50);
  logRoute(ctx, "info", "feedback.tenant_list", {
    count: entries.length,
  });
  return Response.json({ entries });
});
