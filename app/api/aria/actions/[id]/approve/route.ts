export const dynamic = "force-dynamic";
import { callUpstream } from "@/lib/bff-upstream";
import { notifyActionApproved } from "@/lib/notify";

// approve: success is reported only when the Go API returned 2xx. Nothing is
// simulated, and the notification is sent only after a verified 2xx.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  return callUpstream({
    path: `/api/aria/actions/${encodeURIComponent(id)}/approve`,
    method: "POST",
    timeoutMs: 5000,
    onSuccess: (session, body) => {
      const b = (body ?? {}) as { action_type?: string };
      notifyActionApproved(id, b.action_type || "Remediation", session.email, session.tenantId).catch(() => {});
    },
  });
}
