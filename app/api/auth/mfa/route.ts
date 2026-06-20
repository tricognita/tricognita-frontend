import { verifySession, sessionCookieName } from "@/lib/auth";
import { enableMFA, disableMFA, findByEmail } from "@/lib/users";
import { generateMFASecret, verifyMFAToken } from "@/lib/mfa";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const user = await findByEmail(session.email);
  if (!user) return Response.json({ error: "user_not_found" }, { status: 404 });

  // Generate a new secret
  const mfa = generateMFASecret(user.email);
  
  return Response.json({
    secret: mfa.secret,
    uri: mfa.uri,
  });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: { action: "enable" | "disable"; secret?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.action === "disable") {
    await disableMFA(session.email);
    return Response.json({ ok: true });
  }

  if (body.action === "enable") {
    if (!body.secret || !body.code) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }

    const isValid = verifyMFAToken(body.secret, body.code);
    if (!isValid) {
      return Response.json({ error: "invalid_code" }, { status: 400 });
    }

    await enableMFA(session.email, body.secret);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "invalid_action" }, { status: 400 });
}
