import { Redis } from "@upstash/redis";
import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";
import { queueDepth } from "@/lib/webhook-dispatch";
import { RELEASE } from "@/lib/release";
import { emitTelemetry } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/health-aggregate
 *
 * ADMIN-only aggregated platform health snapshot. Designed to drive
 * a single status pane in the ops console and to be the source of
 * truth for "is the platform healthy right now?" without operators
 * having to chase down five different endpoints.
 *
 * Distinct from /api/admin/deployment-verify: that endpoint is a
 * pass/fail boot-time check meant to gate deploys. This endpoint is
 * a runtime health snapshot that includes capacity signals (webhook
 * retry queue depth, dead-letter count) for ongoing monitoring.
 *
 * State model:
 *   ok        — every subsystem healthy
 *   degraded  — at least one subsystem warns (e.g. webhook queue >50)
 *   down      — at least one subsystem unreachable
 *
 * Subsystems:
 *   redis  — Upstash REST reachability
 *   go_api — Go backend /healthz reachability
 *   webhooks — queue depths within thresholds
 */

type Subsystem = "redis" | "go_api" | "webhooks";
type State = "ok" | "degraded" | "down";

interface SubsystemHealth {
  name: Subsystem;
  state: State;
  detail?: string;
  metrics?: Record<string, number | string>;
}

// Webhook health thresholds — deliberately conservative so an operator
// sees a degraded signal before the queue actually impacts deliveries.
const WEBHOOK_RETRY_WARN = 50;
const WEBHOOK_DEAD_LETTER_WARN = 25;

async function checkRedis(): Promise<SubsystemHealth> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { name: "redis", state: "down", detail: "not configured" };
  }
  const start = Date.now();
  try {
    const r = new Redis({ url, token });
    const pong = await Promise.race([
      r.ping(),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]);
    const latency = Date.now() - start;
    return {
      name: "redis",
      state: pong === "PONG" ? "ok" : "down",
      detail: `ping=${pong}`,
      metrics: { latency_ms: latency },
    };
  } catch (err) {
    return {
      name: "redis",
      state: "down",
      detail: err instanceof Error ? err.message : "unknown error",
      metrics: { latency_ms: Date.now() - start },
    };
  }
}

async function checkGoApi(): Promise<SubsystemHealth> {
  const start = Date.now();
  try {
    const res = await fetch(`${GO_API}/healthz`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      return {
        name: "go_api",
        state: "down",
        detail: `HTTP ${res.status}`,
        metrics: { latency_ms: latency },
      };
    }
    return {
      name: "go_api",
      state: latency > 1000 ? "degraded" : "ok",
      detail: latency > 1000 ? `slow (${latency}ms)` : "reachable",
      metrics: { latency_ms: latency },
    };
  } catch (err) {
    return {
      name: "go_api",
      state: "down",
      detail: err instanceof Error ? err.message : "unreachable",
      metrics: { latency_ms: Date.now() - start },
    };
  }
}

async function checkWebhooks(): Promise<SubsystemHealth> {
  const { retry, dead_letter } = await queueDepth();
  let state: State = "ok";
  const reasons: string[] = [];
  if (retry > WEBHOOK_RETRY_WARN) {
    state = "degraded";
    reasons.push(`retry queue depth ${retry} > ${WEBHOOK_RETRY_WARN}`);
  }
  if (dead_letter > WEBHOOK_DEAD_LETTER_WARN) {
    state = "degraded";
    reasons.push(`dead-letter count ${dead_letter} > ${WEBHOOK_DEAD_LETTER_WARN}`);
  }
  return {
    name: "webhooks",
    state,
    detail: reasons.join("; ") || "queues nominal",
    metrics: { retry_depth: retry, dead_letter_count: dead_letter },
  };
}

function rollup(subs: SubsystemHealth[]): State {
  if (subs.some((s) => s.state === "down")) return "down";
  if (subs.some((s) => s.state === "degraded")) return "degraded";
  return "ok";
}

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.health_aggregate.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  const [redis, goApi, webhooks] = await Promise.all([
    checkRedis(),
    checkGoApi(),
    checkWebhooks(),
  ]);
  const subsystems = [redis, goApi, webhooks];
  const overall = rollup(subsystems);

  logRoute(ctx, overall === "ok" ? "info" : "warn", "admin.health_aggregate", {
    overall,
    redis: redis.state,
    go_api: goApi.state,
    webhooks: webhooks.state,
  });
  emitTelemetry({
    type: "admin.health_aggregate_viewed",
    tenantId: session.tenantId,
    userEmail: session.email,
    role: session.role,
    data: { overall },
  });

  return Response.json({
    overall,
    release: {
      version: RELEASE.version,
      sha: RELEASE.sha,
      env: RELEASE.env,
    },
    subsystems,
    thresholds: {
      webhook_retry_warn: WEBHOOK_RETRY_WARN,
      webhook_dead_letter_warn: WEBHOOK_DEAD_LETTER_WARN,
      go_api_latency_warn_ms: 1000,
    },
    checked_at: new Date().toISOString(),
  });
});
