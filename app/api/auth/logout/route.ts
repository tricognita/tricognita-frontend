import { cookies } from "next/headers";
import {
  sessionCookieName,
  refreshCookieName,
  verifySession,
  verifyRefreshToken,
} from "@/lib/auth";
import { revokeJti, deleteRefreshToken, recordSecurityEvent } from "@/lib/token-store";
import { clientIpFromHeaders } from "@/lib/rate-limit";
import { recordServerAuditEvent } from "@/lib/server-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const jar = await cookies();
  const accessToken  = jar.get(sessionCookieName())?.value;
  const refreshToken = jar.get(refreshCookieName())?.value;
  const ip = clientIpFromHeaders(req);
  const ua = req.headers.get("user-agent") ?? "";
  // False when the shared revocation store could not be written: the cookie is still cleared
  // and the token is revoked on this instance, but another instance may accept it until it expires.
  let revokedEverywhere = true;

  // Revoke the access token JTI immediately — stolen cookies stop working now
  if (accessToken) {
    const session = await verifySession(accessToken, "", false); // skip revocation check — we're revoking it
    if (session) {
      await recordServerAuditEvent({ email: session.email, tenantId: session.tenantId, role: session.role }, "auth.logout", { ip });
    }
    if (session?.jti) {
      const remainingTtl = session.exp - Math.floor(Date.now() / 1000);
      // The token is already on this instance's revocation list; this is the shared store.
      await revokeJti(session.jti, Math.max(remainingTtl, 60)).catch(() => {
        revokedEverywhere = false;
      });
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

  // One Set-Cookie header per cookie: a comma-joined value is parsed as a single cookie, so the
  // second (the refresh cookie) was never cleared.
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", clearAccess);
  headers.append("Set-Cookie", clearRefresh);
  return new Response(JSON.stringify({ ok: true, revoked: revokedEverywhere }), { status: 200, headers });
}
