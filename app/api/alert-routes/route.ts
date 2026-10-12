import { callUpstream } from "@/lib/bff-upstream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Alert routes. The old handlers answered `{ routes: [] }` whenever the API was
// unreachable or refused, which presented an outage as "no routes configured".
// Every answer here is the Go API's.

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const ALLOWED = ["name", "route_type", "min_severity", "config"] as const;

/** A delivery URL is a credential in practice: the browser receives the host only. */
function maskDestination(config: unknown): string {
  if (!isObj(config)) return "";
  const raw = config.url ?? config.webhook_url ?? config.base_url;
  if (typeof raw !== "string" || raw === "") return "";
  try {
    return `${new URL(raw).host}/…`;
  } catch {
    return "(unreadable destination)";
  }
}

export async function GET(): Promise<Response> {
  return callUpstream({
    path: "/api/alert-routes",
    validate: (b) => (isObj(b) && Array.isArray(b.routes) ? null : "missing routes list"),
    transform: (b) => {
      const routes = (b as { routes: Array<Record<string, unknown>> }).routes.map((r) => {
        const { config, ...rest } = r;
        return { ...rest, destination: maskDestination(config) };
      });
      return { routes };
    },
  });
}

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
  return callUpstream({
    path: "/api/alert-routes",
    method: "POST",
    contentType: "application/json",
    body,
    precheck: () => bad ?? (raw.length > 8192 ? Response.json({ error: "payload_too_large" }, { status: 413 }) : null),
    validate: (b) => (isObj(b) && typeof b.id === "string" && b.id !== "" ? null : "missing route id"),
  });
}
