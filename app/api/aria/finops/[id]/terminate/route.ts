export const dynamic = "force-dynamic";
import { callUpstream } from "@/lib/bff-upstream";

// Terminate is destructive: success is reported only when the Go API returned 2xx.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  return callUpstream({
    path: `/api/aria/finops/${encodeURIComponent(id)}/terminate`,
    method: "POST",
    timeoutMs: 5000,
  });
}
