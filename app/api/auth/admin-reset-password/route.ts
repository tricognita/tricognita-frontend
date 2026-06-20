import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { findById, adminResetPassword, sanitize } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PW_MIN = 12;

export async function POST(req: Request): Promise<Response> {
  // Only ADMINs may force-reset another user's password
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "forbidden" }, { status: 403 });

  let body: { userId?: string; tempPassword?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const { userId, tempPassword } = body;
  if (!userId || typeof userId !== "string") {
    return Response.json({ error: "missing_user_id" }, { status: 400 });
  }
  if (!tempPassword || typeof tempPassword !== "string" || tempPassword.length < PW_MIN) {
    return Response.json(
      { error: "password_too_short", message: `Temporary password must be ≥ ${PW_MIN} characters` },
      { status: 400 }
    );
  }

  // Prevent admin from resetting their own password via this endpoint
  // (they should use the change-password flow instead)
  const target = await findById(userId);
  if (!target) return Response.json({ error: "not_found" }, { status: 404 });

  const updated = await adminResetPassword(userId, tempPassword);
  if (!updated) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json({
    user: sanitize(updated),
    mustReset: true,
    message: "Password reset. User must change it on next login.",
  });
}
