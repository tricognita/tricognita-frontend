/**
 * Run from frontend/:  npx tsx test-tenant-assignment.ts
 * Verifies the tenant rules for invited users (lib/tenant-assign.ts).
 */
import { PLATFORM_TENANT, resolveInviteTenant, canSeeTenant, isValidTenantSlug } from "./lib/tenant-assign";

let failures = 0;
function check(name: string, cond: boolean) { if (!cond) { failures++; console.error("FAIL: " + name); } }

// default: inherit the inviter's tenant (never silently the platform tenant)
check("customer admin default → own tenant", JSON.stringify(resolveInviteTenant("acme-startup", undefined)) === JSON.stringify({ ok: true, tenantId: "acme-startup" }));
check("empty string → own tenant", (resolveInviteTenant("acme-startup", "") as any).tenantId === "acme-startup");

// platform admin may create a user in a new customer tenant
check("platform admin → new tenant ok", JSON.stringify(resolveInviteTenant(PLATFORM_TENANT, "uni-pilot-1")) === JSON.stringify({ ok: true, tenantId: "uni-pilot-1" }));

// customer admin cannot target another tenant, including the platform tenant
check("customer admin → other tenant forbidden", (resolveInviteTenant("acme-startup", "other-co") as any).error === "forbidden_tenant");
check("customer admin → platform tenant forbidden", (resolveInviteTenant("acme-startup", PLATFORM_TENANT) as any).error === "forbidden_tenant");
check("customer admin → same tenant ok", (resolveInviteTenant("acme-startup", "acme-startup") as any).ok === true);

// slug validation
for (const bad of ["Acme", "a", "-bad", "bad_slug", "has space", "x".repeat(64), "../etc", "a;drop", 42, {}]) {
  check(`invalid slug rejected: ${String(bad).slice(0, 20)}`, !isValidTenantSlug(bad));
  check(`invalid slug refused by resolver: ${String(bad).slice(0, 20)}`, (resolveInviteTenant(PLATFORM_TENANT, bad) as any).error === "invalid_tenant");
}
check("valid slug accepted", isValidTenantSlug("uni-pilot-1"));

// visibility: platform admin sees all; others only their own; legacy users (no tenant) belong to platform
check("platform admin sees customer user", canSeeTenant(PLATFORM_TENANT, "acme-startup"));
check("customer admin sees own users", canSeeTenant("acme-startup", "acme-startup"));
check("customer admin does NOT see other tenant", !canSeeTenant("acme-startup", "other-co"));
check("customer admin does NOT see platform users", !canSeeTenant("acme-startup", PLATFORM_TENANT));
check("legacy user without tenant is platform-owned", !canSeeTenant("acme-startup", undefined));

if (failures) { console.error(`\n${failures} tenant-assignment assertion(s) FAILED`); process.exit(1); }
console.log("PASS: all tenant assignment assertions passed.");
