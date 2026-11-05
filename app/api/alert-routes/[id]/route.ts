import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const ID = /^[0-9a-fA-F-]{16,64}$/;

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  return callUpstream({
    path: `/api/alert-routes/${encodeURIComponent(id)}`,
    method: "DELETE",
    precheck: () => (ID.test(id) ? null : Response.json({ error: "invalid_id" }, { status: 400 })),
    validate: (b) => (isObj(b) && b.status === "deleted" ? null : "deletion not confirmed"),
  });
}

/** PATCH { enabled: boolean }: the only change the API supports. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { enabled?: unknown } | null;
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : null;
  return callUpstream({
    path: `/api/alert-routes/${encodeURIComponent(id)}`,
    method: "PATCH",
    contentType: "application/json",
    body: JSON.stringify({ enabled }),
    precheck: () =>
      !ID.test(id)
        ? Response.json({ error: "invalid_id" }, { status: 400 })
        : enabled === null
          ? Response.json({ error: "enabled_required", message: "Send { enabled: true | false }." }, { status: 400 })
          : null,
    validate: (b) => (isObj(b) && b.status === "updated" ? null : "update not confirmed"),
  });
}
