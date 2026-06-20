import { Redis } from "@upstash/redis";
import { GO_API } from "@/lib/jit-secret";
import { authedRoute, logRoute } from "@/lib/bff-log";
import { checkEnv } from "@/lib/env";
import { RELEASE } from "@/lib/release";
import { emitTelemetry } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/deployment-verify
 *
 * ADMIN-only post-deploy verification surface. Answers the question
 * "is this deploy ready to take production traffic?" with a structured
 * checklist that a deploy gate or operator can read in one glance.
 *
 * The companion `scripts/deploy-verify.sh` covers the Fly Go API side
 * (healthz + readyz + sentinel routes). This endpoint covers the BFF
 * side — env presence, secret length, Redis reachability, Go reach,
 * release identity. Together they form a two-sided deploy gate.
 *
 * Returns no secret values. Safe to log. Returns 200 even when checks
 * fail so the caller can read the structured result; the `ready` flag
 * is the boolean a deploy gate should key off.
 */

interface CheckRow {
  name: string;
  ok: boolean;
  detail?: string;
}

async function checkRedis(): Promise<CheckRow> {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { name: "redis", ok: false, detail: "URL/token not configured" };
  }
  try {
    const r = new Redis({ url, token });
    const pong = await Promise.race([
      r.ping(),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
    ]);
    return { name: "redis", ok: pong === "PONG", detail: `ping=${pong}` };
  } catch (err) {
    return {
      name: "redis",
      ok: false,
      detail: err instanceof Error ? err.message : "unknown error",
    };
  }
}

async function checkGoApi(): Promise<CheckRow> {
  try {
    const res = await fetch(`${GO_API}/healthz`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!res.ok) {
      return { name: "go_api", ok: false, detail: `HTTP ${res.status}` };
    }
    return { name: "go_api", ok: true, detail: `status=${res.status}` };
  } catch (err) {
    return {
      name: "go_api",
      ok: false,
      detail: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "admin.deployment_verify.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }

  const env = checkEnv();
  const [redis, goApi] = await Promise.all([checkRedis(), checkGoApi()]);

  const checks: CheckRow[] = [
    { name: "env_required", ok: env.required.every((r) => r.present && r.meets_min_length) },
    redis,
    goApi,
  ];

  const ready = checks.every((c) => c.ok);

  logRoute(ctx, ready ? "info" : "warn", "admin.deployment_verify", {
    ready,
    checks: checks.map((c) => ({ name: c.name, ok: c.ok })),
  });
  emitTelemetry({
    type: "admin.deployment_verified",
    tenantId: session.tenantId,
    userEmail: session.email,
    role: session.role,
    data: { ready },
  });

  return Response.json({
    ready,
    release: {
      version: RELEASE.version,
      sha: RELEASE.sha,
      branch: RELEASE.branch,
      env: RELEASE.env,
      deployed_at: RELEASE.deployedAt,
    },
    checks,
    env: {
      required: env.required,
      recommended: env.recommended,
      warnings: env.warnings,
    },
    checked_at: new Date().toISOString(),
  });
});
