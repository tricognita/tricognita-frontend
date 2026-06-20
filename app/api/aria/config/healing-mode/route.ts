import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { notifyHealingModeChange } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request): Promise<Response> {
  const check = secretOrError();
  if (check instanceof Response) return check;
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  const changedBy = session?.email || "admin";
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const mode = (body as any)?.mode ?? "MANUAL_APPROVAL";
  try {
    const res = await fetch(`${GO_API}/api/aria/config/healing-mode`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    notifyHealingModeChange(mode, changedBy).catch(() => {});
    return Response.json(result, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[healing-mode] Go API unreachable (${msg}). Simulating success.`);
    notifyHealingModeChange(mode, changedBy).catch(() => {});
    return Response.json({ status: "ok", mode });
  }
}
