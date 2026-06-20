import { authedRoute, logRoute } from "@/lib/bff-log";
import {
  acknowledgeIncident,
  appendIncidentNote,
  assignIncident,
  declareIncident,
  escalateIncident,
  linkIncidentArtifact,
  listActiveIncidents,
  listResolvedIncidents,
  resolveIncident,
  updateIncidentSeverity,
  type IncidentSeverity,
} from "@/lib/incidents";
import { emitTelemetry, type TelemetryEventType } from "@/lib/telemetry";
import { recordUsage } from "@/lib/usage-accounting";

// Map incident ops to telemetry event types so the insights dashboard
// shows acks / resolutions / escalations separately rather than a
// single "incident edited" bucket.
const OP_TO_TELEMETRY: Record<string, TelemetryEventType> = {
  ack: "incident.acknowledged",
  resolve: "incident.resolved",
  note: "incident.noted",
  assign: "incident.assigned",
  escalate: "incident.escalated",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET    /api/admin/incidents              — list active + last 50 resolved
 * POST   /api/admin/incidents              — declare a new incident
 * PATCH  /api/admin/incidents?id=…&op=…    — ack | resolve | note
 *
 * ADMIN-only. All mutations are audited via the BFF log (incident write
 * itself goes through Redis; this BFF route just logs the operator
 * action with the request id).
 */

const VALID_SEVERITIES = new Set<IncidentSeverity>([
  "info",
  "minor",
  "major",
  "critical",
]);
const VALID_SCOPES = new Set(["platform", "tenant", "subsystem"] as const);

export const GET = authedRoute(async ({ ctx, session }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "incidents.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const [active, resolved] = await Promise.all([
    listActiveIncidents(),
    listResolvedIncidents(),
  ]);
  return Response.json({ active, resolved });
});

export const POST = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "incidents.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    severity?: string;
    scope?: string;
    affected_tenants?: string[];
    affected_subsystem?: string;
  };
  if (!body.title || !body.description) {
    return ctx.errorJson(
      { error: "title and description are required" },
      400,
    );
  }
  if (!body.severity || !VALID_SEVERITIES.has(body.severity as IncidentSeverity)) {
    return ctx.errorJson({ error: "invalid severity" }, 400);
  }
  if (
    !body.scope ||
    !VALID_SCOPES.has(body.scope as (typeof VALID_SCOPES extends Set<infer U> ? U : never))
  ) {
    return ctx.errorJson({ error: "invalid scope" }, 400);
  }
  const incident = await declareIncident({
    title: body.title,
    description: body.description,
    severity: body.severity as IncidentSeverity,
    scope: body.scope as "platform" | "tenant" | "subsystem",
    affected_tenants: body.affected_tenants,
    affected_subsystem: body.affected_subsystem,
    declared_by: session.email,
  });
  if (!incident) {
    logRoute(ctx, "error", "incidents.declare_failed", {
      title: body.title,
    });
    return ctx.errorJson(
      {
        error: "redis_unavailable",
        message: "Incident store is offline. Try again or escalate.",
      },
      503,
    );
  }
  logRoute(ctx, "warn", "incidents.declared", {
    incident_id: incident.id,
    severity: incident.severity,
    scope: incident.scope,
  });
  emitTelemetry({
    type: "incident.declared",
    tenantId: session.tenantId,
    userEmail: session.email,
    role: session.role,
    data: { severity: incident.severity, scope: incident.scope },
  });
  recordUsage({
    tenantId: session.tenantId,
    dimension: "incidents_declared",
    userEmail: session.email,
  });
  return Response.json(incident, { status: 201 });
});

export const PATCH = authedRoute(async ({ ctx, session, req }) => {
  if (session.role !== "ADMIN") {
    logRoute(ctx, "warn", "incidents.forbidden", {
      actor_role: session.role,
    });
    return ctx.errorJson({ error: "forbidden" }, 403);
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const op = url.searchParams.get("op");
  if (!id || !op) {
    return ctx.errorJson({ error: "id + op required" }, 400);
  }
  const body = (await req.json().catch(() => ({}))) as {
    note?: string;
    assign_to?: string | null;
    escalation?: 0 | 1 | 2 | 3;
    severity?: IncidentSeverity;
    link_kind?: "finding" | "attack_path";
    link_id?: string;
  };

  let result;
  if (op === "ack") {
    result = await acknowledgeIncident(id, session.email, body.note);
  } else if (op === "resolve") {
    result = await resolveIncident(id, session.email, body.note);
  } else if (op === "note") {
    if (!body.note) {
      return ctx.errorJson({ error: "note required" }, 400);
    }
    result = await appendIncidentNote(id, session.email, body.note);
  } else if (op === "assign") {
    // assign_to === null → unassign. assign_to === "" treated as null.
    const to = body.assign_to === "" ? null : body.assign_to ?? null;
    if (to !== null && typeof to !== "string") {
      return ctx.errorJson({ error: "assign_to must be string or null" }, 400);
    }
    result = await assignIncident(id, to, session.email);
  } else if (op === "escalate") {
    const lvl = body.escalation;
    if (lvl !== 0 && lvl !== 1 && lvl !== 2 && lvl !== 3) {
      return ctx.errorJson({ error: "escalation must be 0|1|2|3" }, 400);
    }
    result = await escalateIncident(id, lvl, session.email, body.note);
  } else if (op === "severity") {
    if (!body.severity || !["info", "minor", "major", "critical"].includes(body.severity)) {
      return ctx.errorJson({ error: "invalid severity" }, 400);
    }
    result = await updateIncidentSeverity(id, body.severity, session.email);
  } else if (op === "link") {
    if (
      !body.link_kind ||
      (body.link_kind !== "finding" && body.link_kind !== "attack_path") ||
      !body.link_id
    ) {
      return ctx.errorJson(
        { error: "link_kind (finding|attack_path) + link_id required" },
        400,
      );
    }
    result = await linkIncidentArtifact(id, body.link_kind, body.link_id, session.email);
  } else {
    return ctx.errorJson({ error: "unknown op" }, 400);
  }

  if (!result) {
    logRoute(ctx, "warn", "incidents.op_failed", {
      incident_id: id,
      op,
    });
    return ctx.errorJson({ error: "not_found_or_redis_down" }, 404);
  }

  logRoute(ctx, "info", "incidents.updated", {
    incident_id: id,
    op,
    new_state: result.state,
  });
  const telemetryType = OP_TO_TELEMETRY[op];
  if (telemetryType) {
    emitTelemetry({
      type: telemetryType,
      tenantId: session.tenantId,
      userEmail: session.email,
      role: session.role,
      data: { new_state: result.state, severity: result.severity },
    });
  }
  return Response.json(result);
});
