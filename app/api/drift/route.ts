import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Drift events read back from the retained control results. Every answer is the Go API's.
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

export async function GET(): Promise<Response> {
  return callUpstream({
    path: "/api/drift",
    validate: (b) => (isObj(b) && Array.isArray(b.events) ? null : "missing drift events list"),
  });
}
