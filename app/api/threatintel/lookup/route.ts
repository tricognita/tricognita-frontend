import { callUpstream, validateThreatIntel } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verdicts come only from the Go API's enrichment providers. When they are
// unavailable the caller gets an error, never a guessed or canned verdict.
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const indicator = url.searchParams.get("indicator") ?? "";
  const iocType = url.searchParams.get("type") ?? "ip";
  return callUpstream({
    precheck: () =>
      indicator ? null : Response.json({ error: "indicator query param required" }, { status: 400 }),
    path: `/api/threatintel/lookup?indicator=${encodeURIComponent(indicator)}&type=${encodeURIComponent(iocType)}`,
    timeoutMs: 15000,
    validate: validateThreatIntel,
  });
}
