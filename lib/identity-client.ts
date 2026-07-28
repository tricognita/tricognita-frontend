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
    signal: AbortSignal.timeout(10_000),
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
