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
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  timeoutMs?: number;
  body?: string;
  contentType?: string;
  /** Request validation that runs only after authentication; return a Response to stop. */
  precheck?: () => Response | null;
  /** Extra request headers (e.g. X-Request-ID, Idempotency-Key). */
  headers?: Record<string, string>;
  /** Returns a reason string when a 2xx body is not a complete, usable result. */
  validate?: (body: unknown) => string | null;
  /** Shapes the body the browser receives (e.g. drop scanner output). Runs after onSuccess. */
  transform?: (body: unknown) => unknown;
  /** Side effects that are only valid after a verified 2xx. Errors are swallowed. */
  onSuccess?: (session: UpstreamSession, body: unknown) => void | Promise<void>;
  /**
   * A file download: the 2xx body is relayed as-is instead of parsed as JSON. Honest like everything
   * else here: only a 2xx whose Content-Type is one of `contentTypes` and whose body is not empty is
   * relayed (anything else is a 502), only the named headers are passed on, and every refusal maps
   * exactly as a JSON call's would.
   */
  raw?: { contentTypes: string[]; passHeaders: string[] };
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

/**
 * The API accepted the request but had not answered when the BFF's limit ran out. That is not "unreachable": the work
 * (a verification, a fix) may well still be running or have finished, so the message says to look before retrying.
 */
export function backendTimeout(seconds: number): Response {
  return Response.json(
    {
      error: "backend_timeout",
      message: `The Tricognita API was still working after ${seconds} seconds, so the result could not be confirmed here. The work may still complete: check Verification history or the item's status before retrying.`,
    },
    { status: 504 },
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
  } catch (e) {
    // The browser only ever sees "could not reach the API"; the operator needs to know WHY (a timeout, a reset
    // connection and a refused connection are different faults). Class and code only: no URL query, header or body.
    console.error(`[bff-upstream] ${call.method ?? "GET"} ${call.path.split("?")[0]} failed: ${describeFetchError(e)}`);
    if (e instanceof Error && e.name === "TimeoutError") return backendTimeout(Math.round((call.timeoutMs ?? 10_000) / 1000));
    return backendUnreachable();
  }

  if (call.raw && upstream.ok) return relayRaw(upstream, call.raw);
  return interpretUpstream(upstream, call, session);
}

/** "TimeoutError", "TypeError/ECONNRESET", ...: the error class and the network error code, nothing else. */
export function describeFetchError(e: unknown): string {
  if (!(e instanceof Error)) return "unknown";
  const cause = (e as { cause?: unknown }).cause;
  const code = cause && typeof cause === "object" ? String((cause as { code?: unknown }).code ?? "") : "";
  return code ? `${e.name}/${code}` : e.name;
}

async function relayRaw(upstream: Response, raw: NonNullable<UpstreamCall["raw"]>): Promise<Response> {
  const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  let bytes: ArrayBuffer;
  try {
    bytes = await upstream.arrayBuffer();
  } catch {
    return backendUnreachable();
  }
  if (!raw.contentTypes.includes(type) || bytes.byteLength === 0) {
    return Response.json(
      { error: "backend_incomplete", message: "The Tricognita API answered, but not with a usable file. Nothing was downloaded." },
      { status: 502 },
    );
  }
  const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  headers.set("Content-Type", upstream.headers.get("content-type") ?? type);
  for (const h of raw.passHeaders) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(bytes, { status: 200, headers });
}

// Keys that may carry scanner/process output or internals. Never relayed to a browser.
const INTERNAL_KEYS = new Set(["detail", "details", "stack", "trace", "script_output", "output", "debug", "cause"]);

function safeString(v: unknown, max = 300): string | undefined {
  return typeof v === "string" ? v.slice(0, max) : undefined;
}

/**
 * Maps a non-2xx upstream answer to what the browser may see.
 *  - Go 403 `direct_access_denied` is the origin gate rejecting the BFF, not a
 *    user authorization answer: report it as an outage (same code as
 *    lib/bff-log's originRejectionAsOutage on the MFA/origin branch).
 *  - 5xx: a generic error. The upstream body (which can hold scanner output) is
 *    logged server-side only, truncated, and never forwarded.
 *  - other 4xx: genuine refusals keep their status and their error/message text;
 *    internal keys are stripped.
 */
export function refusalFor(status: number, body: unknown): Response {
  const obj = body !== null && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  if (status === 403 && obj?.error === "direct_access_denied") {
    return Response.json(
      { error: "api_origin_rejected", message: "The API refused this server's request. This is an outage, not a permissions answer." },
      { status: 502 },
    );
  }
  if (status >= 500) {
    console.error(
      `[bff-upstream] upstream ${status}: ${safeString(obj?.error, 200) ?? "no error text"}` +
        (safeString(obj?.detail, 500) ? ` detail=${JSON.stringify(safeString(obj?.detail, 500))}` : ""),
    );
    return Response.json(
      { error: "backend_error", message: "The Tricognita API failed to complete this request.", upstream_status: status },
      { status },
    );
  }
  if (obj) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) if (!INTERNAL_KEYS.has(k)) clean[k] = v;
    return Response.json(clean, { status });
  }
  return Response.json(
    { error: "backend_error", message: "The Tricognita API rejected the request.", upstream_status: status },
    { status: status >= 400 ? status : 502 },
  );
}

/**
 * Steps 4-6 of the contract, split out so routes that need their own quota or
 * header handling (POST /api/scan) share the exact same success rules.
 */
export async function interpretUpstream(
  upstream: Response,
  call: Pick<UpstreamCall, "validate" | "onSuccess" | "transform">,
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
    return refusalFor(upstream.status, isJson ? parsed : undefined);
  }

  // A confirmed 2xx with no body (204, or an empty 200/202) is a real success with
  // nothing to relay, unless the route requires a result body.
  if (text.trim() === "") {
    if (call.validate) {
      return Response.json(
        { error: "incomplete_result", message: "The Tricognita API returned an empty result. Nothing is reported as done." },
        { status: 502 },
      );
    }
    if (call.onSuccess) {
      try { await call.onSuccess(session, null); } catch { /* never alters a verified result */ }
    }
    return new Response(null, { status: upstream.status });
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
  const out = call.transform ? call.transform(parsed) : parsed;
  return Response.json(out, { status: upstream.status });
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Removes raw scanner process output from a fleet-scan result before it reaches a browser. */
export function stripScanOutput(body: unknown): unknown {
  if (!isObj(body)) return body;
  const { script_output: _omit, ...rest } = body;
  void _omit;
  return rest;
}

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
