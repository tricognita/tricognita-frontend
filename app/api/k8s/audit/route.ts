import { callUpstream, validateK8sAudit } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Findings come only from auditing the submitted manifest. No demo or canned report exists.
export async function POST(req: Request): Promise<Response> {
  const body = await req.text();
  return callUpstream({
    path: "/api/k8s/audit",
    method: "POST",
    timeoutMs: 55000,
    body,
    contentType: req.headers.get("content-type") ?? "application/json",
    precheck: () => {
      try {
        JSON.parse(body);
        return null;
      } catch {
        return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
      }
    },
    validate: validateK8sAudit,
  });
}
