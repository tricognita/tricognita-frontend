import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  readAdminFeedback,
  updateFeedbackStatus,
  type FeedbackStatus,
} from "@/lib/feedback";
import { emitTelemetry } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET    /api/admin/feedback          — ADMIN-only cross-tenant inbox
 * PATCH  /api/admin/feedback?id=…&op=triage|resolve   — admin triage
 */

const VALID_OPS = new Set(["triage", "resolve"]);

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "feedback.admin.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const entries = await readAdminFeedback(200);
  logRoute(ctx, "info", "feedback.admin.list", { count: entries.length });
  return Response.json({ entries });
});

export const PATCH = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "feedback.admin.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const op = url.searchParams.get("op");
  if (!id || !op || !VALID_OPS.has(op)) {
    return ctx.errorJson({ error: "id + valid op required" }, 400);
  }
  const body = (await req.json().catch(() => ({}))) as { notes?: string };

  const nextStatus: FeedbackStatus = op === "triage" ? "triaged" : "resolved";
  const updated = await updateFeedbackStatus(id, nextStatus, session.email, body.notes);
  if (!updated) {
    return ctx.errorJson({ error: "not_found_or_redis_unavailable" }, 404);
  }
  logRoute(ctx, "info", "feedback.admin.update", {
    feedback_id: id,
    new_status: nextStatus,
  });
  emitTelemetry({
    type: "admin.feedback_triaged",
    tenantId: session.tenantId,
    userEmail: session.email,
    role: session.role,
    data: { new_status: nextStatus, original_category: updated.category },
  });
  return Response.json(updated);
});
