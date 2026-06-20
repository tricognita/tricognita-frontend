export const dynamic = "force-dynamic";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { notifyJITRejected } from "@/lib/notify";

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
    notifyJITRejected(id, rejectedBy, undefined, session?.tenantId).catch(() => {});
    return Response.json({ ok: true, id, status: "rejected", simulated: true });
  }
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  try {
    const res = await fetch(`${GO_API}/api/aria/zero-trust/jit-requests/${id}/reject`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json();
    // Try to notify the requester if the body contains their email
    notifyJITRejected(id, rejectedBy, body.requester_email, session.tenantId).catch(() => {});
    return Response.json(body, { status: res.status });
  } catch {
    notifyJITRejected(id, rejectedBy, undefined, session.tenantId).catch(() => {});
    return Response.json({ ok: true, id, status: "rejected", simulated: true });
  }
}
