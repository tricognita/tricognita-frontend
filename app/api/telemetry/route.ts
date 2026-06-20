import { authedRoute, logRoute } from "@/lib/bff-log";
import { emitTelemetry, type TelemetryEventType } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telemetry — client-side event ingest.
 *
 * Any authenticated role can emit. Tenant + role + user identity are
 * taken from the verified session, NEVER from the request body. The
 * client cannot forge events on behalf of another tenant or user.
 *
 * Accepted event types are a closed allow-list — unknown types are
 * rejected so the client can't spam the taxonomy.
 *
 * Returns 200 on success (the event id is NOT returned to the client
 * to avoid making client code depend on the event id format).
 *
 * Failure modes:
 *   - 400 if event type is unknown / data shape is invalid
 *   - 200 even when Redis is down — telemetry is fail-open by design
 *     (logged at warn so we can see drop rate without breaking UX)
 */

// Closed list — must match TelemetryEventType in lib/telemetry.ts.
// Adding a type requires updating both this list AND the type union.
const ALLOWED_CLIENT_EVENTS = new Set<TelemetryEventType>([
  // Navigation
  "page_view",
  // Onboarding
  "onboarding.started",
  "onboarding.role_selected",
  "onboarding.credentials_added",
  "onboarding.first_scan_started",
  "onboarding.completed",
  // Findings / remediation (client interactions)
  "finding.viewed",
  "finding.ignored",
  "finding.promoted_to_incident",
  "remediation.proposed_viewed",
  // Notifications
  "notification.opened",
  "notification.read",
  "notification.cleared",
]);

const MAX_DATA_FIELDS = 8;

interface RawBody {
  type?: string;
  route?: string;
  data?: Record<string, string | number | boolean | null>;
}

function sanitizeData(
  raw: unknown,
): Record<string, string | number | boolean | null> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const entries = Object.entries(raw as Record<string, unknown>).slice(
    0,
    MAX_DATA_FIELDS,
  );
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of entries) {
    if (v === null || typeof v === "boolean" || typeof v === "number") {
      out[k] = v;
    } else if (typeof v === "string") {
      // Cap string length so a malicious client can't pump huge payloads.
      out[k] = v.slice(0, 200);
    }
    // Drop everything else (objects, arrays, undefined).
  }
  return out;
}

export const POST = authedRoute(async ({ ctx, session, req }) => {
  const body = (await req.json().catch(() => ({}))) as RawBody;
  const type = body.type as TelemetryEventType | undefined;
  if (!type || !ALLOWED_CLIENT_EVENTS.has(type)) {
    return ctx.errorJson({ error: "unknown_event_type" }, 400);
  }
  const route = typeof body.route === "string" ? body.route.slice(0, 256) : undefined;
  const data = sanitizeData(body.data);

  const event = await emitTelemetry({
    type,
    tenantId: session.tenantId,
    userEmail: session.email,
    role: session.role,
    route,
    data,
  });

  if (!event) {
    // Redis is down — log it once per request so we can see the drop
    // rate, but return success so the client doesn't show errors for
    // a telemetry-layer issue.
    logRoute(ctx, "warn", "telemetry.dropped_redis_unavailable", { type });
  }

  return Response.json({ ok: true });
});
