import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { findByEmail } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  const user = await findByEmail(session.email);
  if (!user) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  return Response.json({
    authenticated: true,
    email: session.email,
    role: session.role,
    exp: session.exp,
    plan: user.plan,
    mfaEnabled: user.mfaEnabled,
    modules: user.modules,
  });
}
