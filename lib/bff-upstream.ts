/**
 * lib/bff-upstream: the one honest path from a BFF route to the Go API.
 *
 * Contract (the reason this file exists): a BFF route may only report success
 * when the Go API returned 2xx with a usable body. It never fabricates a
 * result, never substitutes demo data, and never fires side effects
 * (notifications, dataset events, usage accounting) for an operation that did
 * not actually complete.
 *
 * Order of checks, each short-circuiting:
 *   1. verified session      -> 401 authentication_required
 *   2. JIT secret configured -> 503 jit_not_configured
 *   3. upstream reachable    -> 502 backend_unreachable
 *   4. upstream 2xx          -> else pass the upstream status through
 *   5. body is JSON and passes the route's completeness check -> else 502
 *   6. onSuccess side effects (only now), failures there never change the result
 *
 * Authorization (role/tier/scope) stays enforced by the Go API and by
 * lib/api-authz.ts; a genuine upstream 401/403 is passed through untouched.
 */
import { secretOrError, GO_API } from "@/lib/jit-secret";

export interface UpstreamSession {
  email: string;
  tenantId: string;
  role: string;
}

export interface UpstreamDeps {
  getSession(): Promise<UpstreamSession | null>;
  secret(): { secret: string } | Response;
  mintToken(session: UpstreamSession): Promise<string>;
  fetch: typeof fetch;
  goApi: string;
}

export const defaultUpstreamDeps: UpstreamDeps = {
  async getSession() {
    const { cookies } = await import("next/headers");
    const { verifySession, sessionCookieName } = await import("@/lib/auth");
    const jar = await cookies();
    return (await verifySession(jar.get(sessionCookieName())?.value)) as UpstreamSession | null;
  },
  secret: secretOrError,
  async mintToken(session) {
    const { getJitToken } = await import("@/lib/jit-token");
    return getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role as never });
  },
  fetch: (...args) => fetch(...args),
  goApi: GO_API,
};

export interface UpstreamCall {
  path: string;
  method?: "GET" | "POST";
  timeoutMs?: number;
  body?: string;
  contentType?: string;
  /** Request validation that runs only after authentication; return a Response to stop. */
  precheck?: () => Response | null;
  /** Extra request headers (e.g. X-Request-ID, Idempotency-Key). */
  headers?: Record<string, string>;
  /** Returns a reason string when a 2xx body is not a complete, usable result. */
  validate?: (body: unknown) => string | null;
  /** Side effects that are only valid after a verified 2xx. Errors are swallowed. */
  onSuccess?: (session: UpstreamSession, body: unknown) => void | Promise<void>;
}

export function backendUnreachable(): Response {
  return Response.json(
    {
      error: "backend_unreachable",
      message: "The Tricognita API did not answer, so the result of this request could not be confirmed. Check the item's status before retrying.",
    },
    { status: 502 },
  );
}

export function notImplemented(feature: string): Response {
  return Response.json(
    {
      error: "not_implemented",
      message: `${feature} is not available yet. No action was taken.`,
    },
    { status: 501 },
  );
}

export async function callUpstream(
  call: UpstreamCall,
  deps: UpstreamDeps = defaultUpstreamDeps,
): Promise<Response> {
  const session = await deps.getSession();
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const secret = deps.secret();
  if (secret instanceof Response) return secret;

  const refused = call.precheck?.();
  if (refused) return refused;

  const token = await deps.mintToken(session);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "X-Initiated-By": session.email,
    "X-User-Role": session.role,
  };
  Object.assign(headers, call.headers);
  if (call.contentType) headers["Content-Type"] = call.contentType;

  let upstream: Response;
  try {
    upstream = await deps.fetch(`${deps.goApi}${call.path}`, {
      method: call.method ?? "GET",
      headers,
      body: call.body,
      signal: AbortSignal.timeout(call.timeoutMs ?? 10_000),
    });
  } catch {
    return backendUnreachable();
  }

  return interpretUpstream(upstream, call, session);
}

/**
 * Steps 4-6 of the contract, split out so routes that need their own quota or
 * header handling (POST /api/scan) share the exact same success rules.
 */
export async function interpretUpstream(
  upstream: Response,
  call: Pick<UpstreamCall, "validate" | "onSuccess">,
  session: UpstreamSession,
): Promise<Response> {
  let text: string;
  try {
    text = await upstream.text();
  } catch {
    return backendUnreachable();
  }
  let parsed: unknown;
  let isJson = true;
  try {
    parsed = JSON.parse(text);
  } catch {
    isJson = false;
  }

  if (!upstream.ok) {
    // Genuine upstream refusals (401/403/404/409/429/5xx) are relayed with their status.
    if (isJson && parsed !== null && typeof parsed === "object") {
      return Response.json(parsed, { status: upstream.status });
    }
    return Response.json(
      { error: "backend_error", message: "The Tricognita API rejected the request.", upstream_status: upstream.status },
      { status: upstream.status >= 400 ? upstream.status : 502 },
    );
  }

  if (!isJson) {
    return Response.json(
      { error: "backend_error", message: "The Tricognita API returned an unreadable response; the result is unknown." },
      { status: 502 },
    );
  }
  const problem = call.validate?.(parsed) ?? null;
  if (problem) {
    return Response.json(
      { error: "incomplete_result", message: `The Tricognita API returned an incomplete result (${problem}). Nothing is reported as done.` },
      { status: 502 },
    );
  }

  if (call.onSuccess) {
    try {
      await call.onSuccess(session, parsed);
    } catch {
      /* side effects must never alter a verified result */
    }
  }
  return Response.json(parsed, { status: upstream.status });
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** /api/scan: must carry the scanner report with an explicit findings array. */
export function validateFleetScan(body: unknown): string | null {
  if (!isObj(body) || !isObj(body.report)) return "missing scan report";
  if (!Array.isArray(body.report.findings)) return "scan report has no findings array";
  return null;
}

/** /api/iac/scan: a count is required, and a positive count needs the findings themselves. */
export function validateIacScan(body: unknown): string | null {
  if (!isObj(body) || typeof body.count !== "number") return "missing finding count";
  if (body.count > 0 && !(Array.isArray(body.findings) && body.findings.length > 0)) return "findings missing";
  return null;
}

/** /api/k8s/audit: a summary total is required, and a positive total needs the findings themselves. */
export function validateK8sAudit(body: unknown): string | null {
  if (!isObj(body) || !isObj(body.summary) || typeof body.summary.total !== "number") return "missing summary";
  if (body.summary.total > 0 && !(Array.isArray(body.findings) && body.findings.length > 0)) return "findings missing";
  return null;
}

/** /api/threatintel/lookup: a numeric score is required; the verdict is never invented here. */
export function validateThreatIntel(body: unknown): string | null {
  if (!isObj(body)) return "not an object";
  const score = body.score ?? body.Score;
  if (typeof score !== "number" || !Number.isFinite(score)) return "missing score";
  return null;
}

/**
 * Writes one client audit event through the Go API. Returns true only when the
 * Go API confirmed the write (2xx); every other outcome is a failed persistence.
 */
export async function persistClientAuditEvent(
  row: unknown,
  token: string,
  requestId: string,
  deps: Pick<UpstreamDeps, "fetch" | "goApi"> = defaultUpstreamDeps,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const res = await deps.fetch(`${deps.goApi}/api/audit/client-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? { ok: true } : { ok: false, reason: `upstream_status_${res.status}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unreachable" };
  }
}
