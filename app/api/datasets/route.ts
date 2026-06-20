/**
 * GET  /api/datasets        — List events (paginated)
 * POST /api/datasets        — Manually add an event
 * DELETE /api/datasets      — Clear all events (admin only)
 * PATCH /api/datasets       — Label an event
 */
import { cookies } from "next/headers";
import { verifySession, sessionCookieName } from "@/lib/auth";
import { getEvents, recordEvent, labelEvent, clearEvents, getStorageStatus } from "@/lib/datasets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireDatasetAccess(): Promise<{ email: string; role: string } | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  const session = await verifySession(token);
  if (!session) return null;
  // ADMIN always has access; others need "datasets" in their modules
  if (session.role === "ADMIN") return session;
  // For other roles, module check happens at page level via proxy
  return null;
}

export async function GET(req: Request): Promise<Response> {
  const session = await requireDatasetAccess();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200"), 1000);
  const type = url.searchParams.get("type") ?? null;

  let events = await getEvents(limit);
  if (type) events = events.filter(e => e.type === type);

  const status = getStorageStatus();
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;

  return Response.json({
    events,
    total: events.length,
    counts,
    storage: status,
  });
}

export async function POST(req: Request): Promise<Response> {
  const session = await requireDatasetAccess();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "invalid_body" }, { status: 400 }); }

  const event = await recordEvent(
    body.type ?? "finding",
    body.input ?? {},
    body.output ?? {},
    { source: "manual", user_email: session.email, account_id: body.account_id }
  );
  return Response.json({ ok: true, event });
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await requireDatasetAccess();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: "invalid_body" }, { status: 400 }); }

  const ok = await labelEvent(body.id, body.label ?? "");
  return Response.json({ ok });
}

export async function DELETE(): Promise<Response> {
  const session = await requireDatasetAccess();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return Response.json({ error: "admin_only" }, { status: 403 });

  await clearEvents();
  return Response.json({ ok: true, message: "All dataset events cleared." });
}
