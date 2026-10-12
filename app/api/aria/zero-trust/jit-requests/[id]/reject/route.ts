export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { notImplemented } from "@/lib/bff-upstream";

// The Go API has no JIT access-request model (no list/approve/reject endpoints),
// so there is nothing to reject. Authenticated callers get an honest 501; no
// access is granted or denied, and no notification or dataset event is recorded.
// Re-enable by calling the Go API once that workflow exists
// (docs/02_Company/Operations/SIMULATED_SUCCESS_AND_MISSING_PATHS_ANALYSIS.md).
export async function POST(): Promise<Response> {
  const jar = await cookies();
  const session = await verifySession(jar.get(sessionCookieName())?.value);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  return notImplemented("JIT access-request reject");
}
