/**
 * lib/telemetry — privacy-conscious product telemetry.
 *
 * Phase 16 — operational telemetry foundation. Captures product usage
 * signals (page views, workflow events, feature adoption) for internal
 * product intelligence. Distinct from:
 *   - audit_logs (compliance / forensic; in Postgres, never deleted)
 *   - structured logs (operational debugging; Vercel/Fly log aggregator)
 *   - SIEM event feed (customer-pulled platform events)
 *
 * Design rules:
 *   1. Tenant-safe by construction — every event includes tenant_id
 *      from the verified session; the caller cannot forge another tenant.
 *   2. Role-safe — events carry the role but never PII beyond what
 *      the session already has (email, role, tenantId). No IP, no
 *      cookies, no localStorage contents.
 *   3. User ID is a stable hash of the email (8 bytes) — used to
 *      compute "active users per tenant" without exposing the email
 *      in the aggregates surface.
 *   4. Bounded retention — daily rollups kept 90 days; raw events
 *      kept 7 days; per-tenant + global lists LTRIM capped.
 *   5. Fail-open — telemetry write failure NEVER blocks the user's
 *      action. Returns null silently if Redis is unavailable.
 *
 * Storage layout (Redis):
 *   tricognita:telemetry:events                   list, LTRIM 5000, raw event stream
 *   tricognita:telemetry:tenant:{tenantId}        list, LTRIM 1000, per-tenant stream
 *   tricognita:telemetry:daily:{yyyy-mm-dd}:counts  hash, event_type → count (TTL 90d)
 *   tricognita:telemetry:daily:{yyyy-mm-dd}:tenants set, tenant_id (TTL 90d)
 *   tricognita:telemetry:daily:{yyyy-mm-dd}:users   set, user_hash   (TTL 90d)
 *   tricognita:telemetry:feature:{name}:lastSeen  string, ISO ts; signals dormancy
 *   tricognita:telemetry:journey:{journeyId}      list, LTRIM 100, per-tenant journey entries
 */

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

// ─── Event taxonomy ──────────────────────────────────────────────────────────

/**
 * Telemetry event types. Adding a new one requires:
 *   1. Add to TelemetryEventType.
 *   2. Document it in docs/TELEMETRY_GOVERNANCE.md.
 *   3. (Optional) Map to a JourneyStep below if it's part of a flow.
 */
export type TelemetryEventType =
  // Navigation
  | "page_view"

  // Onboarding
  | "onboarding.started"
  | "onboarding.role_selected"
  | "onboarding.credentials_added"
  | "onboarding.first_scan_started"
  | "onboarding.completed"

  // Scan lifecycle
  | "scan.initiated"
  | "scan.completed"
  | "scan.failed"

  // Findings + remediation
  | "finding.viewed"
  | "finding.ignored"
  | "finding.promoted_to_incident"
  | "remediation.proposed_viewed"
  | "remediation.approved"
  | "remediation.rejected"

  // Incident workflow
  | "incident.declared"
  | "incident.acknowledged"
  | "incident.assigned"
  | "incident.escalated"
  | "incident.resolved"
  | "incident.noted"

  // Exports
  | "export.compliance_pdf"
  | "export.findings_csv"
  | "export.audit_csv"
  | "export.executive_pdf"
  | "export.siem_ndjson"
  | "export.soc2_pack"

  // Integrations
  | "integration.webhook_created"
  | "integration.webhook_deleted"
  | "integration.slack_connected"

  // Notifications
  | "notification.opened"
  | "notification.read"
  | "notification.cleared"

  // Feedback (Phase 15)
  | "feedback.submitted"

  // Admin actions
  | "admin.feedback_triaged"
  | "admin.health_aggregate_viewed"
  | "admin.deployment_verified";

export interface TelemetryEvent {
  /** Stable id for the event. */
  id: string;
  /** Event taxonomy. */
  type: TelemetryEventType;
  /** Tenant from the verified session — never client-supplied. */
  tenant_id: string;
  /** Stable hash of the user's email (no plaintext email in events). */
  user_hash: string;
  /** Role at time of emission (denormalized for fast role-based reports). */
  role: string;
  /** ISO timestamp. */
  occurred_at: string;
  /** Route this event was emitted from (server) or visited (client). */
  route?: string;
  /** Optional structured payload — type-specific, no PII. */
  data?: Record<string, string | number | boolean | null>;
}

// ─── Hashing — stable user identifier without storing email ─────────────────

/**
 * userHash — deterministic, non-reversible identifier from email.
 * Truncated SHA-256 hex; 16 chars is enough to avoid collisions across
 * the platform's expected user count without exposing the original.
 */
export function userHash(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}

// ─── Redis ───────────────────────────────────────────────────────────────────

const EVENTS_KEY = "tricognita:telemetry:events";
const EVENT_CAP = 5000;
const TENANT_CAP = 1000;
const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60;

function tenantKey(tenantId: string): string {
  return `tricognita:telemetry:tenant:${tenantId}`;
}
function dailyKey(date: string, kind: "counts" | "tenants" | "users"): string {
  return `tricognita:telemetry:daily:${date}:${kind}`;
}
function featureLastSeenKey(name: string): string {
  return `tricognita:telemetry:feature:${name}:lastSeen`;
}
function journeyKey(tenantId: string, journey: string): string {
  return `tricognita:telemetry:journey:${tenantId}:${journey}`;
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

function newEventId(): string {
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

// ─── Emit ────────────────────────────────────────────────────────────────────

export interface EmitArgs {
  type: TelemetryEventType;
  tenantId: string;
  userEmail: string;
  role: string;
  route?: string;
  data?: TelemetryEvent["data"];
}

/**
 * emitTelemetry — write a single event + update aggregates.
 * Fail-open: returns the event on success or null when Redis is down.
 * NEVER throws to the caller.
 */
export async function emitTelemetry(args: EmitArgs): Promise<TelemetryEvent | null> {
  const redis = getRedis();
  if (!redis) return null;

  const event: TelemetryEvent = {
    id: newEventId(),
    type: args.type,
    tenant_id: args.tenantId,
    user_hash: userHash(args.userEmail),
    role: args.role,
    occurred_at: new Date().toISOString(),
    route: args.route,
    data: args.data,
  };

  const date = isoDate();
  const payload = JSON.stringify(event);

  try {
    await Promise.all([
      // Raw stream (platform-wide, LTRIM capped)
      redis.lpush(EVENTS_KEY, payload).then(() =>
        redis.ltrim(EVENTS_KEY, 0, EVENT_CAP - 1),
      ),
      // Per-tenant stream
      redis.lpush(tenantKey(args.tenantId), payload).then(() =>
        redis.ltrim(tenantKey(args.tenantId), 0, TENANT_CAP - 1),
      ),
      // Daily aggregates — counts, tenants, users
      redis.hincrby(dailyKey(date, "counts"), event.type, 1),
      redis.expire(dailyKey(date, "counts"), DAILY_TTL_SECONDS),
      redis.sadd(dailyKey(date, "tenants"), args.tenantId),
      redis.expire(dailyKey(date, "tenants"), DAILY_TTL_SECONDS),
      redis.sadd(dailyKey(date, "users"), event.user_hash),
      redis.expire(dailyKey(date, "users"), DAILY_TTL_SECONDS),
      // Feature last-seen (per event type — drives dormancy detection)
      redis.set(featureLastSeenKey(event.type), event.occurred_at),
    ]);
  } catch {
    // Fail-open: telemetry MUST NOT break user flows.
    return null;
  }

  return event;
}

// ─── Journey tracking ────────────────────────────────────────────────────────

/**
 * recordJourneyStep — appends to a per-tenant journey list.
 * Journeys are pre-defined flows ("onboarding", "incident_lifecycle",
 * "integration_setup"). Each step is a free-text name + timestamp
 * so we can compute drop-off rates and median step durations.
 */
export async function recordJourneyStep(
  tenantId: string,
  journey: string,
  step: string,
  userEmail: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const entry = JSON.stringify({
    step,
    user_hash: userHash(userEmail),
    ts: new Date().toISOString(),
  });
  try {
    await redis.lpush(journeyKey(tenantId, journey), entry);
    await redis.ltrim(journeyKey(tenantId, journey), 0, 99);
  } catch {
    /* fail-open */
  }
}

// ─── Aggregate readers (admin-only consumers) ────────────────────────────────

export interface DailyAggregate {
  date: string;
  total_events: number;
  active_tenants: number;
  active_users: number;
  by_type: Record<string, number>;
}

/**
 * readDailyAggregate — for the admin insights page.
 * Returns null if Redis unavailable.
 */
export async function readDailyAggregate(date: string): Promise<DailyAggregate | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const [counts, tenants, users] = await Promise.all([
      redis.hgetall<Record<string, string | number>>(dailyKey(date, "counts")),
      redis.smembers(dailyKey(date, "tenants")),
      redis.smembers(dailyKey(date, "users")),
    ]);
    const by_type: Record<string, number> = {};
    let total = 0;
    if (counts) {
      for (const [k, v] of Object.entries(counts)) {
        const n = typeof v === "number" ? v : parseInt(String(v), 10);
        if (!Number.isNaN(n)) {
          by_type[k] = n;
          total += n;
        }
      }
    }
    return {
      date,
      total_events: total,
      active_tenants: (tenants ?? []).length,
      active_users: (users ?? []).length,
      by_type,
    };
  } catch {
    return null;
  }
}

/**
 * readDailyRange — sum aggregates across N days.
 */
export async function readDailyRange(days: number): Promise<DailyAggregate[]> {
  const out: DailyAggregate[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const agg = await readDailyAggregate(isoDate(d));
    if (agg) out.push(agg);
  }
  return out;
}

export interface FeatureLastSeen {
  type: TelemetryEventType;
  last_seen: string | null;
  days_since: number | null;
}

const DORMANCY_THRESHOLD_DAYS = 14;

/**
 * readFeatureLastSeen — returns last-seen for every event type in the
 * taxonomy. Used by the insights dashboard to flag dormant features.
 */
export async function readFeatureLastSeen(): Promise<FeatureLastSeen[]> {
  const redis = getRedis();
  if (!redis) return [];
  // Snapshot of every event type in the taxonomy.
  const ALL_TYPES: TelemetryEventType[] = [
    "page_view",
    "onboarding.started",
    "onboarding.role_selected",
    "onboarding.credentials_added",
    "onboarding.first_scan_started",
    "onboarding.completed",
    "scan.initiated",
    "scan.completed",
    "scan.failed",
    "finding.viewed",
    "finding.ignored",
    "finding.promoted_to_incident",
    "remediation.proposed_viewed",
    "remediation.approved",
    "remediation.rejected",
    "incident.declared",
    "incident.acknowledged",
    "incident.assigned",
    "incident.escalated",
    "incident.resolved",
    "incident.noted",
    "export.compliance_pdf",
    "export.findings_csv",
    "export.audit_csv",
    "export.executive_pdf",
    "export.siem_ndjson",
    "export.soc2_pack",
    "integration.webhook_created",
    "integration.webhook_deleted",
    "integration.slack_connected",
    "notification.opened",
    "notification.read",
    "notification.cleared",
    "feedback.submitted",
    "admin.feedback_triaged",
    "admin.health_aggregate_viewed",
    "admin.deployment_verified",
  ];
  const keys = ALL_TYPES.map(featureLastSeenKey);
  const vals = await redis.mget<(string | null)[]>(...keys);
  const now = Date.now();
  return ALL_TYPES.map((type, i) => {
    const last_seen = vals[i] ?? null;
    const days_since = last_seen
      ? Math.floor((now - new Date(last_seen).getTime()) / (24 * 60 * 60 * 1000))
      : null;
    return { type, last_seen, days_since };
  });
}

/**
 * dormantFeatures — convenience filter: features not used in N days.
 * "Never seen" features are included as dormant.
 */
export async function dormantFeatures(thresholdDays = DORMANCY_THRESHOLD_DAYS): Promise<FeatureLastSeen[]> {
  const all = await readFeatureLastSeen();
  return all.filter((f) => f.days_since === null || f.days_since >= thresholdDays);
}

export interface JourneyStepEntry {
  step: string;
  user_hash: string;
  ts: string;
}

/**
 * readJourney — per-tenant journey log for a named flow.
 */
export async function readJourney(
  tenantId: string,
  journey: string,
  limit = 100,
): Promise<JourneyStepEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = (await redis.lrange(journeyKey(tenantId, journey), 0, limit - 1)) as Array<
      string | object
    >;
    return raw.map((r) =>
      typeof r === "string" ? JSON.parse(r) : (r as JourneyStepEntry),
    );
  } catch {
    return [];
  }
}
