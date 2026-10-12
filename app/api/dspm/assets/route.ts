import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const qs = new URL(req.url).searchParams.toString();
  return callUpstream({ path: `/api/dspm/assets${qs ? "?" + qs : ""}`, timeoutMs: 10000 });
}

// POST: trigger classification for the tenant. "queued" is reported only when the Go API said so.
export async function POST(): Promise<Response> {
  return callUpstream({ path: "/api/dspm/assets", method: "POST", timeoutMs: 30000 });
}
