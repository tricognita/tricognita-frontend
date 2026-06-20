/**
 * lib/incidents — operator-declared incident model (Redis-backed).
 *
 * Phase 10 — incident operations layer. The platform now has telemetry
 * (BFF logs, audit_logs, posture state) but no FIRST-CLASS notion of an
 * "active incident". This module fills that gap.
 *
 * Model:
 *   - Incidents are operator-declared (NOT auto-detected). An operator
 *     opens /dashboard/admin/platform, declares an incident with a
 *     severity + title + scope, and acknowledges/resolves over time.
 *   - Each incident lives in Redis as both:
 *       (a) a hash at  tricognita:incident:{id}   (full record)
 *       (b) an id in   tricognita:incidents:active  (sorted set by ts)
 *     Resolved incidents move to tricognita:incidents:resolved (LTRIM 50).
 *   - Active incidents drive the DegradedBanner posture override —
 *     when there's at least one active incident, the banner upgrades
 *     to whatever severity is highest.
 *
 * NOT in scope for this module:
 *   - Automated incident detection. That requires a metrics pipeline.
 *   - Customer-facing status page integration. Future hook.
 *   - Webhook fan-out to PagerDuty/Slack. Future hook (notify.ts already
 *     has the building blocks).
 */

import { Redis } from "@upstash/redis";

export type IncidentSeverity = "info" | "minor" | "major" | "critical";
export type IncidentState = "active" | "acknowledged" | "resolved";

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  state: IncidentState;
  scope: "platform" | "tenant" | "subsystem";
  affected_tenants: string[]; // empty if scope=platform
  affected_subsystem?: string; // e.g. "go-api", "redis", "ses"
  declared_by: string; // email of operator
  declared_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  notes: IncidentNote[];

  // ── Phase 13 workflow fields (all optional for backward compat) ─────────
  /** Email of operator currently owning the incident. null = unassigned. */
  assigned_to?: string | null;
  /** Escalation level: 0 = unescalated, 1 = manager, 2 = oncall, 3 = exec. */
  escalation_level?: 0 | 1 | 2 | 3;
  /** Last severity transition — used to detect severity progression. */
  severity_history?: Array<{
    ts: string;
    from: IncidentSeverity | null;
    to: IncidentSeverity;
    by: string;
  }>;
  /** Linked finding ids (from /dashboard/findings). */
  linked_findings?: string[];
  /** Linked attack path ids. */
  linked_attack_paths?: string[];
}

export interface IncidentNote {
  ts: string;
  author: string;
  body: string;
}

const ACTIVE_SET = "tricognita:incidents:active";
const RESOLVED_LIST = "tricognita:incidents:resolved";
function incidentKey(id: string): string {
  return `tricognita:incident:${id}`;
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

function newIncidentId(): string {
  return `inc-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function declareIncident(args: {
  title: string;
  description: string;
  severity: IncidentSeverity;
  scope: Incident["scope"];
  affected_tenants?: string[];
  affected_subsystem?: string;
  declared_by: string;
}): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const id = newIncidentId();
  const now = new Date().toISOString();
  const incident: Incident = {
    id,
    title: args.title,
    description: args.description,
    severity: args.severity,
    state: "active",
    scope: args.scope,
    affected_tenants: args.affected_tenants ?? [],
    affected_subsystem: args.affected_subsystem,
    declared_by: args.declared_by,
    declared_at: now,
    notes: [
      {
        ts: now,
        author: args.declared_by,
        body: `Incident declared. Severity: ${args.severity}.`,
      },
    ],
  };
  try {
    await redis.set(incidentKey(id), JSON.stringify(incident));
    // Use a sorted set by declared_at timestamp so we can retrieve
    // newest-first easily.
    await redis.zadd(ACTIVE_SET, { score: Date.parse(now), member: id });
    return incident;
  } catch {
    return null;
  }
}

export async function getIncident(id: string): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string | object>(incidentKey(id));
    if (!raw) return null;
    if (typeof raw === "string") return JSON.parse(raw) as Incident;
    return raw as Incident;
  } catch {
    return null;
  }
}

export async function listActiveIncidents(): Promise<Incident[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    // Newest first.
    const ids = (await redis.zrange(ACTIVE_SET, 0, -1, {
      rev: true,
    })) as string[];
    if (!ids || ids.length === 0) return [];
    const records = await Promise.all(ids.map((i) => getIncident(i)));
    return records.filter((r): r is Incident => r !== null);
  } catch {
    return [];
  }
}

export async function listResolvedIncidents(): Promise<Incident[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = (await redis.lrange(RESOLVED_LIST, 0, 49)) as Array<
      string | object
    >;
    return raw.map((r) =>
      typeof r === "string" ? (JSON.parse(r) as Incident) : (r as Incident),
    );
  } catch {
    return [];
  }
}

export async function acknowledgeIncident(
  id: string,
  by: string,
  note?: string,
): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getIncident(id);
  if (!existing) return null;
  if (existing.state !== "active") return existing;
  const now = new Date().toISOString();
  existing.state = "acknowledged";
  existing.acknowledged_at = now;
  existing.acknowledged_by = by;
  existing.notes.push({
    ts: now,
    author: by,
    body: note ?? "Acknowledged.",
  });
  try {
    await redis.set(incidentKey(id), JSON.stringify(existing));
    return existing;
  } catch {
    return null;
  }
}

export async function resolveIncident(
  id: string,
  by: string,
  note?: string,
): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getIncident(id);
  if (!existing) return null;
  if (existing.state === "resolved") return existing;
  const now = new Date().toISOString();
  existing.state = "resolved";
  existing.resolved_at = now;
  existing.resolved_by = by;
  existing.notes.push({
    ts: now,
    author: by,
    body: note ?? "Resolved.",
  });
  try {
    await redis.set(incidentKey(id), JSON.stringify(existing));
    // Move from active sorted set to resolved list (LTRIM 50).
    await redis.zrem(ACTIVE_SET, id);
    await redis.lpush(RESOLVED_LIST, JSON.stringify(existing));
    await redis.ltrim(RESOLVED_LIST, 0, 49);
    return existing;
  } catch {
    return null;
  }
}

/**
 * assignIncident — set the owning operator. Set `to=null` to unassign.
 * Records the change in the notes timeline so handoff is traceable.
 */
export async function assignIncident(
  id: string,
  to: string | null,
  by: string,
): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getIncident(id);
  if (!existing) return null;
  const prev = existing.assigned_to ?? null;
  existing.assigned_to = to;
  existing.notes.push({
    ts: new Date().toISOString(),
    author: by,
    body: to
      ? prev
        ? `Reassigned from ${prev} to ${to}.`
        : `Assigned to ${to}.`
      : prev
        ? `Unassigned (was ${prev}).`
        : "Unassigned.",
  });
  try {
    await redis.set(incidentKey(id), JSON.stringify(existing));
    return existing;
  } catch {
    return null;
  }
}

/**
 * escalateIncident — bump escalation level. Cannot exceed 3 (executive).
 * Records the level change in the notes timeline.
 */
export async function escalateIncident(
  id: string,
  to: 0 | 1 | 2 | 3,
  by: string,
  reason?: string,
): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getIncident(id);
  if (!existing) return null;
  const prev = existing.escalation_level ?? 0;
  if (prev === to) return existing;
  existing.escalation_level = to;
  const labels: Record<number, string> = {
    0: "unescalated",
    1: "manager",
    2: "oncall",
    3: "executive",
  };
  existing.notes.push({
    ts: new Date().toISOString(),
    author: by,
    body: `Escalation ${labels[prev]} → ${labels[to]}${reason ? `: ${reason}` : ""}.`,
  });
  try {
    await redis.set(incidentKey(id), JSON.stringify(existing));
    return existing;
  } catch {
    return null;
  }
}

/**
 * updateIncidentSeverity — change severity. Tracks the transition in
 * severity_history so analysts can see how an incident's blast-radius
 * understanding evolved.
 */
export async function updateIncidentSeverity(
  id: string,
  to: IncidentSeverity,
  by: string,
): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getIncident(id);
  if (!existing) return null;
  if (existing.severity === to) return existing;
  const now = new Date().toISOString();
  existing.severity_history = existing.severity_history ?? [];
  existing.severity_history.push({
    ts: now,
    from: existing.severity,
    to,
    by,
  });
  const prev = existing.severity;
  existing.severity = to;
  existing.notes.push({
    ts: now,
    author: by,
    body: `Severity ${prev} → ${to}.`,
  });
  try {
    await redis.set(incidentKey(id), JSON.stringify(existing));
    return existing;
  } catch {
    return null;
  }
}

/**
 * linkFinding / linkAttackPath — wire an incident to a finding or attack
 * path so the analyst doesn't have to remember which incident a finding
 * belongs to. Surfaces in the finding's detail panel via cross-ref.
 */
export async function linkIncidentArtifact(
  id: string,
  kind: "finding" | "attack_path",
  artifactId: string,
  by: string,
): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getIncident(id);
  if (!existing) return null;
  if (kind === "finding") {
    existing.linked_findings = existing.linked_findings ?? [];
    if (!existing.linked_findings.includes(artifactId)) {
      existing.linked_findings.push(artifactId);
      existing.notes.push({
        ts: new Date().toISOString(),
        author: by,
        body: `Linked finding ${artifactId}.`,
      });
    }
  } else {
    existing.linked_attack_paths = existing.linked_attack_paths ?? [];
    if (!existing.linked_attack_paths.includes(artifactId)) {
      existing.linked_attack_paths.push(artifactId);
      existing.notes.push({
        ts: new Date().toISOString(),
        author: by,
        body: `Linked attack path ${artifactId}.`,
      });
    }
  }
  try {
    await redis.set(incidentKey(id), JSON.stringify(existing));
    return existing;
  } catch {
    return null;
  }
}

export async function appendIncidentNote(
  id: string,
  by: string,
  body: string,
): Promise<Incident | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getIncident(id);
  if (!existing) return null;
  existing.notes.push({
    ts: new Date().toISOString(),
    author: by,
    body,
  });
  try {
    await redis.set(incidentKey(id), JSON.stringify(existing));
    return existing;
  } catch {
    return null;
  }
}

/**
 * peakSeverity — returns the highest severity among active incidents.
 * Used by the DegradedBanner to upgrade posture severity when there are
 * declared incidents the operator wants to surface.
 */
export function peakSeverity(
  incidents: Incident[],
): IncidentSeverity | null {
  if (incidents.length === 0) return null;
  const rank: Record<IncidentSeverity, number> = {
    info: 0,
    minor: 1,
    major: 2,
    critical: 3,
  };
  let max: IncidentSeverity = "info";
  for (const i of incidents) {
    if (rank[i.severity] > rank[max]) max = i.severity;
  }
  return max;
}
