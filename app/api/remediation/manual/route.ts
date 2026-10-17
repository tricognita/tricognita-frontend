import { remediationProxy } from "../route";
import { MANUAL_STEP_CAPABILITY, manualRequestBody } from "@/lib/manual-remediation-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BFF proxy → changes the customer applies themselves.
//
// GET lists this tenant's customer-applied changes (optionally ?control=TC-…);
// the edge's /api/remediation prefix rule already limits it to remediation
// roles, and the backend requires scan:read.
//
// POST records a proposal. Only the proposal's own fields are forwarded — no
// tenant, account, region, URN or proposer: the backend resolves the target
// from the opaque resource id against the tenant's own assessment and takes
// the proposer from the token. The tenant comes from the session, never the
// browser.

export async function GET(req: Request): Promise<Response> {
  // The proxy forwards the query string; the backend reads only `control`
  // from it and never takes a tenant, account or resource from a query.
  return remediationProxy(req, "GET", "/api/remediation/manual", null);
}

export async function POST(req: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const body = manualRequestBody("propose", raw);
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });
  return remediationProxy(
    req,
    "POST",
    "/api/remediation/manual",
    JSON.stringify(body),
    MANUAL_STEP_CAPABILITY.propose,
  );
}
