import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StepStatus = "pending" | "success" | "error";

interface FlowStep {
  name: string;
  status: StepStatus;
  latency_ms: number;
  details?: string;
  error?: string;
}

interface RoleFlowResult {
  role: string;
  email: string;
  global_status: "success" | "degraded" | "failed";
  steps: FlowStep[];
  total_latency_ms: number;
}

interface E2EReport {
  ran_at: string;
  mode: "full" | "internal" | "tenant";
  flows: RoleFlowResult[];
  overall_status: "operational" | "partial_failure" | "critical_failure";
}

const TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 30_000;

// Per-mode caches — prevent cache poisoning across roles
const cacheMap: Record<string, { at: number; report: E2EReport } | null> = {
  full: null,
  internal: null,
  tenant: null,
};

// ── Role → mode mapping ─────────────────────────────────────────────────────

type Mode = "full" | "internal" | "tenant" | null;

function modeForRole(role: string): Mode {
  switch (role) {
    case "ADMIN":
      return "full";
    case "SECOPS":
    case "DEVSECOPS":
    case "SOC_LEAD":
      return "internal";
    case "CLIENT":
    case "VIEWER":
    case "AUDITOR":
      return "tenant";
    default:
      return null; // no access
  }
}

// ── Step runner ──────────────────────────────────────────────────────────────

async function timed(
  name: string,
  fn: () => Promise<{ ok: boolean; details?: string; error?: string }>
): Promise<FlowStep> {
  const start = Date.now();
  try {
    const r = await fn();
    return {
      name,
      status: r.ok ? "success" : "error",
      latency_ms: Date.now() - start,
      details: r.details,
      error: r.error,
    };
  } catch (e) {
    return {
      name,
      status: "error",
      latency_ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

// ── Shared check primitives ─────────────────────────────────────────────────

async function checkGoHealth(): Promise<{ ok: boolean; details?: string; error?: string }> {
  const r = await fetch(`${GO_API}/healthz`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
  return { ok: true, details: "Go control plane reachable" };
}

async function checkRedis(): Promise<{ ok: boolean; details?: string; error?: string }> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const tok = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !tok) return { ok: false, error: "Redis not configured" };
  const r = await fetch(`${url}/ping`, {
    headers: { Authorization: `Bearer ${tok}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
  return { ok: true, details: "PONG" };
}

async function checkSession(
  email: string,
  role: string
): Promise<{ ok: boolean; details?: string; error?: string }> {
  return { ok: true, details: `${role} session active for ${email}` };
}

async function checkGoAuthorized(
  sub: string,
  tenantId?: string
): Promise<{ ok: boolean; details?: string; error?: string }> {
  try {
    const token = await getJitToken({ sub, tenantId, role: "OPERATOR", scope: "*" });
    const r = await fetch(`${GO_API}/api/aria/status`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const body = await r.json();
    return { ok: true, details: `ARIA ${body.status ?? "ok"}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkCompliance(
  sub: string,
  tenantId: string
): Promise<{ ok: boolean; details?: string; error?: string }> {
  try {
    const token = await getJitToken({ sub, tenantId, role: "VIEWER", scope: "scan:read" });
    const r = await fetch(`${GO_API}/api/compliance/score`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // 404 is acceptable (no data yet), anything >= 500 is a real failure
    if (r.status >= 500) return { ok: false, error: `HTTP ${r.status}` };
    return { ok: true, details: r.status === 404 ? "no data yet" : "compliance endpoint reachable" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkFindings(
  sub: string,
  tenantId: string
): Promise<{ ok: boolean; details?: string; error?: string }> {
  try {
    const token = await getJitToken({ sub, tenantId, role: "VIEWER", scope: "scan:read" });
    const r = await fetch(`${GO_API}/api/findings`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.status >= 500) return { ok: false, error: `HTTP ${r.status}` };
    return { ok: true, details: r.status === 404 ? "no findings" : "findings endpoint reachable" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Mode runners ─────────────────────────────────────────────────────────────

/** ADMIN — full infra + auth + data plane */
async function runFullSystemCheck(
  email: string,
  role: string
): Promise<RoleFlowResult> {
  const steps = await Promise.all([
    timed("Session validated", () => checkSession(email, role)),
    timed("Go control plane reachable", checkGoHealth),
    timed("Redis / KV reachable", checkRedis),
    timed("Authorized backend call (ARIA status)", () =>
      checkGoAuthorized(email, "tricognita-global")
    ),
  ]);
  return buildResult(email, role, steps);
}

/** SECOPS / DEVSECOPS — internal service checks only (no tenant data) */
async function runInternalSystemCheck(
  email: string,
  role: string
): Promise<RoleFlowResult> {
  const steps = await Promise.all([
    timed("Session validated", () => checkSession(email, role)),
    timed("Go control plane reachable", checkGoHealth),
    timed("Authorized backend call (ARIA status)", () =>
      checkGoAuthorized(email, "tricognita-global")
    ),
  ]);
  return buildResult(email, role, steps);
}

/** CLIENT / VIEWER / AUDITOR — only tenant-scoped posture checks */
async function runClientScopedCheck(
  email: string,
  role: string,
  tenantId: string
): Promise<RoleFlowResult> {
  const steps = await Promise.all([
    timed("Session validated", () => checkSession(email, role)),
    timed("Compliance endpoint reachable", () => checkCompliance(email, tenantId)),
    timed("Findings endpoint reachable", () => checkFindings(email, tenantId)),
  ]);
  return buildResult(email, role, steps);
}

// ── Result builder ────────────────────────────────────────────────────────────

function buildResult(email: string, role: string, steps: FlowStep[]): RoleFlowResult {
  const errors = steps.filter((s) => s.status === "error").length;
  const global_status: RoleFlowResult["global_status"] =
    errors === 0 ? "success" : errors >= Math.ceil(steps.length / 2) ? "failed" : "degraded";
  return {
    role,
    email,
    global_status,
    steps,
    total_latency_ms: steps.reduce((a, s) => a + s.latency_ms, 0),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);

  if (!session) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const mode = modeForRole(session.role);
  if (!mode) {
    return Response.json({ error: "insufficient_role" }, { status: 403 });
  }

  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  const now = Date.now();
  const entry = cacheMap[mode];
  if (!refresh && entry && now - entry.at < CACHE_TTL_MS) {
    return Response.json(entry.report, {
      headers: { "Cache-Control": "no-store", "X-E2E-Cache": "HIT", "X-E2E-Mode": mode },
    });
  }

  // Determine tenant ID: use session tenantId if available, fall back to role-based default
  const tenantId = (session as { tenantId?: string }).tenantId ?? "tricognita-global";

  let flow: RoleFlowResult;
  if (mode === "full") {
    flow = await runFullSystemCheck(session.email, session.role);
  } else if (mode === "internal") {
    flow = await runInternalSystemCheck(session.email, session.role);
  } else {
    // tenant mode — CLIENT/VIEWER/AUDITOR: only their scoped data, no infra
    flow = await runClientScopedCheck(session.email, session.role, tenantId);
  }

  const errors = flow.steps.filter((s) => s.status === "error").length;
  const report: E2EReport = {
    ran_at: new Date().toISOString(),
    mode,
    flows: [flow],
    overall_status:
      errors === 0 ? "operational" : errors < flow.steps.length ? "partial_failure" : "critical_failure",
  };

  cacheMap[mode] = { at: now, report };
  return Response.json(report, {
    headers: { "Cache-Control": "no-store", "X-E2E-Cache": "MISS", "X-E2E-Mode": mode },
  });
}
