import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const ALLOWED = ["name", "scopes", "expiry_days"] as const;
// The value the API returns exactly once. Checked here so a malformed answer is never handed to the browser.
const ISSUED = /^tck_[0-9a-f]{64}$/;

/** Lists keys already on record (metadata only: the API never returns a secret). An outage is an error, never an empty list. */
export async function GET(): Promise<Response> {
  return callUpstream({
    path: "/api/api-keys",
    validate: (b) => (isObj(b) && Array.isArray(b.keys) ? null : "missing keys list"),
  });
}

/**
 * Issues a key for the caller's tenant (ADMIN only, by the edge policy). The Go API owns every rule: allowed scopes,
 * expiry, tenant and creator come from the verified session there. The one response that carries the secret is
 * never cacheable, and the request body is never logged.
 */
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  let body = raw;
  let bad: Response | null = null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObj(parsed)) throw new Error("not an object");
    const clean: Record<string, unknown> = {};
    for (const k of ALLOWED) if (parsed[k] !== undefined) clean[k] = parsed[k];
    body = JSON.stringify(clean);
  } catch {
    bad = Response.json({ error: "invalid_json", message: "The request body must be a JSON object." }, { status: 400 });
  }
  const res = await callUpstream({
    path: "/api/api-keys",
    method: "POST",
    contentType: "application/json",
    body,
    precheck: () => bad ?? (raw.length > 2048 ? Response.json({ error: "payload_too_large" }, { status: 413 }) : null),
    validate: (b) =>
      isObj(b) && typeof b.id === "string" && b.id !== "" && typeof b.key === "string" && ISSUED.test(b.key)
        ? null
        : "the key was not issued in the expected form",
  });
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "no-store, private");
  out.headers.set("Pragma", "no-cache");
  return out;
}
