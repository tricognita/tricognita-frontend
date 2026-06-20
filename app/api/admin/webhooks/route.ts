import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  createWebhook,
  deleteWebhook,
  isValidEventType,
  isValidWebhookUrl,
  listWebhooks,
  toggleWebhook,
  type WebhookEventType,
} from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Outbound webhook subscription CRUD.
 *
 * GET    /api/admin/webhooks                    — list this tenant's webhooks
 * POST   /api/admin/webhooks                    — create; secret returned ONCE
 * PATCH  /api/admin/webhooks?id=…&enabled=true  — enable/disable
 * DELETE /api/admin/webhooks?id=…               — remove
 *
 * Requires ADMIN OR SECOPS (alertRouting capability). Each webhook is
 * tenant-scoped at the BFF — the BFF passes session.tenantId to every
 * operation. A compromised browser cannot register a webhook against
 * another tenant.
 *
 * The full HMAC secret is returned ONLY on POST. Subsequent GETs return
 * just the 8-char prefix (so the customer can identify a webhook in
 * their secrets manager but cannot re-extract it from us).
 */

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN" && session.role !== "SECOPS") {
    logRoute(ctx, "warn", "webhooks.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const items = await listWebhooks(session.tenantId);
  return Response.json({ webhooks: items });
});

export const POST = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN" && session.role !== "SECOPS") {
    logRoute(ctx, "warn", "webhooks.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const body = (await req.json().catch(() => ({}))) as {
    label?: string;
    event_type?: string;
    target_url?: string;
  };
  if (!body.label || !body.event_type || !body.target_url) {
    return ctx.errorJson(
      { error: "label, event_type, target_url required" },
      400,
    );
  }
  if (!isValidEventType(body.event_type)) {
    return ctx.errorJson({ error: "unknown_event_type" }, 400);
  }
  const urlCheck = isValidWebhookUrl(body.target_url);
  if (!urlCheck.ok) {
    return ctx.errorJson(
      { error: "invalid_target_url", message: urlCheck.reason },
      400,
    );
  }

  const result = await createWebhook({
    tenant_id: session.tenantId,
    event_type: body.event_type as WebhookEventType,
    target_url: body.target_url,
    label: body.label,
    created_by: session.email,
  });
  if (!result) {
    logRoute(ctx, "error", "webhooks.create_failed", {
      tenant_id: session.tenantId,
    });
    return ctx.errorJson(
      { error: "redis_unavailable" },
      503,
    );
  }
  logRoute(ctx, "info", "webhooks.created", {
    tenant_id: session.tenantId,
    webhook_id: result.subscription.id,
    event_type: result.subscription.event_type,
  });
  // Full secret returned ONCE here. Caller's responsibility to store it.
  return Response.json(
    { subscription: result.subscription, secret: result.secret },
    { status: 201 },
  );
});

export const PATCH = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN" && session.role !== "SECOPS") {
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const enabledRaw = url.searchParams.get("enabled");
  if (!id || enabledRaw === null) {
    return ctx.errorJson({ error: "id + enabled required" }, 400);
  }
  // Defense-in-depth: confirm the webhook belongs to the caller's tenant
  // before mutating.
  const list = await listWebhooks(session.tenantId);
  if (!list.find((w) => w.id === id)) {
    return ctx.errorJson({ error: "not_found" }, 404);
  }
  const result = await toggleWebhook(id, enabledRaw === "true");
  if (!result) return ctx.errorJson({ error: "redis_unavailable" }, 503);
  logRoute(ctx, "info", "webhooks.toggled", {
    tenant_id: session.tenantId,
    webhook_id: id,
    enabled: result.enabled,
  });
  return Response.json(result);
});

export const DELETE = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN" && session.role !== "SECOPS") {
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return ctx.errorJson({ error: "id required" }, 400);
  const list = await listWebhooks(session.tenantId);
  if (!list.find((w) => w.id === id)) {
    return ctx.errorJson({ error: "not_found" }, 404);
  }
  const ok = await deleteWebhook(id, session.tenantId);
  if (!ok) return ctx.errorJson({ error: "delete_failed" }, 503);
  logRoute(ctx, "warn", "webhooks.deleted", {
    tenant_id: session.tenantId,
    webhook_id: id,
  });
  return Response.json({ deleted: true });
});
