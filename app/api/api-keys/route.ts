import { callUpstream, notImplemented } from "@/lib/bff-upstream";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Lists keys already on record. An outage is an error, never an empty list. */
export async function GET(): Promise<Response> {
  return callUpstream({
    path: "/api/api-keys",
    validate: (b) => (isObj(b) && Array.isArray(b.keys) ? null : "missing keys list"),
  });
}

/**
 * Issuing is switched off. The API stores a key's hash but nothing in the platform
 * accepts an API key as a credential yet, so a key issued here would look valid and
 * grant nothing. Refusing is the honest answer until key authentication exists.
 */
export async function POST(): Promise<Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  return notImplemented("Issuing API keys (no endpoint accepts an API key yet)");
}
