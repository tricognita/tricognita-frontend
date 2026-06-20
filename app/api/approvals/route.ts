import { goFetchAuthorized } from "@/lib/jit-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/approvals — list pending approvals
export async function GET(): Promise<Response> {
  return goFetchAuthorized("/api/approvals?status=PENDING_APPROVAL");
}

// POST /api/approvals — perform approval action
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  if (!body.approval_id) {
    return Response.json({ error: "approval_id is required" }, { status: 400 });
  }

  // Map to the PATCH endpoint on the backend
  return goFetchAuthorized(`/api/approvals/${encodeURIComponent(body.approval_id)}`, {
    method: "PATCH",
    body: JSON.stringify({ action: body.action }),
  });
}
