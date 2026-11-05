import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** POST /api/assessments: run a verification of one connected account. The result is the Go API's, never invented. */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { cloud_account_id?: unknown } | null;
  const id = typeof body?.cloud_account_id === "string" ? body.cloud_account_id : "";
  return callUpstream({
    path: "/api/assessments",
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({ cloud_account_id: id }),
    timeoutMs: 55_000,
    precheck: () =>
      /^[0-9a-fA-F-]{16,64}$/.test(id) ? null : Response.json({ error: "cloud_account_id_required" }, { status: 400 }),
    validate: (b) => (isObj(b) && typeof b.run_id === "string" && typeof b.state === "string" ? null : "missing run summary"),
  });
}
