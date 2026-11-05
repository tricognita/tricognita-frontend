import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * POST /api/credentials/test/{id}: proves a STORED connection can read its account.
 * The Go API answers 200 with `ok: false` and the provider's reason when the
 * account cannot be read; that is a real, reportable answer, relayed as is.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  return callUpstream({
    path: `/api/credentials/test/${encodeURIComponent(id)}`,
    method: "POST",
    timeoutMs: 25_000,
    precheck: () =>
      /^[0-9a-fA-F-]{16,64}$/.test(id) ? null : Response.json({ error: "invalid_id" }, { status: 400 }),
    validate: (b) => (isObj(b) && typeof b.ok === "boolean" ? null : "missing connection result"),
  });
}
