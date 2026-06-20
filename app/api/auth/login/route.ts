import { signSession, signRefreshToken, sessionCookieName, sessionCookieOptions, refreshCookieName, refreshCookieOptions } from "@/lib/auth";
import { verifyPassword, touchLogin } from "@/lib/users";
import { checkLimit, recordFailure, clearOnSuccess, clientIpFromHeaders } from "@/lib/rate-limit";
import { verifyMFAToken } from "@/lib/mfa";
import { recordEvent } from "@/lib/datasets";
import { storeRefreshToken, recordSecurityEvent } from "@/lib/token-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Maximum body size: 2 KB. Prevents payload flooding.
const MAX_BODY_BYTES = 2 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "rate_limited", retryAfterSeconds: retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After":  String(retryAfter),
      },
    }
  );
}

function requestId(req: Request): string {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

export async function POST(req: Request): Promise<Response> {
  const rid = requestId(req);

  // ── Body size guard ──────────────────────────────────────────────────────────
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(
      JSON.stringify({ error: "payload_too_large" }),
      { status: 413, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: { email?: string; password?: string; mfaCode?: string; [k: string]: unknown };
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return new Response(
        JSON.stringify({ error: "payload_too_large" }),
        { status: 413, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
      );
    }
    body = JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json" }),
      { status: 400, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
    );
  }

  // ── Reject unknown fields (strict schema) ────────────────────────────────────
  const ALLOWED = new Set(["email", "password", "mfaCode"]);
  const unknown = Object.keys(body).filter(k => !ALLOWED.has(k));
  if (unknown.length > 0) {
    return new Response(
      JSON.stringify({ error: "unknown_fields", fields: unknown }),
      { status: 400, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
    );
  }

  // ── Field validation ─────────────────────────────────────────────────────────
  const email    = (typeof body.email    === "string" ? body.email    : "").trim().toLowerCase();
  const password =  typeof body.password === "string" ? body.password : "";

  if (!EMAIL_RE.test(email)) {
    return new Response(
      JSON.stringify({ error: "invalid_email" }),
      { status: 400, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
    );
  }
  if (password.length < 8 || password.length > 128) {
    return new Response(
      JSON.stringify({ error: "invalid_password" }),
      { status: 400, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
    );
  }

  // ── Rate limiting (IP + email keys, both must pass) ──────────────────────────
  const ip       = clientIpFromHeaders(req);
  const ipKey    = `ip:${ip}`;
  const emailKey = `email:${email}`;

  const ipCheck = await checkLimit(ipKey);
  if (!ipCheck.allowed) return rateLimitResponse(ipCheck.retryAfterSeconds);
  const emailCheck = await checkLimit(emailKey);
  if (!emailCheck.allowed) return rateLimitResponse(emailCheck.retryAfterSeconds);

  // ── Credential verification ──────────────────────────────────────────────────
  try {
    const user = await verifyPassword(email, password);
    if (!user) {
      await recordFailure(ipKey);
      await recordFailure(emailKey);
      // Constant-time: same response regardless of whether email exists
      return new Response(
        JSON.stringify({ error: "invalid_credentials" }),
        { status: 401, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
      );
    }

    // ── MFA check ──────────────────────────────────────────────────────────────
    if (user.mfaEnabled && user.mfaSecret) {
      const mfaCode = typeof body.mfaCode === "string" ? body.mfaCode : "";
      if (!mfaCode) {
        return new Response(
          JSON.stringify({ ok: true, mfa_required: true }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
        );
      }
      if (!verifyMFAToken(user.mfaSecret, mfaCode)) {
        await recordFailure(ipKey);
        await recordFailure(emailKey);
        return new Response(
          JSON.stringify({ error: "invalid_mfa_code" }),
          { status: 401, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
        );
      }
    }

    // ── Success path ───────────────────────────────────────────────────────────
    await clearOnSuccess(ipKey);
    await clearOnSuccess(emailKey);
    await touchLogin(email);

    // Bind access token to the client's User-Agent fingerprint
    const userAgent    = req.headers.get("user-agent") ?? "";
    const accessToken  = await signSession(user.email, user.role, user.tenantId, userAgent, user.mustReset);
    const refreshToken = await signRefreshToken(user.email, user.role, user.tenantId);

    // Persist refresh token in Redis for server-side rotation + revocation
    storeRefreshToken(refreshToken, {
      email:     user.email,
      role:      user.role,
      tenantId:  user.tenantId,
      accessJti: "",
      createdAt: Math.floor(Date.now() / 1000),
      ip,
      ua:        userAgent.slice(0, 200),
    }).catch(() => {});

    // Security telemetry
    recordSecurityEvent({
      type:  "login_success",
      email: user.email,
      tenantId: user.tenantId,
      ip, ua: userAgent,
      ts: new Date().toISOString(),
      data: { role: user.role },
    }).catch(() => {});

    // Fire-and-forget dataset event
    recordEvent(
      "user_login",
      { email: user.email, role: user.role },
      { success: true, ts: new Date().toISOString() },
      { source: "auth_login", user_email: user.email }
    ).catch(() => {});

    return new Response(
      JSON.stringify({ ok: true, email: user.email, role: user.role, name: user.name }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": rid,
          "Set-Cookie": [
            `${sessionCookieName()}=${accessToken}; ${sessionCookieOptions()}`,
            `${refreshCookieName()}=${refreshToken}; ${refreshCookieOptions()}`,
          ].join(", "),
        },
      }
    );
  } catch {
    // NEVER expose internal error messages to the client — log server-side only
    console.error(`[auth/login] rid=${rid} internal error`);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { "Content-Type": "application/json", "X-Request-ID": rid } }
    );
  }
}
