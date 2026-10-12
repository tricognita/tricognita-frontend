import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** The tenant's platform-generated ExternalId plus the principal its role must trust. */
export async function GET(): Promise<Response> {
  return callUpstream({
    path: "/api/credentials/aws/external-id",
    validate: (b) => (isObj(b) && typeof b.external_id === "string" && b.external_id !== "" ? null : "missing external id"),
  });
}
