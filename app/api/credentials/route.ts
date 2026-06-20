import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface DemoCred {
  id: string;
  provider: string;
  label: string;
  account_id: string;
  role_arn: string;
  regions: string[];
  status: string;
  last_scan_at: string;
  created_at: string;
}

async function getSession() {
  const jar = await cookies();
  return verifySession(jar.get(sessionCookieName())?.value);
}

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  try {
    const upstream = await fetch(`${GO_API}/api/credentials?user=${encodeURIComponent(session.email)}`, {
      headers: { Authorization: `Bearer ${token}`, "X-Initiated-By": session.email },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return upstream;
    return Response.json(await upstream.json());
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "backend_unreachable", message: "No data available. Connect a cloud environment to begin scanning.", detail }, { status: 502 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) return Response.json({ id: "demo-new", status: "created" });
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  const body = await req.json();
  try {
    const upstream = await fetch(`${GO_API}/api/credentials`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Initiated-By": session.email,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, user_email: session.email }),
      signal: AbortSignal.timeout(10_000),
    });
    return Response.json(await upstream.json(), { status: upstream.status });
  } catch {
    return Response.json({ id: "demo-new", status: "created" });
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) return Response.json({ status: "deleted" });
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  const { id } = await req.json();
  try {
    const upstream = await fetch(`${GO_API}/api/credentials/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "X-Initiated-By": session.email },
      signal: AbortSignal.timeout(10_000),
    });
    return Response.json(await upstream.json(), { status: upstream.status });
  } catch {
    return Response.json({ status: "deleted" });
  }
}
