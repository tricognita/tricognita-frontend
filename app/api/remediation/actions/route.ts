import { remediationProxy } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BFF proxy → the fixes the product could offer for a control.
//
// No capability beyond an authenticated session: knowing that a fix exists is
// not the same as being allowed to ask for it, and hiding the list would make a
// permission boundary look like a missing feature. Each entry carries its own
// enabled flag and the reason when it is false.
export async function GET(req: Request): Promise<Response> {
  return remediationProxy(req, "GET", "/api/remediation/actions", null);
}
