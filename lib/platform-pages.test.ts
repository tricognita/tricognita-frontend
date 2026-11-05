import { test } from "node:test";
import assert from "node:assert/strict";
import { isPlatformOnlyPage, PLATFORM_ONLY_PAGES } from "./dashboard-authz";

test("operator consoles are platform-only, including their sub-paths", () => {
  for (const p of PLATFORM_ONLY_PAGES) {
    assert.ok(isPlatformOnlyPage(p), p);
    assert.ok(isPlatformOnlyPage(p + "/anything"), p + "/anything");
  }
});

test("the customer-facing admin pages are not platform-only", () => {
  for (const p of ["/dashboard/admin/users", "/dashboard/admin/alert-routes", "/dashboard/admin/api-keys", "/dashboard/admin/settings", "/dashboard/overview", "/dashboard/audit-trail"]) {
    assert.equal(isPlatformOnlyPage(p), false, p);
  }
});

test("matching is by path segment, not string prefix", () => {
  assert.equal(isPlatformOnlyPage("/dashboard/admin/platformer"), false);
  assert.equal(isPlatformOnlyPage("/dashboard/admin/leadsheet"), false);
});

// Every page under admin/ in the legacy tree is either listed here or one of the customer pages.
import { readdirSync } from "node:fs";
test("no admin page directory is left unclassified", () => {
  const customer = new Set(["users", "alert-routes", "api-keys", "settings"]);
  const dirs = [
    ...readdirSync("app/dashboard/(legacy)/admin", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
    ...readdirSync("app/dashboard/(product)/admin", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
  ];
  for (const d of new Set(dirs)) {
    const path = `/dashboard/admin/${d}`;
    assert.ok(customer.has(d) || isPlatformOnlyPage(path), `${path} is neither a customer page nor a platform console: classify it`);
  }
});
