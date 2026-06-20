export const dynamic = "force-dynamic";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { notifyActionRejected } from "@/lib/notify";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const check = secretOrError();
  const { id } = await params;
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  const rejectedBy = session?.email || "admin";

  if (check instanceof Response) {
    notifyActionRejected(id, "Remediation", rejectedBy).catch(() => {});
    return Response.json({ ok: true, id, status: "rejected", simulated: true });
  }
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  try {
    const res = await fetch(`${GO_API}/api/aria/actions/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json();
    notifyActionRejected(id, body.action_type || "Remediation", rejectedBy).catch(() => {});
    return Response.json(body, { status: res.status });
  } catch {
    notifyActionRejected(id, "Remediation", rejectedBy).catch(() => {});
    return Response.json({ ok: true, id, status: "rejected", simulated: true });
  }
}
