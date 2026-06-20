import { cookies } from "next/headers";
import { verifySession, sessionCookieName, ROLES, type Role } from "@/lib/auth";
import {
  updateRole, setStatus, sanitize, findByEmail, findById,
  updateModules, updatePlan, deleteUser, adminResetPassword,
  type UserPlan,
} from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS: UserPlan[] = ["free", "starter", "professional", "enterprise"];

async function requireAdmin(): Promise<
  { ok: true; selfEmail: string; selfId: string } | Response
> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "unauthenticated" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "forbidden" }, { status: 403 });
  const self = await findByEmail(session.email);
  return { ok: true, selfEmail: session.email, selfId: self?.id ?? "" };
}

function lastAdminResponse(): Response {
  return Response.json(
    { error: "last_admin", message: "Cannot downgrade last admin" },
    { status: 403 }
  );
}

// ── PUT (existing — role / status / modules) ──────────────────────────────────

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const gate = await requireAdmin();
  if (gate instanceof Response) return gate;
  const { id } = await ctx.params;

  let body: { role?: string; status?: string; modules?: string[]; plan?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const self = await findByEmail(gate.selfEmail);

  if (body.role !== undefined) {
    const role = body.role as Role;
    if (!ROLES.includes(role)) return Response.json({ error: "invalid_role" }, { status: 400 });
    if (self && self.id === id && self.role === "ADMIN" && role !== "ADMIN") {
      return lastAdminResponse();
    }
    try {
      const updated = await updateRole(id, role);
      if (!updated) return Response.json({ error: "not_found" }, { status: 404 });
      return Response.json({ user: sanitize(updated) });
    } catch (err) {
      if (err instanceof Error && err.message === "last_admin") return lastAdminResponse();
      throw err;
    }
  }

  if (body.status !== undefined) {
    const status = body.status;
    if (status !== "active" && status !== "deactivated" && status !== "invite") {
      return Response.json({ error: "invalid_status" }, { status: 400 });
    }
    if (self && self.id === id && status === "deactivated") {
      return Response.json({ error: "cannot_deactivate_self" }, { status: 400 });
    }
    try {
      const updated = await setStatus(id, status);
      if (!updated) return Response.json({ error: "not_found" }, { status: 404 });
      return Response.json({ user: sanitize(updated) });
    } catch (err) {
      if (err instanceof Error && err.message === "last_admin") return lastAdminResponse();
      throw err;
    }
  }

  if (body.modules !== undefined) {
    if (!Array.isArray(body.modules) || !body.modules.every(m => typeof m === "string")) {
      return Response.json({ error: "invalid_modules" }, { status: 400 });
    }
    const updated = await updateModules(id, body.modules);
    if (!updated) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ user: sanitize(updated) });
  }

  if (body.plan !== undefined) {
    if (!PLANS.includes(body.plan as UserPlan)) {
      return Response.json({ error: "invalid_plan" }, { status: 400 });
    }
    const updated = await updatePlan(id, body.plan as UserPlan);
    if (!updated) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ user: sanitize(updated) });
  }

  return Response.json({ error: "nothing_to_update" }, { status: 400 });
}

// ── PATCH (bulk update: role + plan + modules in one call) ────────────────────

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const gate = await requireAdmin();
  if (gate instanceof Response) return gate;
  const { id } = await ctx.params;

  let body: { role?: string; plan?: string; modules?: string[]; status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const target = await findById(id);
  if (!target) return Response.json({ error: "not_found" }, { status: 404 });

  const self = await findByEmail(gate.selfEmail);

  // Apply changes sequentially in a safe order: role → plan → modules → status
  if (body.role !== undefined) {
    const role = body.role as Role;
    if (!ROLES.includes(role)) return Response.json({ error: "invalid_role" }, { status: 400 });
    if (self && self.id === id && self.role === "ADMIN" && role !== "ADMIN") {
      return lastAdminResponse();
    }
    try {
      await updateRole(id, role);
    } catch (err) {
      if (err instanceof Error && err.message === "last_admin") return lastAdminResponse();
      throw err;
    }
  }

  if (body.plan !== undefined) {
    if (!PLANS.includes(body.plan as UserPlan)) {
      return Response.json({ error: "invalid_plan" }, { status: 400 });
    }
    await updatePlan(id, body.plan as UserPlan);
  }

  if (body.modules !== undefined) {
    if (!Array.isArray(body.modules) || !body.modules.every(m => typeof m === "string")) {
      return Response.json({ error: "invalid_modules" }, { status: 400 });
    }
    await updateModules(id, body.modules);
  }

  if (body.status !== undefined) {
    const s = body.status;
    if (s !== "active" && s !== "deactivated" && s !== "invite") {
      return Response.json({ error: "invalid_status" }, { status: 400 });
    }
    if (self && self.id === id && s === "deactivated") {
      return Response.json({ error: "cannot_deactivate_self" }, { status: 400 });
    }
    try {
      await setStatus(id, s);
    } catch (err) {
      if (err instanceof Error && err.message === "last_admin") return lastAdminResponse();
      throw err;
    }
  }

  // Re-fetch final state after all mutations
  const updated = await findById(id);
  if (!updated) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ user: sanitize(updated) });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<Response> {
  const gate = await requireAdmin();
  if (gate instanceof Response) return gate;
  const { id } = await ctx.params;

  // Prevent self-deletion
  if (gate.selfId && gate.selfId === id) {
    return Response.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  try {
    const ok = await deleteUser(id);
    if (!ok) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (err) {
    if (err instanceof Error && err.message === "last_admin") return lastAdminResponse();
    throw err;
  }
}
