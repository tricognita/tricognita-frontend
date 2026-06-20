import { Redis } from "@upstash/redis";
import { authedRoute, logRoute } from "@/lib/bff-log";
import { ADMIN_NOTIF_KEY } from "@/lib/notify";
import { recordUsage } from "@/lib/usage-accounting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/exports/siem.ndjson
 *
 * SIEM-compatible newline-delimited JSON stream. Designed for pull-mode
 * ingestion by Splunk Universal Forwarder, Microsoft Sentinel Custom
 * Logs ingestion, Elastic Filebeat, Datadog Logs Custom Endpoint, and
 * Google Chronicle UDM webhook.
 *
 * Output schema — one event per line, fields:
 *   {
 *     id, type, version, envelope_version,
 *     tenant_id, actor_email, actor_role,
 *     occurred_at, correlation_id,
 *     data: {...type-specific...}
 *   }
 *
 * The format is documented in docs/INTEGRATIONS.md so customers can
 * write parsers without trial-and-error.
 *
 * Tenant scoping:
 *   - ADMIN role: returns cross-tenant events (platform-operator view)
 *   - Other roles: returns ONLY their tenant's events
 *   Actually we restrict to ADMIN only for now — non-ADMIN cross-tenant
 *   semantics need product clarity first. Promoting to non-ADMIN is a
 *   future enhancement that requires per-tenant key scoping.
 *
 * Filtering (via query string):
 *   ?type=scan.completed     — single event type
 *   ?since=2026-05-22T00:00Z — events on or after this timestamp
 *   ?limit=1000              — cap output (default 1000, max 10000)
 *
 * The endpoint reads from the existing admin notification feed (the
 * cross-tenant Redis list maintained by lib/notify.ts). Until the Go API
 * exposes a real event store, this is the most-complete source we have.
 * Documented as such.
 */

interface AdminEventRaw {
  id: string;
  type: string;
  title?: string;
  body?: string;
  tenant_id?: string | null;
  timestamp?: string;
  actor?: { email: string; role: string } | null;
  correlation_id?: string | null;
  data?: unknown;
  version?: number;
  envelope_version?: number;
}

const MAX_LIMIT = 10_000;
const DEFAULT_LIMIT = 1_000;

export const GET = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "siem_export.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type");
  const since = url.searchParams.get("since");
  let limit = parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  if (Number.isNaN(limit) || limit <= 0) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const redisUrl =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const redisToken =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    return ctx.errorJson(
      { error: "events_store_unavailable", message: "Redis not configured" },
      503,
    );
  }

  let raw: Array<string | object> = [];
  try {
    const redis = new Redis({ url: redisUrl, token: redisToken });
    raw = (await redis.lrange(ADMIN_NOTIF_KEY, 0, limit - 1)) as Array<
      string | object
    >;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    logRoute(ctx, "error", "siem_export.redis_unreachable", { detail });
    return ctx.errorJson(
      { error: "events_store_unreachable", detail },
      502,
    );
  }

  // Parse, normalize to SIEM schema, apply filters.
  const sinceMs = since ? Date.parse(since) : null;
  const lines: string[] = [];
  let included = 0;

  for (const rec of raw) {
    const parsed = (typeof rec === "string"
      ? safeJson<AdminEventRaw>(rec)
      : (rec as AdminEventRaw)) ?? null;
    if (!parsed) continue;

    if (typeFilter && parsed.type !== typeFilter) continue;
    if (sinceMs !== null && parsed.timestamp) {
      const ts = Date.parse(parsed.timestamp);
      if (Number.isFinite(ts) && ts < sinceMs) continue;
    }

    const normalized = {
      id: parsed.id,
      type: parsed.type,
      version: parsed.version ?? 1,
      envelope_version: parsed.envelope_version ?? 1,
      tenant_id: parsed.tenant_id ?? null,
      actor_email: parsed.actor?.email ?? null,
      actor_role: parsed.actor?.role ?? null,
      occurred_at: parsed.timestamp ?? null,
      correlation_id: parsed.correlation_id ?? null,
      title: parsed.title ?? null,
      body: parsed.body ?? null,
      data: parsed.data ?? null,
    };
    lines.push(JSON.stringify(normalized));
    included++;
  }

  logRoute(ctx, "info", "siem_export.delivered", {
    included,
    total_seen: raw.length,
    type_filter: typeFilter,
    since,
  });

  recordUsage({
    tenantId: session.tenantId,
    dimension: "exports",
    userEmail: session.email,
  });

  return new Response(lines.join("\n") + (lines.length ? "\n" : ""), {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Tricognita-Event-Count": String(included),
      "X-Tricognita-Truncated": included === limit ? "true" : "false",
    },
  });
});

function safeJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
