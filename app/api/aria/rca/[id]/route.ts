export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);

  const check = secretOrError();
  if (check instanceof Response) return check;
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  try {
    const res = await fetch(`${GO_API}/api/aria/rca/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return Response.json(await res.json(), { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Go API unreachable: ${msg}` }, { status: 502 });
  }
}
