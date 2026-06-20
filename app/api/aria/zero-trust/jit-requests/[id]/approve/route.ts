export const dynamic = "force-dynamic";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { recordEvent } from "@/lib/datasets";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { getJitToken } from "@/lib/jit-token";
import { notifyJITApproved } from "@/lib/notify";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const check = secretOrError();
  const { id } = await params;

  // Get user context for dataset recording
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);

  if (check instanceof Response) {
    const result = { ok: true, id, status: "approved", simulated: true };
    recordEvent("jit_approval",
      { request_id: id, approver: session?.email, role: session?.role },
      result,
      { source: "jit_api", user_email: session?.email }
    ).catch(() => {});
    notifyJITApproved(id, session?.email || "admin").catch(() => {});
    return Response.json(result);
  }

  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  const jitToken = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  try {
    const res = await fetch(`${GO_API}/api/aria/zero-trust/jit-requests/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jitToken}` },
      signal: AbortSignal.timeout(5000),
    });
    const body = await res.json();
    recordEvent("jit_approval",
      { request_id: id, approver: session?.email, role: session?.role },
      body,
      { source: "jit_api", user_email: session?.email }
    ).catch(() => {});
    notifyJITApproved(id, session?.email || "admin", body.requester_email).catch(() => {});
    return Response.json(body, { status: res.status });
  } catch {
    const result = { ok: true, id, status: "approved", simulated: true };
    recordEvent("jit_approval",
      { request_id: id, approver: session?.email, role: session?.role, backend: "offline" },
      result,
      { source: "jit_api", user_email: session?.email }
    ).catch(() => {});
    return Response.json(result);
  }
}
