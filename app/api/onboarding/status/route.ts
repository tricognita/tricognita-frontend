/**
 * GET /api/onboarding/status
 *
 * Returns the onboarding step completion state for the authenticated tenant.
 * Today this is a lightweight check — in live mode it checks if any scans
 * have been run (first_scan). Future: derive from event log.
 *
 * Response: { steps: { connect, first_scan, review, remediate, alerts } }
 *
 * Demo mode: returns DEMO_ONBOARDING_STEPS (connect=true, rest=false).
 * Tenant isolation: tenantId from session — not from query params.
 */

import { authedRoute } from "@/lib/bff-log";
import { isDemoMode } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_STEPS = {
  connect: true,
  first_scan: false,
  review: false,
  remediate: false,
  alerts: false,
};

const DEFAULT_STEPS = {
  connect: false,
  first_scan: false,
  review: false,
  remediate: false,
  alerts: false,
};

export const GET = authedRoute(async ({ session }) => {
  if (isDemoMode()) {
    return Response.json({ steps: DEMO_STEPS });
  }

  // Live mode: derive steps from what we can easily check.
  // For now this is a stub that returns all false — the client
  // overlays localStorage state on top. A future iteration will
  // derive connect/first_scan from the datasets table.
  return Response.json({
    steps: { ...DEFAULT_STEPS },
    tenant_id: session.tenantId,
  });
});
