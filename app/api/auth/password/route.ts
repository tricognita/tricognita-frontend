import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { changePassword } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/password — change password for the currently logged-in user.
export async function POST(req: Request): Promise<Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: { current?: string; next?: string };
  try { body = await req.json(); }
  catch { return Response.json({ error: "invalid_body" }, { status: 400 }); }

  const currentPw = body.current ?? "";
  const nextPw    = body.next    ?? "";

  if (!currentPw) return Response.json({ error: "current_password_required" }, { status: 400 });
  if (nextPw.length < 8) return Response.json(
    { error: "password_too_short", message: "New password must be at least 8 characters." },
    { status: 400 }
  );

  const result = await changePassword(session.email, currentPw, nextPw);

  if (result === "wrong_password") {
    return Response.json({ error: "wrong_password", message: "Current password is incorrect." }, { status: 401 });
  }
  if (result === "not_found") {
    return Response.json({ error: "user_not_found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
