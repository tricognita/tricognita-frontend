import { RELEASE } from "@/lib/release";

export const runtime = "nodejs";
// Release info is build-time-frozen; serve from the static cache so this
// route doesn't trigger a Node function invocation per probe.
export const dynamic = "force-static";

/**
 * GET /api/version
 *
 * Public release-metadata endpoint. Unauthenticated by design — the same
 * info is in the JS bundle anyway, and exposing it lets external monitors
 * (uptime probes, support automation, dependabot) confirm which deploy is
 * live without needing a session.
 *
 * Output:
 *   {
 *     version: "0.1.0",
 *     sha: "a1b2c3d4",
 *     branch: "main",
 *     env: "production",
 *     deployedAt: "2026-05-22T14:32:00Z" | null,
 *     label: "v0.1.0 · a1b2c3d4 · production"
 *   }
 */
export async function GET(): Promise<Response> {
  return Response.json(RELEASE, {
    headers: {
      // Cache-friendly: this changes once per deploy. 60s smear is fine.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
