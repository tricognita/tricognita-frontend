import { notImplemented } from "@/lib/bff-upstream";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Go API tests a connection only after it is saved (POST /api/credentials/test/{id}).
// This pre-save route used to proxy a path the API does not serve, so every
// "Test connection" answered with a misleading error. It now says so honestly.
export async function POST(): Promise<Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  return notImplemented("Testing a connection before it is saved");
}
