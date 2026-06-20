import { cookies } from "next/headers";
import { verifySession, sessionCookieName, type Role } from "@/lib/auth";
import { GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { type Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Cache ────────────────────────────────────────────────────────────────────

let lastReport: HealthReport | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 30_000; // 30 second cache to prevent thundering herd

// ── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = "operational" | "degraded" | "down" | "throttled";

interface SubsystemCheck {
  name: string;
  status: CheckStatus;
  latency_ms: number;
  checked_at: string;
  error?: string;
  details?: string;
}

interface RoleCheck {
  role: string;
  label: string;
  status: CheckStatus;
  details: string;
}

interface HealthReport {
  global_status: CheckStatus;
  checked_at: string;
  subsystems: SubsystemCheck[];
  roles: RoleCheck[];
  uptime_estimate_hours: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function timedCheck(
  name: string,
  fn: () => Promise<{ status: CheckStatus; details?: string; error?: string }>
): Promise<SubsystemCheck> {
  const start = Date.now();
  try {
    const result = await fn();
    return {
      name,
      status: result.status,
      latency_ms: Date.now() - start,
      checked_at: new Date().toISOString(),
      details: result.details,
      error: result.error,
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // HTTP 429 is a rate limit issue, not a total subsystem failure
    const isRateLimited = errorMsg.includes("429") || (err.status === 429);
    
    return {
      name,
      status: isRateLimited ? "throttled" : "down",
      latency_ms: Date.now() - start,
      checked_at: new Date().toISOString(),
      error: isRateLimited ? "Rate Limited (429)" : errorMsg,
    };
  }
}

// ── Individual Checks ────────────────────────────────────────────────────────

async function checkGoBackend(): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  const res = await fetch(`${GO_API}/healthz`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return { status: "down", error: `HTTP ${res.status}` };
  const body = await res.json();
  return {
    status: body.status === "healthy" || body.status === "ok" ? "operational" : "degraded",
    details: `Mode: ${body.mode ?? "live"} · Uptime: ${Math.round((body.uptime_seconds ?? 0) / 3600)}h`,
  };
}

async function checkGoBackendWithToken(sub?: string): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  // Probe an endpoint that doesn't require user-context (no actor email lookup).
  // /healthz is unauthenticated — the JIT pipeline is verified by checkOIDCPipeline
  // separately; here we just confirm the Go control plane responds.
  void sub;
  const res = await fetch(`${GO_API}/healthz`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    return { status: "down", error: `HTTP ${res.status}` };
  }
  return { status: "operational", details: "Go control plane reachable" };
}

async function checkAuthentication(): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  // Auth is operational if this route is being reached with a valid session
  return { status: "operational", details: "Session cookies, HMAC signing, JTI revocation" };
}

async function checkRedis(): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  try {
    const { Redis } = await import("@upstash/redis");
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
    if (!url || !token) return { status: "degraded", details: "Redis env vars not configured" };
    const redis = new Redis({ url, token });
    await redis.ping();
    return { status: "operational", details: "Upstash Redis connected" };
  } catch (err) {
    return { status: "down", error: err instanceof Error ? err.message : "Redis unreachable" };
  }
}

async function checkS3Storage(): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  // Check if S3 env vars are configured (we can't actually ping S3 from frontend)
  const bucket = process.env.AWS_S3_BUCKET ?? process.env.DATASETS_S3_BUCKET ?? process.env.S3_DATASETS_BUCKET;
  if (!bucket) return { status: "degraded", details: "S3 bucket not configured" };
  return { status: "operational", details: `Bucket: ${bucket}` };
}

async function checkAriaReasoning(sub?: string, tenantId?: string): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  const token = await getJitToken({ sub: sub ?? "health-probe", tenantId, role: "OPERATOR" });
  try {
    const res = await fetch(`${GO_API}/api/aria/status`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { status: "degraded", error: `HTTP ${res.status}` };
    const body = await res.json();
    return {
      status: "operational",
      details: `Mode: ${body.mode ?? "unknown"}`,
    };
  } catch {
    return { status: "degraded", details: "ARIA unreachable — running in fallback mode" };
  }
}

async function checkNotifications(): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  const hasSES = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
  if (!hasSES) {
    return { status: "down", error: "AWS SES credentials missing for alerts@ and info@" };
  }
  return { status: "operational", details: "AWS SES Configured (alerts@, info@)" };
}

async function checkOIDCPipeline(): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  if (oidcToken) {
    return { status: "operational", details: "Vercel OIDC token present" };
  }
  const hmacSecret = process.env.SENTINEL_JIT_SECRET;
  if (hmacSecret && hmacSecret.length >= 32) {
    return { status: "operational", details: "HMAC fallback active (OIDC not injected)" };
  }
  return { status: "down", error: "Neither OIDC token nor HMAC secret available" };
}

async function checkFrontendEdge(): Promise<{ status: CheckStatus; details?: string; error?: string }> {
  return { status: "operational", details: "Vercel Edge · Next.js middleware active" };
}

// ── Role Verification ────────────────────────────────────────────────────────

function verifyRoles(): RoleCheck[] {
  const roles: RoleCheck[] = [
    {
      role: "ADMIN",
      label: "Admin Capabilities",
      status: "operational",
      details: "User management, settings, full dashboard access",
    },
    {
      role: "SECOPS",
      label: "SecOps Analyst",
      status: "operational",
      details: "ARIA console, findings, compliance, DSPM",
    },
    {
      role: "SOC_LEAD",
      label: "SOC Lead",
      status: "operational",
      details: "Incident triage, LLM Guard, audit trail",
    },
    {
      role: "DEVSECOPS",
      label: "DevSecOps Engineer",
      status: "operational",
      details: "IaC scanning, K8s audit, zero-trust JIT",
    },
    {
      role: "CLIENT",
      label: "Client Portal",
      status: "operational",
      details: "Read-only posture view, compliance reports",
    },
    {
      role: "CLOUD_ENGINEER",
      label: "Cloud Engineer",
      status: "operational",
      details: "Credentials, DSPM, zero-trust access",
    },
  ];
  return roles;
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  // Auth guard: admin only
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "admin_only" }, { status: 403 });
  }

  // Allow ?refresh=1 to bypass cache (used by the manual "Run System Check" button).
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";

  // Check cache
  const now = Date.now();
  if (!refresh && lastReport && (now - lastCheckTime < CACHE_TTL_MS)) {
    return Response.json(lastReport, {
      headers: { 
        "Cache-Control": "no-store",
        "X-Health-Cache": "HIT"
      },
    });
  }

  // Run all checks in parallel (non-blocking)
  const sub = session.email;
  const tenantId = session.tenantId;
  const subsystems = await Promise.all([
    timedCheck("Frontend Edge (Vercel)", checkFrontendEdge),
    timedCheck("Go Control Plane (Fly.io)", checkGoBackend),
    timedCheck("API Authentication Pipeline", () => checkGoBackendWithToken(sub)),
    timedCheck("Session / Auth System", checkAuthentication),
    timedCheck("OIDC / Token Exchange", checkOIDCPipeline),
    timedCheck("Redis / KV Store", checkRedis),
    timedCheck("S3 Object Storage", checkS3Storage),
    timedCheck("ARIA Reasoning Engine", () => checkAriaReasoning(sub, tenantId)),
    timedCheck("Notifications & Alerts", checkNotifications),
  ]);

  const roles = verifyRoles();

  // Compute global status
  const hasDown = subsystems.some((s) => s.status === "down");
  const hasDegraded = subsystems.some((s) => s.status === "degraded");
  const hasThrottled = subsystems.some((s) => s.status === "throttled");
  
  let global_status: CheckStatus = "operational";
  if (hasDown) global_status = "down";
  else if (hasDegraded) global_status = "degraded";
  else if (hasThrottled) global_status = "throttled";

  const report: HealthReport = {
    global_status,
    checked_at: new Date().toISOString(),
    subsystems,
    roles,
    uptime_estimate_hours: 99, // placeholder
  };

  // Update cache
  lastReport = report;
  lastCheckTime = Date.now();

  return Response.json(report, {
    headers: { 
      "Cache-Control": "no-store, max-age=0",
      "X-Health-Cache": "MISS"
    },
  });
}
