import "server-only";
import { GO_API } from "@/lib/jit-secret";
import type { Role } from "@/lib/auth";

/**
 * lib/identity-client.ts — Milestone F / F1.4 (Option B).
 *
 * Verifies credentials against the Go Identity API instead of the legacy BFF
 * store. Go owns credentials + Postgres; the BFF still issues the edge session
 * (this only replaces the verification step). Selected per-request by
 * IDENTITY_SOURCE=postgres in the login route; default keeps the legacy store,
 * so production is unchanged until the migration validation gate passes.
 */

// The subset of the legacy User shape the login flow needs. Field names match
// so callers can use `User | GoIdentity` interchangeably.
export interface GoIdentity {
  email: string;
  role: Role;
  tenantId: string;
  name: string;
  mustReset: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
}

/**
 * verifyViaGo — POST to the Go internal verify endpoint. Returns the identity on
 * success, null on invalid credentials, and THROWS on any other failure so the
 * caller returns 500 (never a false-positive login).
 */
export async function verifyViaGo(email: string, password: string): Promise<GoIdentity | null> {
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (!key) throw new Error("INTERNAL_SERVICE_KEY not configured");

  const res = await fetch(`${GO_API}/api/internal/auth/verify`, {
    method: "POST",
    headers: { Authorization: `Internal ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    // 30s, not a security relaxation: the audit-chain writes this endpoint's
    // own success path makes (see audit.Record) are several sequential DB
    // round trips, and against a remote validation database that can run to
    // a few seconds on its own — this just keeps a slow-but-legitimate
    // verification from being aborted before Go ever answers.
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`identity verify upstream ${res.status}`);

  const d = (await res.json()) as Record<string, unknown>;
  return {
    email: String(d.email ?? ""),
    role: String(d.role ?? "") as Role,
    tenantId: String(d.tenant_id ?? ""),
    name: String(d.name ?? ""),
    mustReset: Boolean(d.must_reset),
    mfaEnabled: Boolean(d.mfa_enabled),
    mfaSecret: d.mfa_secret ? String(d.mfa_secret) : null,
  };
}

// The profile shape /api/auth/me needs — no password, no mfaSecret (the
// Go profile endpoint never returns one; see api/identity.go handleGetProfile).
export interface GoProfile {
  email: string;
  role: Role;
  tenantId: string;
  name: string;
  mustReset: boolean;
  mfaEnabled: boolean;
  plan: string;
  status: string;
  modules: string[] | null;
}

/**
 * getProfileViaGo — GET the Go internal profile endpoint for an email whose
 * session was already verified at the edge (no password involved). Returns
 * the CURRENT Postgres profile, null if the account no longer exists or was
 * deactivated, and THROWS on any other failure. Used by /api/auth/me under
 * IDENTITY_SOURCE=postgres so role/tenant/plan never drift from the same
 * authoritative source login used — never trust the session payload alone
 * for these.
 */
export async function getProfileViaGo(email: string): Promise<GoProfile | null> {
  const key = process.env.INTERNAL_SERVICE_KEY;
  if (!key) throw new Error("INTERNAL_SERVICE_KEY not configured");

  const res = await fetch(
    `${GO_API}/api/internal/auth/profile?email=${encodeURIComponent(email)}`,
    {
      method: "GET",
      headers: { Authorization: `Internal ${key}` },
      // A single-row lookup, no audit-chain writes on this path — should be
      // fast, but the remote validation database can still add a few
      // seconds of round-trip, so give it real headroom rather than 10s.
      signal: AbortSignal.timeout(30_000),
    }
  );

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`identity profile upstream ${res.status}`);

  const d = (await res.json()) as Record<string, unknown>;
  return {
    email: String(d.email ?? ""),
    role: String(d.role ?? "") as Role,
    tenantId: String(d.tenant_id ?? ""),
    name: String(d.name ?? ""),
    mustReset: Boolean(d.must_reset),
    mfaEnabled: Boolean(d.mfa_enabled),
    plan: String(d.plan ?? ""),
    status: String(d.status ?? ""),
    modules: Array.isArray(d.modules) ? (d.modules as string[]) : null,
  };
}
