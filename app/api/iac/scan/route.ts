import { callUpstream, validateIacScan } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Findings come only from scanning the submitted file. No demo or canned report exists.
export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  return callUpstream({
    path: "/api/iac/scan",
    method: "POST",
    timeoutMs: 55000,
    body,
    contentType: req.headers.get("content-type") ?? "application/json",
    validate: validateIacScan,
  });
}
