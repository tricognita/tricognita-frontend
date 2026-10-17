export const dynamic = "force-dynamic";
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { secretOrError, GO_API } from "@/lib/jit-secret";
import { getJitToken } from "@/lib/jit-token";
import { relayAriaStream } from "@/lib/aria-stream";

export async function GET(): Promise<Response> {
  const jar = await cookies();
  const sessionToken = jar.get(sessionCookieName())?.value;
  const session = await verifySession(sessionToken);
  if (!session) return Response.json({ error: "authentication_required" }, { status: 401 });
  const check = secretOrError();
  if (check instanceof Response) return check;
  const token = await getJitToken({ sub: session.email, tenantId: session.tenantId, role: session.role });
  try {
    const res = await fetch(`${GO_API}/api/aria/stream`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
      cache: "no-store",
    });
    return relayAriaStream(res);
  } catch {
    // No fake "connected" stream: the client must see that the feed is down and reconnect.
    return Response.json(
      { error: "backend_unreachable", message: "The live ARIA feed is unavailable." },
      { status: 502 },
    );
  }
}
