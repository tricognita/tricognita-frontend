/**
 * Tenant assignment rules for invited users.
 *
 * - The platform tenant ("tricognita-global") belongs to the Tricognita operator.
 * - Only a platform admin may create a user in a *different* tenant (this is how
 *   the first admin of a new customer tenant is created).
 * - Every other admin can only invite into their own tenant.
 * - Tenant ids are lowercase slugs so they are safe in URLs, JWT claims and SQL keys.
 */
export const PLATFORM_TENANT = "tricognita-global";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export type TenantDecision =
  | { ok: true; tenantId: string }
  | { ok: false; error: "invalid_tenant" | "forbidden_tenant" };

export function isValidTenantSlug(v: unknown): v is string {
  return typeof v === "string" && SLUG_RE.test(v);
}

export function resolveInviteTenant(sessionTenantId: string, requested: unknown): TenantDecision {
  if (requested === undefined || requested === null || requested === "") {
    return { ok: true, tenantId: sessionTenantId };
  }
  if (!isValidTenantSlug(requested)) return { ok: false, error: "invalid_tenant" };
  if (requested === sessionTenantId) return { ok: true, tenantId: requested };
  if (sessionTenantId !== PLATFORM_TENANT) return { ok: false, error: "forbidden_tenant" };
  return { ok: true, tenantId: requested };
}

/** Which users a given admin may see: platform admins see everyone, others their own tenant. */
export function canSeeTenant(sessionTenantId: string, userTenantId: string | undefined): boolean {
  if (sessionTenantId === PLATFORM_TENANT) return true;
  return (userTenantId ?? PLATFORM_TENANT) === sessionTenantId;
}
