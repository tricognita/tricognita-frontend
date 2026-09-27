/**
 * test-auth-me.ts — /api/auth/me Postgres identity-bridge verification (D1).
 *
 * Run from frontend/, against the running dev server (localhost:3100) with
 * IDENTITY_SOURCE=postgres and the live Go API reachable, and SCRATCH_DIR
 * pointing at the directory holding the synthetic e2e-* user passwords:
 *   SCRATCH_DIR=/path/to/scratch npx tsx test-auth-me.ts
 *
 * The repo has no unit-test runner; ad-hoc verification scripts are the
 * convention (see CLAUDE.md and test-csrf-origins.ts). This exercises the
 * real HTTP route end-to-end — login, session cookie, /api/auth/me — never a
 * mocked copy of the handler.
 */
import { readFileSync } from "fs";
import { createHmac } from "crypto";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3100";

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${name}${detail ? " — " + detail : ""}`);
  } else {
    console.log(`ok: ${name}`);
  }
}

function parseSetCookie(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  // fetch() folds multiple Set-Cookie headers into one comma-joined string;
  // this repo's own login route joins them the same way, so split on the
  // cookie-name boundary rather than on every comma.
  const parts = setCookieHeader.split(/, (?=[a-zA-Z0-9_]+=)/);
  for (const part of parts) {
    if (part.startsWith(name + "=")) {
      return part.split(";")[0].slice(name.length + 1);
    }
  }
  return null;
}

async function loginAndGetSessionCookie(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    // middleware's CSRF guard requires a matching Origin on state-changing
    // requests (see lib/csrf-origins.ts) — a browser sends this
    // automatically; a plain fetch() from a script does not, so it's set
    // explicitly here (CSRF_DEV_ORIGINS must list this origin).
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) return null;
  return parseSetCookie(res.headers.get("set-cookie"), "trico_session");
}

async function meWithCookie(cookie: string | null): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const res = await fetch(`${BASE}/api/auth/me`, {
    headers: cookie ? { Cookie: `trico_session=${cookie}` } : {},
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: res.status, body };
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Mints a session token in the exact payload.signature shape lib/auth.ts's
// signSession/verifySession use (HMAC-SHA256 over the base64url payload).
// lib/auth.ts itself pulls in lib/env.ts, which is `import "server-only"` —
// it throws unconditionally outside a Next.js server bundle, so it can't be
// imported into this plain-node test script. This is a minimal test-only
// replica of the signing format, not a copy of application logic, and lets
// this test mint sessions signSession itself has no way to produce (an
// already-expired exp, an email that doesn't exist in Postgres).
function signTestSession(email: string, role: string, tenantId: string, expOffsetSeconds: number): string {
  const secret = process.env.SENTINEL_JIT_SECRET;
  if (!secret) throw new Error("SENTINEL_JIT_SECRET not set in test environment");
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email,
    role,
    tenantId,
    exp: now + expOffsetSeconds,
    iat: now,
    jti: "test-" + now + "-" + Math.random().toString(36).slice(2),
    uat: "none",
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${base64url(sig)}`;
}

async function main() {
  const scratch = process.env.SCRATCH_DIR;
  if (!scratch) {
    console.error("SCRATCH_DIR not set — cannot read synthetic test-user passwords");
    process.exit(1);
  }

  const users: Array<{ label: string; email: string; role: string; pwFile: string }> = [
    { label: "ADMIN", email: "e2e-admin@tricognita-validation.local", role: "ADMIN", pwFile: "e2e-admin@tricognita-validation.local.pw" },
    { label: "SECOPS", email: "e2e-secops@tricognita-validation.local", role: "SECOPS", pwFile: "e2e-secops@tricognita-validation.local.pw" },
    { label: "AUDITOR", email: "e2e-auditor@tricognita-validation.local", role: "AUDITOR", pwFile: "e2e-auditor@tricognita-validation.local.pw" },
  ];

  for (const u of users) {
    const pw = readFileSync(`${scratch}/${u.pwFile}`, "utf8").trim();
    const cookie = await loginAndGetSessionCookie(u.email, pw);
    check(`${u.label}: login succeeds`, cookie !== null);
    if (!cookie) continue;

    const { status, body } = await meWithCookie(cookie);
    check(`${u.label}: /api/auth/me returns 200`, status === 200, `got ${status}`);
    check(`${u.label}: authenticated=true`, body?.authenticated === true, `got ${JSON.stringify(body)}`);
    check(`${u.label}: role=${u.role}`, body?.role === u.role, `got ${body?.role}`);
    check(`${u.label}: email matches`, body?.email === u.email, `got ${body?.email}`);
    check(`${u.label}: no password/hash/secret leaked`, !JSON.stringify(body).match(/password|hash|salt|mfa_secret/i));
  }

  // Unknown/nonexistent identity: a validly-signed session for an email that
  // does not exist in Postgres must NOT be treated as authenticated.
  {
    const cookie = signTestSession(
      `nobody-${Date.now()}@tricognita-validation.local`,
      "ADMIN",
      "00000000-0000-0000-0000-000000000000",
      900
    );
    const { status, body } = await meWithCookie(cookie);
    check("unknown identity: /api/auth/me returns 401", status === 401, `got ${status}`);
    check("unknown identity: authenticated=false", body?.authenticated === false);
  }

  // Expired session: valid signature, but exp is in the past. This (and the
  // two cases below) are actually rejected by middleware.ts's own session
  // gate before the request ever reaches app/api/auth/me/route.ts — that
  // gate returns {error:"unauthenticated", ...}, a different shape than the
  // route's own {authenticated:false} — so only the status code is a
  // meaningful assertion here; both layers agree the session is invalid.
  {
    const cookie = signTestSession("e2e-admin@tricognita-validation.local", "ADMIN", "irrelevant", -3600);
    const { status, body } = await meWithCookie(cookie);
    check("expired session: /api/auth/me returns 401", status === 401, `got ${status}`);
    check("expired session: not authenticated", body?.authenticated !== true, `got ${JSON.stringify(body)}`);
  }

  // Invalid session: garbage cookie value.
  {
    const { status, body } = await meWithCookie("not-a-real-token.garbage");
    check("invalid session: /api/auth/me returns 401", status === 401, `got ${status}`);
    check("invalid session: not authenticated", body?.authenticated !== true, `got ${JSON.stringify(body)}`);
  }

  // Missing session entirely.
  {
    const { status, body } = await meWithCookie(null);
    check("no session: /api/auth/me returns 401", status === 401, `got ${status}`);
    check("no session: not authenticated", body?.authenticated !== true, `got ${JSON.stringify(body)}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main();
