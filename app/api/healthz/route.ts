export const dynamic = "force-dynamic";
import { GO_API } from "@/lib/jit-secret";

/**
 * GET /api/healthz
 *
 * Liveness + Go API upstream check. Three response shapes:
 *
 *   1. Upstream healthy:
 *      200 { status: "healthy", components: {...}, upstream: GO_API }
 *
 *   2. Upstream unconfigured (frontend-only deployment, OSS showcase, etc.):
 *      200 { status: "frontend_only", mode: "demo", components: {...} }
 *
 *      Returning 200 here (not 503) prevents the dashboard from showing
 *      a "Service degraded" banner in deployments where the Go API
 *      genuinely isn't expected to be reachable. The frontend can run
 *      against synthetic demo data; that's a valid deployment shape,
 *      not a degradation.
 *
 *   3. Upstream configured but unreachable:
 *      503 { status: "degraded", components: {...} }
 *
 *      The legitimate "something's broken" case. Triggers the
 *      DegradedBanner.
 */

const UNCONFIGURED_HOSTS = ["api.must-be-configured.invalid"];

function isUnconfigured(url: string): boolean {
  if (!url) return true;
  return UNCONFIGURED_HOSTS.some((u) => url.includes(u));
}

export async function GET(): Promise<Response> {
  if (isUnconfigured(GO_API)) {
    return Response.json(
      {
        status: "frontend_only",
        mode: "demo",
        components: { api: "not_configured", graph: "demo", aria: "demo" },
        note: "Frontend-only deployment. Configure SENTINEL_API_URL to enable backend features.",
      },
      { status: 200 },
    );
  }

  try {
    const upstream = await fetch(`${GO_API}/healthz`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!upstream.ok) throw new Error(String(upstream.status));
    return Response.json(await upstream.json(), { status: upstream.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[healthz] upstream unreachable → ${msg}`);
    return Response.json(
      {
        status: "degraded",
        components: { api: "down", graph: "unknown", aria: "unknown" },
      },
      { status: 503 },
    );
  }
}
