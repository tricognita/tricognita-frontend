import { cookies } from "next/headers";
import { verifySession, sessionCookieName, sessionCookieOptions } from "@/lib/auth";
import { findByEmail, deleteUser, sanitize } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/auth/account — self-service account deletion
// Deletes the currently authenticated user's account and clears their session.
export async function DELETE(): Promise<Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }

  const user = await findByEmail(session.email);
  if (!user) {
    return Response.json({ error: "user_not_found" }, { status: 404 });
  }

  try {
    await deleteUser(user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "last_admin") {
      return Response.json(
        { error: "last_admin", message: "You are the last admin. Transfer admin rights before deleting your account." },
        { status: 403 }
      );
    }
    return Response.json({ error: msg }, { status: 500 });
  }

  // Clear the session cookie
  return new Response(
    JSON.stringify({ ok: true, message: "Account deleted." }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `${sessionCookieName()}=; ${sessionCookieOptions()}; Max-Age=0`,
      },
    }
  );
}

// GET /api/auth/account — returns current user's public profile
export async function GET(): Promise<Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = await findByEmail(session.email);
  if (!user) {
    return Response.json({ error: "user_not_found" }, { status: 404 });
  }
  return Response.json({ user: sanitize(user) });
}
