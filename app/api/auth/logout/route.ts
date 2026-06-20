import { cookies } from "next/headers";
import {
  sessionCookieName,
  refreshCookieName,
  verifySession,
  verifyRefreshToken,
} from "@/lib/auth";
import { revokeJti, deleteRefreshToken, recordSecurityEvent } from "@/lib/token-store";
import { clientIpFromHeaders } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const jar = await cookies();
  const accessToken  = jar.get(sessionCookieName())?.value;
  const refreshToken = jar.get(refreshCookieName())?.value;
  const ip = clientIpFromHeaders(req);
  const ua = req.headers.get("user-agent") ?? "";

  // Revoke the access token JTI immediately — stolen cookies stop working now
  if (accessToken) {
    const session = await verifySession(accessToken, "", false); // skip revocation check — we're revoking it
    if (session?.jti) {
      const remainingTtl = session.exp - Math.floor(Date.now() / 1000);
      await revokeJti(session.jti, Math.max(remainingTtl, 60)).catch(() => {});
      recordSecurityEvent({
        type: "token_revoked",
        email: session.email,
        ip, ua,
        ts: new Date().toISOString(),
        data: { jti: session.jti, reason: "logout" },
      }).catch(() => {});
    }
  }

  // Revoke the refresh token — prevent it being used after logout
  if (refreshToken) {
    const rp = await verifyRefreshToken(refreshToken);
    if (rp) {
      await deleteRefreshToken(refreshToken).catch(() => {});
      recordSecurityEvent({
        type: "logout",
        email: rp.email,
        ip, ua,
        ts: new Date().toISOString(),
        data: { refresh_jti: rp.jti },
      }).catch(() => {});
    }
  }

  const clearAccess  = `${sessionCookieName()}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`;
  const clearRefresh = `${refreshCookieName()}=; HttpOnly; Path=/api/auth/refresh; SameSite=Strict; Max-Age=0; Secure`;

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Clear both cookies
      "Set-Cookie": [clearAccess, clearRefresh].join(", "),
    },
  });
}
