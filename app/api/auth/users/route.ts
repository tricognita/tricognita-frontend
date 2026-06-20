import { cookies } from "next/headers";
import { verifySession, sessionCookieName, ROLES, type Role } from "@/lib/auth";
import { listUsers, inviteUser, sanitize, type UserPlan } from "@/lib/users";
import { notifyUserInvited } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS: UserPlan[] = ["free", "starter", "professional", "enterprise"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin(): Promise<true | Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "forbidden" }, { status: 403 });
  return true;
}

export async function GET(): Promise<Response> {
  const gate = await requireAdmin();
  if (gate !== true) return gate;
  const users = await listUsers();
  return Response.json({ users: users.map(sanitize) });
}

export async function POST(req: Request): Promise<Response> {
  const gate = await requireAdmin();
  if (gate !== true) return gate;

  let body: {
    email?: string;
    name?: string;
    role?: string;
    plan?: string;
    modules?: string[];
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const role = body.role as Role | undefined;
  const plan = (body.plan as UserPlan | undefined) ?? "free";
  const modules = body.modules;

  if (!EMAIL_RE.test(email)) return Response.json({ error: "invalid_email" }, { status: 400 });
  if (name.length < 2) return Response.json({ error: "invalid_name" }, { status: 400 });
  if (!role || !ROLES.includes(role)) return Response.json({ error: "invalid_role" }, { status: 400 });
  if (!PLANS.includes(plan)) return Response.json({ error: "invalid_plan" }, { status: 400 });
  if (modules !== undefined && (!Array.isArray(modules) || !modules.every(m => typeof m === "string"))) {
    return Response.json({ error: "invalid_modules" }, { status: 400 });
  }

  try {
    const user = await inviteUser({ email, name, role, plan, modules });
    const jar2 = await cookies();
    const sess = await verifySession(jar2.get(sessionCookieName())?.value);
    notifyUserInvited(name, email, role, sess?.email || "admin").catch(() => {});
    return Response.json({ user: sanitize(user) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg === "email_exists" ? 409 : 500;
    return Response.json({ error: msg }, { status });
  }
}
