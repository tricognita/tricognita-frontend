import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Period reports. Every answer is the Go API's: a list is only a list when the API returned one, and a
// report is only "generated" when the API stored it. Roles are enforced at the edge (lib/api-authz.ts:
// everyone who may export reports can read; the operator set can generate) and again by the Go API.

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const KINDS = new Set(["MONTHLY_ASSURANCE", "CUSTOMER_REVIEW"]);

export async function GET(): Promise<Response> {
  return callUpstream({
    path: "/api/reports",
    validate: (b) => (isObj(b) && Array.isArray(b.reports) ? null : "missing reports list"),
  });
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  let body = "";
  let bad: Response | null = null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed) || typeof parsed.kind !== "string" || !KINDS.has(parsed.kind) || typeof parsed.periodStart !== "string" || typeof parsed.periodEnd !== "string") {
      throw new Error("shape");
    }
    // Only these three fields travel; nothing else the browser sent reaches the API.
    body = JSON.stringify({ kind: parsed.kind, periodStart: parsed.periodStart, periodEnd: parsed.periodEnd });
  } catch {
    bad = Response.json({ error: "invalid_request", message: "Send {kind, periodStart, periodEnd}; kind is MONTHLY_ASSURANCE or CUSTOMER_REVIEW." }, { status: 400 });
  }
  return callUpstream({
    path: "/api/reports",
    method: "POST",
    contentType: "application/json",
    body,
    timeoutMs: 25_000,
    precheck: () => bad ?? (raw.length > 2048 ? Response.json({ error: "payload_too_large" }, { status: 413 }) : null),
    validate: (b) => (isObj(b) && typeof b.id === "string" && b.id !== "" && b.state === "READY" ? null : "the report was not confirmed as stored"),
  });
}
