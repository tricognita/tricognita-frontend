/**
 * lib/events — typed platform event registry.
 *
 * Phase 12 — event bus foundations. Every integration leg (webhooks,
 * Slack, SIEM export, audit chain) consumes events. This module is the
 * single typed contract for what an "event" looks like across the whole
 * platform.
 *
 * Design notes:
 *
 *   1. EVERY event carries:
 *        id            — globally unique (ULID-like)
 *        type          — typed enum (PlatformEventType)
 *        version       — schema version per type (we bump these when we
 *                        break a downstream consumer)
 *        tenant_id     — null for platform-level events
 *        actor         — { email, role } | null
 *        occurred_at   — ISO timestamp from the source-of-truth
 *        correlation_id — request id from the originating BFF call
 *        data          — type-specific payload
 *        envelope_version — bumped only when this OUTER shape changes;
 *                        currently "1"
 *
 *   2. The envelope is intentionally close to the Cloud Native CloudEvents
 *      spec so customers integrating with Knative / Argo / Eventarc /
 *      AWS EventBridge can map us directly.
 *
 *   3. Type registry is exhaustive — every `PlatformEventType` has a typed
 *      `data` shape declared here. The compiler catches shape drift the
 *      same way `rbac-roster.ts` catches RBAC drift.
 *
 *   4. NO emission logic in this file. lib/events.ts is the contract;
 *      lib/event-bus.ts (or wherever dispatch lands) is the verb.
 */

import type { Role } from "./auth";

// ─── Event types ─────────────────────────────────────────────────────────────

export type PlatformEventType =
  // Scan lifecycle
  | "scan.queued"
  | "scan.started"
  | "scan.completed"
  | "scan.failed"
  // Findings
  | "finding.created"
  | "finding.resolved"
  | "finding.suppressed"
  // Remediation
  | "remediation.proposed"
  | "remediation.approved"
  | "remediation.rejected"
  | "remediation.executed"
  | "remediation.failed"
  // Incidents (operator-declared)
  | "incident.declared"
  | "incident.acknowledged"
  | "incident.resolved"
  // Credentials
  | "credentials.connected"
  | "credentials.tested"
  | "credentials.removed"
  // API keys
  | "api_key.created"
  | "api_key.revoked"
  // Settings / governance
  | "settings.healing_mode_changed"
  | "settings.aria_threshold_changed"
  // Compliance posture
  | "compliance.score_changed"
  // System health
  | "platform.degraded"
  | "platform.recovered";

// ─── Type-specific payload shapes ────────────────────────────────────────────

export interface ScanQueuedData {
  scan_id: string;
  trigger: "manual" | "scheduled" | "api";
  initiated_by: string;
}
export interface ScanStartedData {
  scan_id: string;
}
export interface ScanCompletedData {
  scan_id: string;
  findings_count: number;
  critical_count: number;
  high_count: number;
  duration_ms?: number;
  simulated?: boolean;
}
export interface ScanFailedData {
  scan_id: string;
  error: string;
  reason: "timeout" | "error" | "quota_exceeded" | "backend_unreachable";
}

export interface FindingCreatedData {
  finding_id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  resource: string;
  title: string;
  risk_score: number;
  frameworks?: string[];
}
export interface FindingStateData {
  finding_id: string;
  reason?: string;
}

export interface RemediationData {
  action_id: string;
  action_type: string;
  finding_id?: string;
  target_arn?: string;
  job_id?: string;
}

export interface IncidentData {
  incident_id: string;
  title: string;
  severity: "info" | "minor" | "major" | "critical";
  scope: "platform" | "tenant" | "subsystem";
  affected_subsystem?: string;
}

export interface CredentialsData {
  credential_id?: string;
  role_arn: string;
  account_id?: string;
  regions?: string[];
}

export interface ApiKeyData {
  key_id: string;
  prefix?: string;
  name?: string;
}

export interface SettingsHealingModeData {
  from: string | null;
  to: string;
}
export interface SettingsAriaThresholdData {
  risk_threshold: number;
  blast_radius_cap: number;
}

export interface ComplianceScoreChangedData {
  framework: string;
  from: number;
  to: number;
}

export interface PlatformPostureData {
  status: "healthy" | "degraded" | "outage";
  upstream?: string;
  detail?: string;
}

// ─── Discriminated union: PlatformEvent<T> ───────────────────────────────────
// Each event type maps to its payload shape. The discriminator is `type`.

export type EventDataMap = {
  "scan.queued": ScanQueuedData;
  "scan.started": ScanStartedData;
  "scan.completed": ScanCompletedData;
  "scan.failed": ScanFailedData;
  "finding.created": FindingCreatedData;
  "finding.resolved": FindingStateData;
  "finding.suppressed": FindingStateData;
  "remediation.proposed": RemediationData;
  "remediation.approved": RemediationData;
  "remediation.rejected": RemediationData;
  "remediation.executed": RemediationData;
  "remediation.failed": RemediationData & { error: string };
  "incident.declared": IncidentData;
  "incident.acknowledged": IncidentData;
  "incident.resolved": IncidentData;
  "credentials.connected": CredentialsData;
  "credentials.tested": CredentialsData & { ok: boolean };
  "credentials.removed": CredentialsData;
  "api_key.created": ApiKeyData;
  "api_key.revoked": ApiKeyData;
  "settings.healing_mode_changed": SettingsHealingModeData;
  "settings.aria_threshold_changed": SettingsAriaThresholdData;
  "compliance.score_changed": ComplianceScoreChangedData;
  "platform.degraded": PlatformPostureData;
  "platform.recovered": PlatformPostureData;
};

// Bump the version for a single type when its payload shape changes in a
// non-backward-compatible way. Downstream consumers should branch on
// (type, version) when they need both old + new format support.
export const EVENT_VERSIONS: Record<PlatformEventType, number> = {
  "scan.queued": 1,
  "scan.started": 1,
  "scan.completed": 1,
  "scan.failed": 1,
  "finding.created": 1,
  "finding.resolved": 1,
  "finding.suppressed": 1,
  "remediation.proposed": 1,
  "remediation.approved": 1,
  "remediation.rejected": 1,
  "remediation.executed": 1,
  "remediation.failed": 1,
  "incident.declared": 1,
  "incident.acknowledged": 1,
  "incident.resolved": 1,
  "credentials.connected": 1,
  "credentials.tested": 1,
  "credentials.removed": 1,
  "api_key.created": 1,
  "api_key.revoked": 1,
  "settings.healing_mode_changed": 1,
  "settings.aria_threshold_changed": 1,
  "compliance.score_changed": 1,
  "platform.degraded": 1,
  "platform.recovered": 1,
};

// Envelope version — bumped only when the outer shape (id, type, version,
// tenant_id, actor, occurred_at, correlation_id, data) changes structurally.
export const ENVELOPE_VERSION = 1;

export interface PlatformEvent<T extends PlatformEventType = PlatformEventType> {
  /** Globally unique event id (ULID-style). */
  id: string;
  /** Outer envelope version. Bumped only on structural changes. */
  envelope_version: number;
  /** Typed event identifier. */
  type: T;
  /** Per-type schema version. */
  version: number;
  /** Tenant scope. null for platform-level events. */
  tenant_id: string | null;
  /** Who caused this event. null for system-emitted events. */
  actor: { email: string; role: Role } | null;
  /** Source-of-truth timestamp (ISO). */
  occurred_at: string;
  /** BFF request id from the originating call, when available. */
  correlation_id: string | null;
  /** Type-specific payload. */
  data: EventDataMap[T];
}

// ─── Construction helper ─────────────────────────────────────────────────────

/**
 * makeEvent — type-safe constructor. Compiler enforces that `data` matches
 * the declared `type`. Generates the id + envelope_version + version
 * automatically. Use this everywhere events are emitted to guarantee shape.
 */
export function makeEvent<T extends PlatformEventType>(args: {
  type: T;
  data: EventDataMap[T];
  tenant_id: string | null;
  actor?: { email: string; role: Role } | null;
  correlation_id?: string | null;
  occurred_at?: string;
}): PlatformEvent<T> {
  return {
    id: newEventId(),
    envelope_version: ENVELOPE_VERSION,
    type: args.type,
    version: EVENT_VERSIONS[args.type],
    tenant_id: args.tenant_id,
    actor: args.actor ?? null,
    occurred_at: args.occurred_at ?? new Date().toISOString(),
    correlation_id: args.correlation_id ?? null,
    data: args.data,
  };
}

/**
 * newEventId — 26-char monotonic-ish id (timestamp-prefixed). Sortable;
 * cheap to generate; no external dep. Not strictly ULID-conformant
 * (we don't reserve the Crockford alphabet) but the prefix is sortable
 * by emission time which is what downstream consumers actually need.
 */
function newEventId(): string {
  const ts = Date.now().toString(36).padStart(10, "0");
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `evt_${ts}_${rand}`;
}

// ─── Type-guard helpers ──────────────────────────────────────────────────────

/** Narrow an event by type. Useful in switch/case branches. */
export function isEventType<T extends PlatformEventType>(
  evt: PlatformEvent,
  type: T,
): evt is PlatformEvent<T> {
  return evt.type === type;
}

/** All event types as a value (e.g., for UI subscription pickers). */
export const ALL_EVENT_TYPES: PlatformEventType[] = Object.keys(
  EVENT_VERSIONS,
) as PlatformEventType[];
