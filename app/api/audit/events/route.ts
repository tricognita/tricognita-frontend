import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** The organisation's audit trail: the Go API reads it for the caller's tenant only. */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const qs = new URLSearchParams();
  for (const k of ["limit", "before", "actor", "action", "from", "to"]) {
    const v = url.searchParams.get(k);
    if (v !== null) qs.set(k, v);
  }
  return callUpstream({
    path: `/api/audit/events${qs.size ? "?" + qs.toString() : ""}`,
    validate: (b) => (isObj(b) && Array.isArray(b.events) ? null : "missing events list"),
  });
}
