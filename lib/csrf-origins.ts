/**
 * lib/csrf-origins.ts — the CSRF same-origin allowlist for state-changing
 * API requests (consumed by middleware.ts). Extracted into its own module so
 * the allowlist-building logic can be unit tested without constructing a
 * full NextRequest / Edge-runtime context.
 */

// PRODUCTION_ORIGINS is the permanent, non-configurable secure default.
// Always present; never removed, never overridden by any environment
// variable, in any environment.
export const PRODUCTION_ORIGINS: readonly string[] = [
  "https://tricognita.com",
  "https://www.tricognita.com",
];

/** The subset of process.env this module reads — a local type rather than
 * NodeJS.ProcessEnv itself, since ProcessEnv's index signature does not make
 * CSRF_DEV_ORIGINS a valid Pick key, and callers (including tests) should be
 * able to pass a bare plain object without satisfying every other env var. */
export interface CsrfOriginEnv {
  NODE_ENV?: string;
  CSRF_DEV_ORIGINS?: string;
}

/**
 * parseDevOrigins reads CSRF_DEV_ORIGINS — a comma-separated list of
 * ADDITIONAL origins to trust for local development (e.g.
 * `http://localhost:3100`), so the real login/CSRF path can be exercised by
 * a real browser against `next dev` without touching the production
 * allowlist.
 *
 * Read ONLY when NODE_ENV is not "production" — set unconditionally by
 * `next build`/`next start`; `next dev` sets NODE_ENV=development. A value
 * that leaks into a production environment (a stray env var, a
 * misconfigured platform) is therefore never honoured there regardless of
 * its content: the gate is the runtime environment, not variable presence.
 *
 * Each entry must parse as an exact http/https origin — scheme + host +
 * port only, no path, query, fragment, credentials, or wildcard. A
 * malformed entry is silently dropped, never treated as a reason to trust
 * more: fail closed means an operator's typo loses that one origin, not
 * gains every origin.
 */
export function parseDevOrigins(env: CsrfOriginEnv): string[] {
  if (env.NODE_ENV === "production") return [];
  const raw = env.CSRF_DEV_ORIGINS;
  if (!raw) return [];

  const out: string[] = [];
  for (const candidate of raw.split(",")) {
    const trimmed = candidate.trim();
    if (!trimmed || trimmed === "*") continue;

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      continue; // malformed: dropped, not trusted
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
    // Must be a bare origin: no path beyond "/", no query, no fragment, no
    // embedded credentials. Anything else means the operator meant
    // something other than an origin and it is rejected, not coerced.
    if (parsed.pathname !== "/" && parsed.pathname !== "") continue;
    if (parsed.search || parsed.hash || parsed.username || parsed.password) continue;

    out.push(parsed.origin);
  }
  return out;
}

/** buildAllowedOrigins is PRODUCTION_ORIGINS plus, outside production only,
 * whatever parseDevOrigins finds in CSRF_DEV_ORIGINS. */
export function buildAllowedOrigins(env: CsrfOriginEnv = process.env): Set<string> {
  return new Set([...PRODUCTION_ORIGINS, ...parseDevOrigins(env)]);
}

/**
 * isOriginAllowed checks one caller-supplied Origin header value against the
 * allowlist. Callers must pass the literal HTTP `Origin` header value —
 * never Referer, never a body field, never anything else the caller could
 * shape — and decide separately whether a check is needed at all (GET/HEAD/
 * OPTIONS are exempt in middleware.ts, which this function does not know
 * about). A missing Origin is never allowed.
 */
export function isOriginAllowed(origin: string | null, allowed: Set<string>): boolean {
  if (!origin) return false;
  return allowed.has(origin);
}
