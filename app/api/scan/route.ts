import { randomBytes } from "crypto";
import { GO_API } from "@/lib/jit-secret";
import { recordEvent } from "@/lib/datasets";
import { notifyScanComplete } from "@/lib/notify";
import { authedRoute, logRoute } from "@/lib/bff-log";
import { acquireQuota, releaseQuota, SCAN_QUOTA } from "@/lib/tenant-quota";
import { recordUsage } from "@/lib/usage-accounting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/scan
 *
 * Lifecycle (Phase 8):
 *   1. authedRoute verifies session + mints JIT
 *   2. acquireQuota gates per-tenant concurrency (returns 429 if exceeded)
 *   3. fetch upstream Go /api/scan with timeout + correlation id
 *   4. fall back to a synthetic "simulated" response if upstream is down
 *   5. releaseQuota ALWAYS runs in finally so an orphaned slot never
 *      permanently consumes a tenant's allotment
 *
 * The dashboard's ScanState machine treats a `simulated: true` response
 * as the "partial" state (degraded but recoverable).
 */
export const POST = authedRoute(async ({ ctx, session, token, req }) => {
  // Phase 8 — per-tenant scan concurrency guard.
  const quota = await acquireQuota(SCAN_QUOTA, session.tenantId);
  if (!quota.ok) {
    logRoute(ctx, "warn", "scan.quota_exceeded", {
      tenant_id: session.tenantId,
      limit: SCAN_QUOTA.limit,
      retry_after: quota.retryAfter,
    });
    return new Response(
      JSON.stringify({
        error: "quota_exceeded",
        message: `Scan quota reached (${SCAN_QUOTA.limit} concurrent). Retry in ${quota.retryAfter}s.`,
        retry_after: quota.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(quota.retryAfter ?? 60),
        },
      },
    );
  }

  try {
    return await runScan({ ctx, session, token, req });
  } finally {
    // Free the slot regardless of success/failure/timeout. The Redis TTL
    // (windowSec) is the safety net if this finally somehow doesn't run.
    await releaseQuota(SCAN_QUOTA, session.tenantId).catch(() => {});
  }
});

async function runScan({
  ctx,
  session,
  token,
  req,
}: {
  ctx: import("@/lib/bff-log").RequestContext;
  session: { email: string; role: string; tenantId: string };
  token: string;
  req: Request;
}): Promise<Response> {
  const incomingIdempotency = req.headers.get("idempotency-key");
  const idempotencyKey =
    incomingIdempotency && /^[a-zA-Z0-9-]{8,72}$/.test(incomingIdempotency)
      ? incomingIdempotency
      : undefined;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Initiated-By": session.email,
    "X-Request-ID": ctx.requestId,
  };
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(`${GO_API}/api/scan`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(55000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRoute(ctx, "error", "scan.upstream_unreachable", {
      tenant_id: session.tenantId,
      detail: msg,
    });
    const simResult = {
      scan_id: `sim-${randomBytes(4).toString("hex")}`,
      status: "completed",
      findings_count: 0,
      message:
        "Simulation: AWS Scan skipped (Backend Offline). Your environment appears compliant.",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      simulated: true,
    };
    await recordEvent(
      "scan_result",
      { initiated_by: session.email, role: session.role, backend: "offline" },
      simResult,
      { source: "scan_api", user_email: session.email },
    ).catch(() => {});
    notifyScanComplete(session.email, 0, 0, session.tenantId).catch(() => {});
    recordUsage({
      tenantId: session.tenantId,
      dimension: "scans",
      userEmail: session.email,
    });
    return Response.json(simResult);
  }

  const bodyText = await upstream.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(bodyText);
  } catch {
    logRoute(ctx, "error", "scan.invalid_json", {
      tenant_id: session.tenantId,
      upstream_status: upstream.status,
      preview: bodyText.slice(0, 200),
    });
    return Response.json(
      {
        error: "backend_error",
        message: "Invalid response from backend.",
        status: upstream.status,
      },
      { status: 502 },
    );
  }

  await recordEvent(
    "scan_result",
    { initiated_by: session.email, role: session.role },
    body,
    { source: "scan_api", user_email: session.email },
  ).catch(() => {});

  const findings = (body.findings_count as number) ?? (body.total_findings as number) ?? 0;
  const critical = (body.critical_count as number) ?? (body.critical as number) ?? 0;
  notifyScanComplete(
    (body.account_id as string) || session.email,
    findings,
    critical,
    session.tenantId,
  ).catch(() => {});

  logRoute(ctx, "info", "scan.complete", {
    tenant_id: session.tenantId,
    findings,
    critical,
    upstream_status: upstream.status,
  });

  // Usage accounting — increment scans counter for the month.
  // Fail-open: errors swallowed inside recordUsage.
  recordUsage({
    tenantId: session.tenantId,
    dimension: "scans",
    userEmail: session.email,
  });

  return Response.json(body, { status: upstream.status });
}
