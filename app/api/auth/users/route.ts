import { cookies } from "next/headers";
import { verifySession, sessionCookieName, ROLES, type Role } from "@/lib/auth";
import { listUsers, inviteUser, sanitize, type UserPlan } from "@/lib/users";
import { notifyUserInvited } from "@/lib/notify";
import { recordServerAuditEvent } from "@/lib/server-audit";
import { resolveInviteTenant, canSeeTenant } from "@/lib/tenant-assign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS: UserPlan[] = ["free", "starter", "professional", "enterprise"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminSession = NonNullable<Awaited<ReturnType<typeof verifySession>>>;

async function requireAdmin(): Promise<AdminSession | Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "forbidden" }, { status: 403 });
  return session;
}

export async function GET(): Promise<Response> {
  const gate = await requireAdmin();
  if (gate instanceof Response) return gate;
  // Platform admins see everyone; a customer's admin only sees their own tenant.
  const users = (await listUsers()).filter((u) => canSeeTenant(gate.tenantId, u.tenantId));
  return Response.json({ users: users.map(sanitize) });
}

export async function POST(req: Request): Promise<Response> {
  const gate = await requireAdmin();
  if (gate instanceof Response) return gate;
  const session = gate;

  let body: {
    email?: string;
    name?: string;
    role?: string;
    plan?: string;
    modules?: string[];
    password?: string;
    tenantId?: string;
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

  const tenant = resolveInviteTenant(session.tenantId, body.tenantId);
  if (!tenant.ok) {
    return Response.json({ error: tenant.error }, { status: tenant.error === "invalid_tenant" ? 400 : 403 });
  }

  try {
    const user = await inviteUser({ email, name, role, plan, modules, tenantId: tenant.tenantId });
    notifyUserInvited(name, email, role, session.email || "admin").catch(() => {});
    await recordServerAuditEvent(session, "user.invited", { invited: email, role, tenant: tenant.tenantId });
    return Response.json({ user: sanitize(user) }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg === "email_exists" ? 409 : 500;
    return Response.json({ error: msg }, { status });
  }
}
