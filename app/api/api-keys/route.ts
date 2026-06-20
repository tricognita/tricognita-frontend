import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function getSession() {
  const jar = await cookies();
  return verifySession(jar.get(sessionCookieName())?.value);
}

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) return Response.json({ keys: [] });
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  try {
    const upstream = await fetch(`${GO_API}/api/api-keys`, {
      headers: { Authorization: `Bearer ${token}`, "X-Initiated-By": session.email },
      signal: AbortSignal.timeout(10_000),
    });
    if (!upstream.ok) return Response.json({ keys: [] });
    return Response.json(await upstream.json());
  } catch {
    return Response.json({ keys: [] });
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });

  const check = secretOrError();
  if (check instanceof Response) return check;
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });

  const body = await req.json();
  const upstream = await fetch(`${GO_API}/api/api-keys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Initiated-By": session.email,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const j = await upstream.json().catch(() => ({}));
  return Response.json(j, { status: upstream.status });
}
