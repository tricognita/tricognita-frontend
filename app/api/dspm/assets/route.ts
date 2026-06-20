import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) return check;
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  try {
    const upstream = await fetch(`${GO_API}/api/dspm/assets${qs ? "?" + qs : ""}`, {
      headers: { Authorization: `Bearer ${token}`, "X-Initiated-By": session.email },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return upstream;
    return Response.json(await upstream.json());
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "backend_unreachable", message: "No data available. Connect a cloud environment to begin scanning.", detail }, { status: 502 });
  }
}

// POST — trigger classification for tenant
export async function POST(): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) {
    return Response.json({ queued: true, message: "Classification queued (simulation).", simulated: true });
  }
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  try {
    const upstream = await fetch(`${GO_API}/api/dspm/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Initiated-By": session.email,
        "X-User-Role": session.role,
      },
      signal: AbortSignal.timeout(30000),
    });
    return Response.json(await upstream.json(), { status: upstream.status });
  } catch {
    return Response.json({ queued: true, message: "Classification queued (simulation).", simulated: true });
  }
}
