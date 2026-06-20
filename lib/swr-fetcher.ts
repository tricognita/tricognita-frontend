/**
 * lib/swr-fetcher — production-safe SWR fetcher.
 *
 * Replaces the per-page `(url) => fetch(url).then(r => r.json())` pattern,
 * which was the root cause of the /dashboard/compliance production crash
 * (BFF returned a 502 with an error blob; SWR treated it as valid data;
 * the render path threw on Object.entries(undefined)).
 *
 * Guarantees:
 *   - Throws an `ApiError` on any non-2xx response so SWR.error gets set
 *     instead of the error blob being treated as `data`.
 *   - Attaches HTTP status, BFF error code, and the request correlation ID
 *     to the thrown error for diagnostic surfaces (ErrorState `detail`,
 *     console logs, future telemetry).
 *   - Generates a per-request correlation ID and sends it via X-Request-ID
 *     so the BFF and Go API can log against the same id.
 *   - Honors an optional AbortSignal for cancellation (multi-tab, route
 *     change cleanup).
 *
 * Usage:
 *   const { data, error, isLoading, mutate } = useSWR<FindingsResponse>(
 *     "/api/findings",
 *     fetcher,           // <-- import { fetcher } from "@/lib/swr-fetcher"
 *     { revalidateOnFocus: false, shouldRetryOnError: false },
 *   );
 *
 *   if (error) {
 *     return <ErrorState
 *       title="..."
 *       detail={`request_id=${(error as ApiError).requestId} · ${error.message}`}
 *     />;
 *   }
 */

export interface ApiErrorBody {
  error?: string;
  message?: string;
  detail?: string;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  detail?: string;

  constructor(opts: {
    message: string;
    status: number;
    code?: string;
    requestId?: string;
    detail?: string;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.detail = opts.detail;
  }
}

/**
 * Generates an 8-byte hex correlation ID. Not cryptographically meaningful;
 * just enough entropy to correlate logs across BFF + Go API for a single
 * request without colliding within a session.
 */
export function newRequestId(): string {
  // Use crypto.randomUUID() if available (Node 19+ / modern browsers),
  // fall back to Math.random for older runtimes. Tail 12 hex chars is plenty.
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2);
  return uuid.replace(/-/g, "").slice(0, 12);
}

interface FetcherOptions extends Omit<RequestInit, "headers"> {
  /** Extra headers merged on top of the defaults. */
  headers?: Record<string, string>;
  /** Override the auto-generated correlation ID. */
  requestId?: string;
}

/**
 * Typed throw-on-non-2xx fetcher for use with SWR.
 *
 * The generic exists so callers can specify the success-shape:
 *   const { data } = useSWR<FindingsResponse>("/api/findings", fetcher);
 *
 * SWR passes the key string as the only argument; this function accepts an
 * optional second parameter (options) when called directly outside SWR.
 */
export async function fetcher<T = unknown>(
  url: string,
  opts: FetcherOptions = {},
): Promise<T> {
  const requestId = opts.requestId ?? newRequestId();
  const headers: Record<string, string> = {
    "X-Request-ID": requestId,
    ...(opts.headers ?? {}),
  };

  const res = await fetch(url, { ...opts, headers });
  // Prefer the BFF's echoed request id (set by lib/bff-log) when present.
  const echoedId = res.headers.get("X-Request-ID") ?? requestId;

  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* response wasn't JSON — fall through with status only */
    }
    throw new ApiError({
      message: body?.message ?? body?.error ?? `HTTP ${res.status}`,
      status: res.status,
      code: body?.error,
      requestId: echoedId,
      detail: body?.detail,
    });
  }

  // 204 No Content — return undefined-typed.
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

/**
 * jsonFetch — convenience wrapper for POST/PATCH/DELETE that JSON-encodes
 * the body and sets Content-Type. Same error contract as `fetcher`.
 */
export async function jsonFetch<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  opts: Omit<FetcherOptions, "method" | "body"> = {},
): Promise<T> {
  return fetcher<T>(url, {
    ...opts,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/**
 * isApiError — runtime type guard. Useful in catch blocks since fetcher
 * always throws ApiError but TypeScript can't prove that at the call site.
 */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/**
 * statusOf — returns the HTTP status code if err is an ApiError, else null.
 * Convenient for one-off branching:
 *   if (statusOf(error) === 401) router.push("/login");
 */
export function statusOf(err: unknown): number | null {
  return isApiError(err) ? err.status : null;
}
