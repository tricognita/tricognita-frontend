/**
 * test-csrf-origins.ts — CSRF allowed-origin allowlist verification.
 *
 * Run from frontend/:  npx tsx test-csrf-origins.ts
 *
 * The repo has no unit-test runner; ad-hoc verification scripts are the
 * convention (see CLAUDE.md and test-authz-boundary.ts). This exercises
 * lib/csrf-origins.ts directly — the exact logic middleware.ts's CSRF guard
 * is built from — never a mocked copy of it.
 */
import { buildAllowedOrigins, isOriginAllowed, parseDevOrigins, PRODUCTION_ORIGINS } from "./lib/csrf-origins";

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error("FAIL: " + name);
  }
}

// ── production/default origins accepted ─────────────────────────────────────
{
  const allowed = buildAllowedOrigins({ NODE_ENV: "production" });
  check("prod: apex origin accepted", isOriginAllowed("https://tricognita.com", allowed));
  check("prod: www origin accepted", isOriginAllowed("https://www.tricognita.com", allowed));

  const bare = buildAllowedOrigins({});
  const bareHasBothDefaults = PRODUCTION_ORIGINS.every((o) => bare.has(o));
  check("both production defaults present with no env at all", bareHasBothDefaults);
}

// ── localhost accepted only when explicitly configured ──────────────────────
{
  const configured = buildAllowedOrigins({
    NODE_ENV: "development",
    CSRF_DEV_ORIGINS: "http://localhost:3100,http://127.0.0.1:3100",
  });
  check("dev: localhost:3100 accepted when configured", isOriginAllowed("http://localhost:3100", configured));
  check("dev: 127.0.0.1:3100 accepted when configured", isOriginAllowed("http://127.0.0.1:3100", configured));
  check("dev: production origins still present alongside dev origins", isOriginAllowed("https://tricognita.com", configured));
}

// ── localhost rejected when not configured ───────────────────────────────────
{
  const unconfigured = buildAllowedOrigins({ NODE_ENV: "development" });
  check("dev: localhost rejected with CSRF_DEV_ORIGINS unset", !isOriginAllowed("http://localhost:3100", unconfigured));
  check("dev: parseDevOrigins returns nothing when unset", parseDevOrigins({ NODE_ENV: "development" }).length === 0);
}

// ── arbitrary origin rejected ─────────────────────────────────────────────────
{
  const configured = buildAllowedOrigins({
    NODE_ENV: "development",
    CSRF_DEV_ORIGINS: "http://localhost:3100",
  });
  check("arbitrary origin rejected even with dev origins configured", !isOriginAllowed("https://evil.example.com", configured));
  check("no origin header is never allowed", !isOriginAllowed(null, configured));
  check("wildcard origin string is never a literal match", !isOriginAllowed("*", configured));
}

// ── malformed/empty configuration fails closed ───────────────────────────────
{
  check("empty string → no dev origins", parseDevOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "" }).length === 0);
  check("wildcard entry dropped, not trusted", parseDevOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "*" }).length === 0);
  check("garbage string dropped, not trusted", parseDevOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "not a url at all" }).length === 0);
  check(
    "non-http(s) scheme dropped",
    parseDevOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "file:///etc/passwd,javascript:alert(1)" }).length === 0
  );
  check(
    "origin with a path is dropped, not truncated to its origin",
    parseDevOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "http://localhost:3100/some/path" }).length === 0
  );

  const mixedList = parseDevOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "not-a-url, http://localhost:3100" });
  const mixedListOk = mixedList.length === 1 && mixedList[0] === "http://localhost:3100";
  check("one malformed entry does not poison the whole list", mixedListOk);

  const malformedAllowed = buildAllowedOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "*, not a url" });
  const malformedOk = PRODUCTION_ORIGINS.every((o) => malformedAllowed.has(o)) && malformedAllowed.size === PRODUCTION_ORIGINS.length;
  check("malformed config still leaves production origins intact", malformedOk);
}

// ── production never inherits dev origins, even if the var is set there ─────
{
  const prodWithLeakedVar = buildAllowedOrigins({
    NODE_ENV: "production",
    CSRF_DEV_ORIGINS: "http://localhost:3100",
  });
  check("prod: CSRF_DEV_ORIGINS set anyway → localhost still rejected", !isOriginAllowed("http://localhost:3100", prodWithLeakedVar));
  check("prod: allowlist size unaffected by a leaked dev var", prodWithLeakedVar.size === PRODUCTION_ORIGINS.length);

  const leakedButProd = parseDevOrigins({ NODE_ENV: "production", CSRF_DEV_ORIGINS: "http://localhost:3100" });
  check("prod: parseDevOrigins itself returns nothing regardless of the var's content", leakedButProd.length === 0);
}

// ── exact scheme/host/port matching — no partial or prefix matches ──────────
{
  const allowed = buildAllowedOrigins({ NODE_ENV: "development", CSRF_DEV_ORIGINS: "http://localhost:3100" });
  check("wrong port rejected", !isOriginAllowed("http://localhost:9999", allowed));
  check("wrong scheme rejected", !isOriginAllowed("https://localhost:3100", allowed));
  check("subdomain of an allowed host is not implicitly trusted", !isOriginAllowed("https://evil.tricognita.com", allowed));
  check("prefix match is not a match", !isOriginAllowed("https://tricognita.com.evil.com", allowed));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All CSRF origin allowlist checks passed.");
