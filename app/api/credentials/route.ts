import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Cloud-account connections. Every answer is the Go API's: nothing here invents
// a created/deleted result when the backend is unreachable or refuses (the old
// route answered `demo-new` / `deleted` in those cases).

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Only the fields the Go handler reads. external_id is platform-generated and never accepted from a browser. */
const ALLOWED = [
  "provider", "label", "role_arn", "account_id", "regions",
  "azure_tenant_id", "azure_client_id", "azure_client_secret", "azure_subscription_id",
] as const;

export async function GET(): Promise<Response> {
  return callUpstream({
    path: "/api/credentials",
    validate: (b) => (isObj(b) && Array.isArray(b.credentials) ? null : "missing credentials list"),
  });
}

export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  return callUpstream({
    path: "/api/credentials",
    method: "POST",
    contentType: "application/json",
    body: (() => {
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isObj(parsed)) return raw;
        const clean: Record<string, unknown> = {};
        for (const k of ALLOWED) if (parsed[k] !== undefined) clean[k] = parsed[k];
        return JSON.stringify(clean);
      } catch {
        return raw;
      }
    })(),
    precheck: () => {
      if (raw.length > 16_384) return Response.json({ error: "payload_too_large" }, { status: 413 });
      try {
        if (!isObj(JSON.parse(raw))) throw new Error("not an object");
      } catch {
        return Response.json({ error: "invalid_json", message: "The request body must be a JSON object." }, { status: 400 });
      }
      return null;
    },
    validate: (b) => (isObj(b) && typeof b.id === "string" && b.id !== "" ? null : "missing credential id"),
  });
}

export async function DELETE(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  return callUpstream({
    path: `/api/credentials/${encodeURIComponent(id)}`,
    method: "DELETE",
    precheck: () =>
      /^[0-9a-fA-F-]{16,64}$/.test(id) ? null : Response.json({ error: "invalid_id" }, { status: 400 }),
    validate: (b) => (isObj(b) && b.status === "deleted" ? null : "deletion not confirmed"),
  });
}
