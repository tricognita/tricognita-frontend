import { remediationProxy } from "../../../route";
import { EXECUTE_UPSTREAM_TIMEOUT_MS, DEFAULT_UPSTREAM_TIMEOUT_MS } from "@/lib/remediation-timeout";
import {
  MANUAL_STEP_CAPABILITY,
  isRemediationId,
  manualRequestBody,
  manualStepFromVerb,
} from "@/lib/manual-remediation-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// verify runs a full re-assessment, like execute's post-change check, so it
// gets the same budget; the function must outlive it.
export const maxDuration = 180;

// BFF proxy → approve, record "applied" for, or verify one customer-applied
// change.
//
// The id and verb come from the path and are validated, not trusted: the id
// must be a UUID and the verb one of the three steps. The backend re-reads the
// row under this tenant's RLS, so another tenant's id is not refused — it is
// not found. Each step is gated by its own capability before the backend is
// touched, and only that step's fields are forwarded.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; verb: string }> },
): Promise<Response> {
  const { id, verb } = await params;
  const step = manualStepFromVerb(verb);
  if (!step || !isRemediationId(id)) {
    return Response.json({ error: "unknown_action" }, { status: 404 });
  }
  let raw: unknown = null;
  const text = await req.text();
  if (text.trim()) {
    try {
      raw = JSON.parse(text);
    } catch {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }
  }
  const body = manualRequestBody(step, raw);
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });

  return remediationProxy(
    req,
    "POST",
    `/api/remediation/manual/${encodeURIComponent(id)}/${step}`,
    JSON.stringify(body),
    MANUAL_STEP_CAPABILITY[step],
    step === "verify" ? EXECUTE_UPSTREAM_TIMEOUT_MS : DEFAULT_UPSTREAM_TIMEOUT_MS,
  );
}
