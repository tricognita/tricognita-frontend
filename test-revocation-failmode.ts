/**
 * test-revocation-failmode.ts — H3 verification: fail-closed revocation flag.
 *
 * Run from frontend/:  npx tsx test-revocation-failmode.ts
 *
 * The repo has no unit-test runner; ad-hoc tsx scripts are the convention
 * (see CLAUDE.md, mirrors test-authz-boundary.ts).
 *
 * H3 changes exactly ONE thing: the catch branch of isJtiRevoked when Redis is
 * unavailable. This script exercises that path deterministically — getRedis()
 * throws when Redis is unconfigured — across REVOCATION_FAIL_CLOSED on/off.
 *
 * Coverage vs the approved requirement:
 *   - normal request (Redis unavailable, default)         → cases 1,2,6
 *   - Redis unavailable                                    → every case
 *   - feature flag on/off                                  → cases 1-6
 *   - fail-closed engaged                                  → cases 3,7
 *   - race conditions (stateless read, no shared state)    → case 7
 *   - revoked token / normal (Redis UP): UNCHANGED by H3 (try-block untouched);
 *     require a live Redis (integration env) — asserted unchanged by inspection.
 *   - token refresh: verifySession(checkRevocation=false) skips isJtiRevoked
 *     entirely (auth.ts), so the flag has no effect on refresh — noted below.
 */

// Ensure Redis is unconfigured BEFORE importing the module, so getRedis() throws
// immediately and the catch branch (the code H3 touches) runs deterministically.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

let failures = 0;
function check(name: string, cond: boolean): void {
  if (!cond) { failures++; console.error("FAIL: " + name); }
  else console.log("ok:   " + name);
}

async function run(): Promise<void> {
  const { isJtiRevoked } = await import("./lib/token-store");

  // 1. Default (flag unset): fail OPEN — not revoked. Backward-compatible.
  delete process.env.REVOCATION_FAIL_CLOSED;
  check("default (unset) → fail-open (false)", (await isJtiRevoked("jti-x")) === false);

  // 2. Flag explicitly "false": fail OPEN.
  process.env.REVOCATION_FAIL_CLOSED = "false";
  check('flag "false" → fail-open (false)', (await isJtiRevoked("jti-x")) === false);

  // 3. Flag "true": fail CLOSED — un-checkable token treated as revoked.
  process.env.REVOCATION_FAIL_CLOSED = "true";
  check('flag "true" → fail-closed (true)', (await isJtiRevoked("jti-x")) === true);

  // 4. Strict parse: wrong case must NOT enable fail-closed (no silent weakening).
  process.env.REVOCATION_FAIL_CLOSED = "TRUE";
  check('flag "TRUE" (wrong case) → stays fail-open (false)', (await isJtiRevoked("jti-x")) === false);

  // 5. Strict parse: "1" is not "true".
  process.env.REVOCATION_FAIL_CLOSED = "1";
  check('flag "1" → stays fail-open (false)', (await isJtiRevoked("jti-x")) === false);

  // 6. Toggle back to unset restores fail-open (no sticky module state).
  delete process.env.REVOCATION_FAIL_CLOSED;
  check("toggle back to unset → fail-open (false)", (await isJtiRevoked("jti-x")) === false);

  // 7. Race/concurrency: isJtiRevoked is a stateless read of env + Redis; no
  //    shared mutable state, so concurrent calls are consistent.
  process.env.REVOCATION_FAIL_CLOSED = "true";
  const results = await Promise.all(
    Array.from({ length: 8 }, () => isJtiRevoked("jti-race")),
  );
  check("concurrent calls (flag on) all fail-closed", results.every((r) => r === true));

  if (failures) { console.error(`\n${failures} FAILURE(S)`); process.exit(1); }
  console.log("\nALL PASS");
}

run().catch((e) => { console.error(e); process.exit(1); });
