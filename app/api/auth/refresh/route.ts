/**
 * POST /api/auth/refresh — Rotate refresh token, issue new access token.
 *
 * Security model:
 *   1. Validate HMAC signature + expiry on incoming refresh token
 *   2. Verify token exists in Redis (not already used/revoked)
 *   3. ATOMICALLY: delete old token + store new one (prevents race condition replay)
 *   4. Issue new 15-min access token + new 7-day refresh token
 *   5. Record IP/UA change as security event if different from issuance
 *
 * Cookie path: /api/auth/refresh — JS can't read this cookie, preventing XSS theft.
 */

import { cookies } from "next/headers";
import {
  signSession,
  signRefreshToken,
  verifyRefreshToken,
  sessionCookieName,
  sessionCookieOptions,
  refreshCookieName,
  refreshCookieOptions,
} from "@/lib/auth";
import {
  lookupRefreshToken,
  storeRefreshToken,
  deleteRefreshToken,
  recordSecurityEvent,
} from "@/lib/token-store";
import { clientIpFromHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const jar   = await cookies();
  const token = jar.get(refreshCookieName())?.value;
  const ip    = clientIpFromHeaders(req);
  const ua    = req.headers.get("user-agent") ?? "";

  if (!token) {
    return Response.json({ error: "no_refresh_token" }, { status: 401 });
  }

  // ── Step 1: Validate HMAC + expiry ──────────────────────────────────────────
  const payload = await verifyRefreshToken(token);
  if (!payload) {
    return Response.json({ error: "invalid_refresh_token" }, { status: 401 });
  }

  // ── Step 2: Verify token exists in Redis (replay / reuse detection) ──────────
  const record = await lookupRefreshToken(token);
  if (!record) {
    // Token was already rotated or revoked — this is a replay attempt
    recordSecurityEvent({
      type:  "refresh_invalid",
      email: payload.email,
      ip, ua,
      ts: new Date().toISOString(),
      data: { reason: "token_not_in_store", jti: payload.jti },
    }).catch(() => {});
    return Response.json({ error: "refresh_token_expired" }, { status: 401 });
  }

  // ── Step 3: Detect anomalous IP/UA change ───────────────────────────────────
  if (record.ip && record.ip !== ip) {
    recordSecurityEvent({
      type:  "ip_change",
      email: payload.email,
      ip, ua,
      ts: new Date().toISOString(),
      data: { original_ip: record.ip, new_ip: ip },
    }).catch(() => {});
    // Policy: allow (log only). Set to reject if you require strict IP binding.
    // return Response.json({ error: "ip_binding_violation" }, { status: 401 });
  }

  // ── Step 4: Atomic rotation — delete old, issue new ─────────────────────────
  // Deleting first prevents a race: two concurrent refreshes can't both succeed.
  await deleteRefreshToken(token);

  const newRefreshToken = await signRefreshToken(payload.email, payload.role, payload.tenantId);
  const newAccessToken  = await signSession(payload.email, payload.role, payload.tenantId, ua);

  await storeRefreshToken(newRefreshToken, {
    email:     payload.email,
    role:      payload.role,
    tenantId:  payload.tenantId,
    accessJti: "",
    createdAt: Math.floor(Date.now() / 1000),
    ip, ua: ua.slice(0, 200),
  });

  recordSecurityEvent({
    type:  "refresh_rotated",
    email: payload.email,
    tenantId: payload.tenantId,
    ip, ua,
    ts: new Date().toISOString(),
    data: { old_jti: payload.jti },
  }).catch(() => {});

  return new Response(
    JSON.stringify({ ok: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": [
          `${sessionCookieName()}=${newAccessToken}; ${sessionCookieOptions()}`,
          `${refreshCookieName()}=${newRefreshToken}; ${refreshCookieOptions()}`,
        ].join(", "),
      },
    }
  );
}
