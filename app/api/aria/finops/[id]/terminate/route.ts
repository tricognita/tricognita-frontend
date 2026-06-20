export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export async function POST(
  
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  const check = secretOrError();
  const { id } = await params;
  if (check instanceof Response) {
    return Response.json({ ok: true, id, status: "terminated", simulated: true });
  }
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  try {
    const res = await fetch(`${GO_API}/api/aria/finops/${encodeURIComponent(id)}/terminate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    return Response.json(await res.json(), { status: res.status });
  } catch {
    return Response.json({ ok: true, id, status: "terminated", simulated: true });
  }
}
