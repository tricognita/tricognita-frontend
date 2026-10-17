import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

// GET /api/reports/{id}/download?format=csv|json: the stored document, relayed untouched.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params;
  const format = (new URL(req.url).searchParams.get("format") ?? "csv").toLowerCase();
  const invalid = !UUID.test(id)
    ? Response.json({ error: "not_found", message: "Report not found." }, { status: 404 })
    : format !== "csv" && format !== "json"
      ? Response.json({ error: "invalid_format", message: "format must be csv or json." }, { status: 400 })
      : null;
  return callUpstream({
    path: `/api/reports/${id}/download?format=${format}`,
    timeoutMs: 15_000,
    precheck: () => invalid,
    raw: { contentTypes: ["text/csv", "application/json"], passHeaders: ["content-disposition", "x-report-sha256"] },
  });
}
