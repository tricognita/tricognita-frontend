import { remediationProxy } from "../../route";
import { remediationUpstreamTimeoutMs } from "@/lib/remediation-timeout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Above the execute upstream budget, so the platform does not cut the function
// off before the backend's own verification deadline.
export const maxDuration = 180;

// BFF proxy → approve, reject or execute one remediation.
//
// The id and verb come from the path and are passed through; neither is
// authority. The backend re-reads the row under this tenant's RLS, so an id
// belonging to another tenant is not refused — it is not found.
//
// approve and reject need approveRemediation. execute needs it too: carrying
// out an approved change is an approver's act, not a requester's, and letting
// the person who asked also be the person who applies it would collapse the
// separation the approval exists to create.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; verb: string }> },
): Promise<Response> {
  const { id, verb } = await params;
  if (!["approve", "reject", "execute"].includes(verb)) {
    return Response.json({ error: "unknown_action" }, { status: 404 });
  }
  const body = await req.text();
  return remediationProxy(
    req,
    "POST",
    `/api/remediation/${encodeURIComponent(id)}/${verb}`,
    body,
    "approveRemediation",
    remediationUpstreamTimeoutMs(verb),
  );
}
