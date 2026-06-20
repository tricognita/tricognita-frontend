import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  readLeads,
  updateLeadStatus,
  type LeadStatus,
} from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET    /api/admin/leads          — ADMIN-only marketing-lead inbox
 * PATCH  /api/admin/leads?id=…&op=contacted|qualified|closed
 */

const VALID_OPS: Record<string, LeadStatus> = {
  contacted: "contacted",
  qualified: "qualified",
  closed: "closed",
};

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "leads.admin.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const entries = await readLeads(200);
  logRoute(ctx, "info", "leads.admin.list", { count: entries.length });
  return Response.json({ entries });
});

export const PATCH = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "leads.admin.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const op = url.searchParams.get("op");
  if (!id || !op || !(op in VALID_OPS)) {
    return ctx.errorJson({ error: "id + valid op required" }, 400);
  }
  const body = (await req.json().catch(() => ({}))) as { notes?: string };
  const next = VALID_OPS[op];
  const updated = await updateLeadStatus(id, next, session.email, body.notes);
  if (!updated) {
    return ctx.errorJson({ error: "not_found_or_redis_unavailable" }, 404);
  }
  logRoute(ctx, "info", "leads.admin.update", {
    lead_id: id,
    new_status: next,
  });
  return Response.json(updated);
});
