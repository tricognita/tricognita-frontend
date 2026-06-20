import { cookies } from "next/headers";
import { verifySession, sessionCookieName, signSession, sessionCookieOptions } from "@/lib/auth";
import { resetUserPassword } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * Mandatory rotation for bootstrap accounts.
 */
export async function POST(req: Request): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);

  if (!session) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Double check: is this user actually required to reset?
  if (!session.mustReset) {
    return Response.json(
      { error: "reset_not_required", message: "Password reset is not required for this session." },
      { status: 400 }
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const password = body.password ?? "";

  if (password.length < 12) {
    return Response.json(
      { error: "weak_password", message: "Production-grade passwords must be at least 12 characters." },
      { status: 400 }
    );
  }

  const success = await resetUserPassword(session.email, password);

  if (!success) {
    return Response.json({ error: "user_not_found" }, { status: 404 });
  }

  // Re-issue session cookie with mustReset: false
  const newToken = await signSession(session.email, session.role, session.tenantId, req.headers.get("user-agent") || "", false);
  
  const res = Response.json({ ok: true, message: "Password updated successfully." });
  res.headers.append("Set-Cookie", `${sessionCookieName()}=${newToken}; ${sessionCookieOptions()}`);

  return res;
}

