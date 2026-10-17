/**
 * Domain entities — FRONTEND_DOMAIN_MODEL.md §2.
 *
 * The UI's own model. Backend DTOs live in lib/api/dto and are converted by
 * adapters; a DTO never reaches a component. Pure types only.
 *
 * The seven concepts stay distinct and must not be collapsed into "finding":
 *   Control      what should be true
 *   ControlResult what was observed for one control × one resource × one run
 *   Finding      a recorded instance of a control failing for a resource
 *   Remediation  the change intended to resolve the finding
 *   Verification the subsequent check that decides whether it is true
 *   Drift        a regression from a previously verified PASS
 *   Evidence     the recorded proof of what was observed or what happened
 */

import type {
  AccountConnection,
  AlertChannel,
  AlertEvent,
  CloudProvider,
  ControlDomain,
  ControlStatus,
  EvidenceIntegrity,
  EvidenceKind,
  FindingStatus,
  NotAssessedReason,
  RemediationState,
  RemediationVerdict,
  ReportKind,
  ReportState,
  Severity,
  UserStatus,
  VerificationState,
} from "./status";

/** ISO-8601 instant, always UTC in the model; formatted for display by <DateTime>. */
export type Timestamp = string;

export type FrameworkId = "CIS_AWS" | "SOC2" | "ISO27001" | "DPDP";

export interface FrameworkRef {
  framework: FrameworkId;
  /** The framework's own reference, e.g. "CIS 2.1.4" or "CC6.1". A label, never a verdict. */
  ref: string;
}

export interface ExceptionRef {
  id: string;
  expiresAt: Timestamp;
}

export interface RemediationRef {
  id: string;
  state: RemediationState;
}

export interface Control {
  /** Stable catalogue id, e.g. "TC-DATA-02". Safe to show and to deep-link. */
  id: string;
  name: string;
  description: string;
  whyItMatters: string;
  domain: ControlDomain;
  /** Plain-language target state, e.g. "Block Public Access enabled on every bucket". */
  expectedState: string;
  severity: Severity;
  provider: CloudProvider;
  frameworkRefs: FrameworkRef[];
  status: ControlStatus;
  notAssessedReason?: NotAssessedReason;
  resourcesInScope: number;
  resourcesFailing: number;
  lastVerifiedAt?: Timestamp;
  nextVerificationAt?: Timestamp;
  verification: VerificationState;
  /** True when an automated fix exists for this control. */
  remediationAvailable: boolean;
  exception?: ExceptionRef;
  /** Most recent first. */
  evidenceRefs: string[];
}

export interface ControlResult {
  id: string;
  controlId: string;
  resourceId: string;
  runId: string;
  status: Extract<ControlStatus, "PASS" | "FAIL" | "NOT_ASSESSED">;
  notAssessedReason?: NotAssessedReason;
  checkedAt: Timestamp;
  evidenceId?: string;
  /** Present when this result changed state — the basis for drift. */
  previousStatus?: ControlStatus;
}

export interface Resource {
  id: string;
  /** Friendly label from a Name tag or customer alias, e.g. "Orders database". */
  label: string;
  type: string;
  service: string;
  provider: CloudProvider;
  accountId: string;
  regionLabel: string;
  regionCode?: string;
  /** Masked identifier. The full identifier is reveal-on-demand and role-gated. */
  identifierMasked: string;
  tags?: Record<string, string>;
}

export interface RemediationStep {
  order: number;
  instruction: string;
  console?: string;
  cli?: string;
  iac?: string;
}

export interface Finding {
  id: string;
  controlId: string;
  resourceId: string;
  title: string;
  severity: Severity;
  status: FindingStatus;
  firstSeenAt: Timestamp;
  lastSeenAt: Timestamp;
  resolvedAt?: Timestamp;
  remediationSteps: RemediationStep[];
  remediation?: RemediationRef;
}

export type VerificationTrigger = "SCHEDULED" | "MANUAL" | "POST_REMEDIATION";

export interface VerificationRun {
  id: string;
  trigger: VerificationTrigger;
  state: VerificationState;
  startedAt: Timestamp;
  finishedAt?: Timestamp;
  scope: { controlIds?: string[]; accountIds?: string[] };
  counts: { evaluated: number; passed: number; failed: number; notAssessed: number };
  /** Display name. Never an email address in a shared view. */
  requestedBy?: string;
  error?: { code: string; message: string };
}

export type RemediationMethod = "AUTOMATED" | "TRICOGNITA_ENGINEER" | "CUSTOMER";

export interface RemediationOutcome {
  resourceId: string;
  status: "FIXED" | "FAILED" | "SKIPPED";
  message?: string;
}

export interface Remediation {
  id: string;
  controlId: string;
  /** The allow-listed action, e.g. "aws.s3.block_public_access". */
  action?: string;
  /**
   * What the product may claim. state says what happened to the request;
   * verdict says whether the customer's control passes. Only REMEDIATED
   * asserts the problem is fixed, and only a verification run produces it.
   */
  verdict?: RemediationVerdict;
  resourceIds: string[];
  state: RemediationState;
  method: RemediationMethod;
  requestedBy: string;
  requestedAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  approvalExpiresAt?: Timestamp;
  executedAt?: Timestamp;
  completedAt?: Timestamp;
  /** Plain language: what will change, in the customer's words. */
  summary: string;
  rollback?: string;
  /** The run that confirmed the change. Without it, nothing is "completed". */
  verificationRunId?: string;
  outcome?: RemediationOutcome[];
}

export interface DriftEvent {
  id: string;
  controlId: string;
  resourceId: string;
  detectedAt: Timestamp;
  previousStatus: "PASS";
  currentStatus: "FAIL";
  detectedByRunId: string;
  resolvedAt?: Timestamp;
  resolvedByRunId?: string;
  remediationId?: string;
  /** Alert route names that were notified. */
  notifiedRoutes?: string[];
}

export interface Evidence {
  /** Short display reference, e.g. "EV-7F3A". Never a database id. */
  id: string;
  kind: EvidenceKind;
  controlId?: string;
  runId?: string;
  recordedAt: Timestamp;
  integrity: EvidenceIntegrity;
  summary: string;
}

/** One action recorded in the organisation's tamper-evident audit trail. */
export interface AuditEvent {
  /** Position in the organisation's chain; strictly increasing. */
  seq: number;
  /** Who acted: an email address or a system actor. Shown only to roles that may view the trail. */
  actor: string;
  /** The recorded action key, e.g. "credential_added". */
  action: string;
  resource: string;
  /** Short non-sensitive details, as returned (sensitive keys are dropped by the API). */
  details: Record<string, string | number | boolean | null>;
  occurredAt: Timestamp;
}

export type ExceptionState = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface Exception {
  id: string;
  controlId: string;
  resourceIds: string[];
  reason: string;
  owner: string;
  createdAt: Timestamp;
  /** At most 180 days after createdAt. */
  expiresAt: Timestamp;
  state: ExceptionState;
  revokedBy?: string;
  revokedAt?: Timestamp;
}

export interface Report {
  id: string;
  kind: ReportKind;
  periodStart: Timestamp;
  periodEnd: Timestamp;
  state: ReportState;
  generatedAt?: Timestamp;
  downloadUrl?: string;
  formats: ("PDF" | "CSV" | "JSON")[];
  /** Who generated it. Absent on a customer-facing summary that names no one. */
  generatedBy?: string;
  /** Whether the document carries a signature. Only ever true when the API said so. */
  signed?: boolean;
  summary?: {
    controlsVerified: number;
    controlsFailing: number;
    driftEvents: number;
    remediations: number;
  };
  error?: string;
}

export interface CloudAccount {
  id: string;
  alias: string;
  provider: CloudProvider;
  /** e.g. "•••• 4821". The full account id is never rendered by default. */
  accountIdMasked: string;
  connection: AccountConnection;
  connectedAt?: Timestamp;
  lastVerifiedAt?: Timestamp;
  regions: string[];
  /** What to do about a failure, in plain language. */
  message?: string;
}

export interface AlertRoute {
  id: string;
  name: string;
  channel: AlertChannel;
  destinationMasked: string;
  events: AlertEvent[];
  enabled: boolean;
}

/** The four product roles. Session roles map onto these — see lib/domain/roles.ts. */
export type ProductRole = "ADMIN" | "SECURITY_OPS" | "ENGINEERING" | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: ProductRole;
  lastActiveAt?: Timestamp;
  status: UserStatus;
}

export interface Organisation {
  id: string;
  name: string;
  controlsInBaseline: number;
}
