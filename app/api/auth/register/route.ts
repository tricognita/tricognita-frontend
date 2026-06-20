import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { registerUser, sanitize } from "@/lib/users";
import { notifyNewUser } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register — gated self-service signup
// Disabled by default; set ENABLE_OPEN_REGISTRATION="true" to permit.
export async function POST(req: Request): Promise<Response> {
  if (process.env.ENABLE_OPEN_REGISTRATION !== "true") {
    return Response.json(
      { error: "registration_disabled", message: "New accounts are invite-only." },
      { status: 403 }
    );
  }
  // Reject if already authenticated
  const jar = await cookies();
  const existing = await verifySession(jar.get(sessionCookieName())?.value);
  if (existing) {
    return Response.json({ error: "already_authenticated" }, { status: 400 });
  }

  let body: { email?: string; name?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const email    = (body.email    ?? "").trim().toLowerCase();
  const name     = (body.name     ?? "").trim();
  const password = body.password  ?? "";

  if (!EMAIL_RE.test(email))   return Response.json({ error: "invalid_email",     message: "Enter a valid email address."         }, { status: 400 });
  if (name.length < 2)         return Response.json({ error: "invalid_name",      message: "Name must be at least 2 characters."  }, { status: 400 });
  if (password.length < 12)    return Response.json({ error: "password_too_short",message: "Password must be at least 12 characters."}, { status: 400 });

  try {
    const user = await registerUser({ email, name, password });
    // Notify admin + welcome email to the new user
    notifyNewUser(name, email, user.role).catch(() => {});
    return Response.json({ user: sanitize(user) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "email_exists") {
      return Response.json(
        { error: "email_exists", message: "An account with this email already exists." },
        { status: 409 }
      );
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
