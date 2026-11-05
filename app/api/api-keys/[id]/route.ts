import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Revoking a key on record is real and stays available. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  return callUpstream({
    path: `/api/api-keys/${encodeURIComponent(id)}`,
    method: "DELETE",
    precheck: () => (/^[0-9a-fA-F-]{16,64}$/.test(id) ? null : Response.json({ error: "invalid_id" }, { status: 400 })),
    validate: (b) => (isObj(b) && typeof b.status === "string" ? null : "revocation not confirmed"),
  });
}
