/**
 * The one place the product talks to the BFF.
 *
 * Browser → Next BFF (`/api/*`) → Go API. The browser never holds a JIT token
 * and never names a tenant: the BFF mints the token from the session cookie and
 * the backend resolves the tenant from it.
 *
 * The important behaviour here is how failures are classified, because the
 * product renders three different things and they must not be confused:
 *
 *   NotImplementedError → "Not available yet"  — the capability is not built
 *   Error               → "We could not load this" — it is built and it broke
 *   empty array         → "Nothing to show"    — it worked and there is nothing
 *
 * A backend that is unreachable is an ERROR, never an empty result. Reporting
 * an outage as "no findings" is the failure this whole layer exists to avoid.
 */

import { NotImplementedError } from "@/lib/data/types";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiGet<T>(path: string, capability: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
  } catch (cause) {
    throw new ApiError(0, `${capability} could not be reached: ${String(cause)}`);
  }

  // 404 and 501 mean the capability is not served yet. Everything else that
  // failed is a failure, and the reader is told so rather than shown a blank.
  if (res.status === 404 || res.status === 501) {
    throw new NotImplementedError(capability);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, `not authorised to read ${capability}`);
  }
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; message?: string };
      detail = body.message ?? body.error ?? detail;
    } catch {
      // A non-JSON error body is still an error.
    }
    throw new ApiError(res.status, `${capability} could not be loaded: ${detail}`);
  }

  return (await res.json()) as T;
}

/**
 * apiPost is apiGet for the operations that change something.
 *
 * It classifies failures the same way, with one deliberate difference: a
 * mutation never returns an empty success. A request that could not be sent is
 * an error the caller must surface, because the alternative — a button that
 * looks as though it worked while nothing was asked of the cloud — is the most
 * damaging thing this product could render. The customer would believe a change
 * had been made.
 */
export async function apiPost<T>(path: string, capability: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  } catch (cause) {
    throw new ApiError(0, `${capability} could not be reached: ${String(cause)}`);
  }

  if (res.status === 404 || res.status === 501) {
    throw new NotImplementedError(capability);
  }
  if (res.status === 401 || res.status === 403) {
    throw new ApiError(res.status, `not authorised to ${capability}`);
  }
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const b = (await res.json()) as { error?: string; message?: string };
      detail = b.message ?? b.error ?? detail;
    } catch {
      // A non-JSON error body is still an error.
    }
    throw new ApiError(res.status, `${capability} failed: ${detail}`);
  }
  return (await res.json()) as T;
}
