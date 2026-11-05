import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { findByEmail } from "@/lib/users";
import { getProfileViaGo } from "@/lib/identity-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  // F1.4 (Option B): re-check against the SAME authoritative identity source
  // login used, so role/plan/modules never drift from what Postgres says
  // right now — never just echo the session payload back. The legacy file
  // store has no notion of Postgres-sourced users, so it must not be
  // consulted on this path.
  if (process.env.IDENTITY_SOURCE === "postgres") {
    let profile;
    try {
      profile = await getProfileViaGo(session.email);
    } catch {
      return Response.json({ authenticated: false }, { status: 401 });
    }
    if (!profile) {
      return Response.json({ authenticated: false }, { status: 401 });
    }
    return Response.json({
      authenticated: true,
      email: profile.email,
      role: profile.role,
      exp: session.exp,
      plan: profile.plan,
      mfaEnabled: profile.mfaEnabled,
      modules: profile.modules,
    });
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
