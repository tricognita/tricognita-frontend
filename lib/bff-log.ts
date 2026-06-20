import { cookies } from "next/headers";
import { verifySession, sessionCookieName, type Role } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

/**
 * lib/bff-log — structured logging + correlation IDs for BFF route handlers.
 *
 * Pairs with lib/swr-fetcher on the client side. The client generates an
 * X-Request-ID per fetch; this module reads it (or mints one if missing),
 * makes it available to the handler, propagates it to the Go API on
 * downstream calls, and echoes it back on the response so the client can
 * surface the same id in error UI.
 *
 * Production debugging contract:
 *   - One request id flows: browser → BFF logs → Go API logs → response.
 *   - A customer reports "compliance is broken" + screenshots the
 *     request_id from the error banner. Operator greps BFF logs and Go
 *     logs for that id; gets the exact request trace.
 *   - All logs are single-line JSON so Fly/Vercel log aggregators can
 *     filter on fields.
 *
 * Usage in a BFF route:
 *
 *   import { withRequestContext, logRoute } from "@/lib/bff-log";
 *
 *   export async function GET(req: Request) {
 *     return withRequestContext(req, async (ctx) => {
 *       logRoute(ctx, "info", "fetching upstream", { path: "/api/x" });
 *       const upstream = await fetch(GO_API + "/api/x", {
 *         headers: { "X-Request-ID": ctx.requestId },
 *       });
 *       return ctx.respond(upstream);
 *     });
 *   }
 */

import { NextResponse } from "next/server";

export interface RequestContext {
  /** Stable correlation id — sent to Go API, echoed in response, in every log line. */
  requestId: string;
  /** Wall-clock millis at the start of the handler (for duration measurement). */
  startedAt: number;
  /**
   * Wrap a Response so the X-Request-ID is echoed back to the client.
   * Use this for every non-error response returned from a handler.
   */
  respond: (res: Response) => Response;
  /**
   * Convenience for JSON error responses with the correlation id attached
   * to the body as well as the header.
   */
  errorJson: (
    body: { error: string; message?: string; detail?: string },
    status: number,
  ) => Response;
}

const REQUEST_ID_HEADER = "x-request-id";

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  // Node 19+ guarantees crypto.randomUUID; this branch is safety only.
  return Math.random().toString(16).slice(2, 14);
}

function pickRequestId(req: Request): string {
  const incoming = req.headers.get(REQUEST_ID_HEADER);
  // Accept only short hex-ish ids; reject anything weird to avoid log injection.
  if (incoming && /^[a-zA-Z0-9-]{4,64}$/.test(incoming)) return incoming;
  return generateRequestId();
}

interface LogFields {
  [key: string]: unknown;
}

/**
 * logRoute — single-line JSON logger keyed off a RequestContext. Use for
 * route-level observability events. Severity tracks the standard set.
 */
export function logRoute(
  ctx: RequestContext,
  level: "debug" | "info" | "warn" | "error",
  msg: string,
  fields: LogFields = {},
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    request_id: ctx.requestId,
    elapsed_ms: Date.now() - ctx.startedAt,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * withRequestContext — wraps a handler so it gets a RequestContext.
 *
 * Behaviors:
 *   - Generates/parses X-Request-ID.
 *   - Logs the start + end of every request with method, path, status, ms.
 *   - Echoes X-Request-ID on every response (success or error).
 *   - Catches uncaught throws and returns a structured 500 with the id.
 *
 * The wrapped function signature is `(ctx) => Promise<Response>` so route
 * handlers don't see the Request param (they capture it via closure if
 * they need the URL / body).
 */
export async function withRequestContext(
  req: Request,
  handler: (ctx: RequestContext) => Promise<Response>,
): Promise<Response> {
  const requestId = pickRequestId(req);
  const startedAt = Date.now();
  const url = new URL(req.url);

  const respond = (res: Response): Response => {
    // Headers are immutable on a Response unless we clone. Build a NextResponse
    // from the underlying body so we can safely add the X-Request-ID header.
    const headers = new Headers(res.headers);
    headers.set("X-Request-ID", requestId);
    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  };

  const ctx: RequestContext = {
    requestId,
    startedAt,
    respond,
    errorJson: (body, status) =>
      respond(
        Response.json(
          { ...body, request_id: requestId },
          { status },
        ),
      ),
  };

  // Log start
  logRoute(ctx, "info", "request.start", {
    method: req.method,
    path: url.pathname,
  });

  try {
    const res = await handler(ctx);
    const wrapped = respond(res);
    logRoute(ctx, wrapped.status >= 500 ? "error" : "info", "request.end", {
      method: req.method,
      path: url.pathname,
      status: wrapped.status,
    });
    return wrapped;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logRoute(ctx, "error", "request.uncaught", {
      method: req.method,
      path: url.pathname,
      error: msg,
    });
    return ctx.errorJson(
      {
        error: "internal_error",
        message: "An unexpected error occurred. Please retry; if this persists, share the request id.",
        detail: msg,
      },
      500,
    );
  }
}

// ─── High-level proxy helpers ────────────────────────────────────────────────

/**
 * Session shape returned by lib/auth:verifySession. Duplicated here as a
 * minimal interface so we don't import the full Session type (which would
 * couple bff-log to all of lib/auth).
 */
interface MinSession {
  email: string;
  role: Role;
  tenantId: string;
}

/**
 * authedRoute — wraps a route handler with the canonical security boundary:
 *
 *   withRequestContext  →  session verify  →  JIT secret check  →  JIT token mint
 *
 * Your handler receives the request, the request context, the session, and
 * a freshly-minted JIT token. Failures (no session, missing secret, etc.)
 * short-circuit to structured 401/503 responses with the correlation id
 * already attached.
 *
 * Usage:
 *
 *   export const GET = authedRoute(async ({ ctx, session, token, req }) => {
 *     const upstream = await fetch(`${GO_API}/api/findings`, {
 *       headers: {
 *         Authorization: `Bearer ${token}`,
 *         "X-Request-ID": ctx.requestId,
 *         "X-Initiated-By": session.email,
 *       },
 *     });
 *     return upstream;
 *   });
 *
 * The handler's returned Response is passed through ctx.respond so the
 * X-Request-ID header is echoed to the client.
 */
export function authedRoute(
  handler: (args: {
    ctx: RequestContext;
    session: MinSession;
    token: string;
    req: Request;
  }) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return (req: Request) =>
    withRequestContext(req, async (ctx) => {
      const jar = await cookies();
      const sessionToken = jar.get(sessionCookieName())?.value;
      const session = await verifySession(sessionToken);
      if (!session) {
        logRoute(ctx, "warn", "unauthenticated");
        return ctx.errorJson({ error: "authentication_required" }, 401);
      }
      const check = secretOrError();
      if (check instanceof Response) {
        logRoute(ctx, "error", "jit_not_configured");
        return ctx.respond(check);
      }
      const token = await getJitToken({
        sub: session.email,
        tenantId: session.tenantId,
        role: session.role,
      });
      return ctx.respond(
        await handler({ ctx, session: session as MinSession, token, req }),
      );
    });
}

/**
 * proxyRoute — for the simplest case: forward a GET to the Go API at the
 * same path, preserving query string. Equivalent to authedRoute + a small
 * fetch dance, but small enough to be a one-liner per route.
 *
 *   export const GET = proxyRoute("/api/aria/audit-trail");
 *
 * Errors are caught and returned as structured 502 / 504 with the
 * correlation id. Upstream non-2xx responses are passed through verbatim.
 */
export function proxyRoute(
  upstreamPath: string,
  opts: { timeoutMs?: number; method?: "GET" | "POST" } = {},
) {
  const method = opts.method ?? "GET";
  const timeoutMs = opts.timeoutMs ?? 10_000;
  return authedRoute(async ({ ctx, session, token, req }) => {
    const url = new URL(req.url);
    const qs = url.searchParams.toString();
    try {
      const upstream = await fetch(
        `${GO_API}${upstreamPath}${qs ? "?" + qs : ""}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Initiated-By": session.email,
            "X-Request-ID": ctx.requestId,
          },
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      if (!upstream.ok) {
        logRoute(ctx, "warn", "upstream.non_ok", {
          tenant_id: session.tenantId,
          upstream_status: upstream.status,
          upstream_path: upstreamPath,
        });
      }
      return upstream;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logRoute(ctx, "error", "upstream.unreachable", {
        tenant_id: session.tenantId,
        upstream_path: upstreamPath,
        detail,
      });
      return ctx.errorJson(
        {
          error: "backend_unreachable",
          message:
            "No data available. Connect a cloud environment to begin scanning.",
          detail,
        },
        502,
      );
    }
  });
}
