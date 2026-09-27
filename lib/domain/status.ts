/**
 * Domain status vocabulary — FRONTEND_DOMAIN_MODEL.md §1.
 *
 * Pure data. No React, no SWR, no Next. Every status the product renders is
 * declared here once, with its label and semantic token role, so the same
 * state never gets two visual treatments in two screens.
 */

export type ControlStatus =
  | "PASS"
  | "FAIL"
  | "DRIFTED"
  | "VERIFYING"
  | "EXCEPTION"
  | "NOT_ASSESSED";

/** Why a control could not be assessed. Never rendered as a pass. */
export type NotAssessedReason =
  | "NEVER_RUN"
  | "NO_PERMISSION"
  | "PROVIDER_ERROR"
  | "NOT_APPLICABLE";

export type VerificationState = "PENDING" | "VERIFYING" | "VERIFIED" | "FAILED";

export type RemediationState =
  | "NOT_STARTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "EXECUTING"
  /**
   * The change was applied and the provider accepted it. Whether it fixed the
   * control is a separate question answered by RemediationVerdict, so this is
   * deliberately not COMPLETED: a cloud can accept a change that does not
   * satisfy the control, and the backend records the two facts apart.
   */
  | "APPLIED"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED"
  | "REJECTED"
  | "EXPIRED";

/**
 * What the product may CLAIM about a remediation, as opposed to what happened
 * to the request.
 *
 * The separation is the point. A provider accepting a write is not the same as
 * a control passing, and only a fresh verification run may produce REMEDIATED.
 */
export type RemediationVerdict =
  | "PENDING"
  | "REMEDIATED"
  | "NOT_EFFECTIVE"
  | "UNVERIFIED"
  | "FAILED"
  | "REJECTED";

export type FindingStatus =
  | "OPEN"
  | "IN_REMEDIATION"
  | "AWAITING_VERIFICATION"
  | "RESOLVED"
  | "EXCEPTION";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** What a piece of evidence records. */
export type EvidenceKind = "CONTROL_VERIFICATION" | "REMEDIATION" | "DRIFT";

/** Whether the stored evidence still matches its recorded hash. */
export type EvidenceIntegrity = "VERIFIED" | "FAILED" | "UNCHECKED";

export type ReportKind = "MONTHLY_ASSURANCE" | "CUSTOMER_REVIEW" | "EVIDENCE_EXPORT";

export type ReportState = "GENERATING" | "READY" | "FAILED" | "UNAVAILABLE";

export type AlertChannel = "EMAIL" | "SLACK" | "PAGERDUTY" | "WEBHOOK";
export type AlertEvent = "DRIFT" | "NEW_FAILURE" | "VERIFICATION_FAILED";
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

/** How cleanly Tricognita can read a connected cloud account. */
export type AccountConnection =
  | "CONNECTING"
  | "CONNECTED"
  | "DISCONNECTED"
  | "PERMISSION_FAILURE"
  | "SCAN_FAILURE";

export type ControlDomain =
  | "IDENTITY"
  | "LOGGING"
  | "STORAGE"
  | "NETWORK"
  | "ENCRYPTION"
  | "ACCOUNT"
  | "RESILIENCE";

export type CloudProvider = "AWS" | "AZURE" | "GCP";

/** What the product may honestly claim about a provider today. */
export type ProviderReadiness = "SUPPORTED" | "IN_VALIDATION" | "NOT_AVAILABLE";

/** Visual intent understood by lib/ui primitives (Badge, StatusDot). */
export type StatusIntent = "success" | "danger" | "warning" | "info" | "neutral" | "violet";

/** Shape carries meaning alongside colour — colour is never the only signal. */
export type StatusShape = "dot" | "square" | "half" | "ring" | "hollow" | "diamond" | "dash";

export interface StatusPresentation {
  label: string;
  intent: StatusIntent;
  shape: StatusShape;
  /** One-line explanation for tooltips and empty states. */
  meaning: string;
}

export const CONTROL_STATUS: Record<ControlStatus, StatusPresentation> = {
  PASS: {
    label: "Passing",
    intent: "success",
    shape: "dot",
    meaning: "Every resource in scope met this control at the last verification.",
  },
  FAIL: {
    label: "Failing",
    intent: "danger",
    shape: "square",
    meaning: "At least one resource does not meet this control.",
  },
  DRIFTED: {
    label: "Drifted",
    intent: "warning",
    shape: "half",
    meaning: "This control was passing and is now failing again.",
  },
  VERIFYING: {
    label: "Verifying",
    intent: "info",
    shape: "ring",
    meaning: "A verification run is checking this control now.",
  },
  EXCEPTION: {
    label: "Exception",
    intent: "neutral",
    shape: "diamond",
    meaning: "Accepted risk with an owner and an expiry date.",
  },
  NOT_ASSESSED: {
    label: "Not assessed",
    intent: "neutral",
    shape: "dash",
    meaning: "This control could not be checked. It is not counted as passing.",
  },
};

export const NOT_ASSESSED_REASON: Record<NotAssessedReason, string> = {
  NEVER_RUN: "No verification has run yet",
  NO_PERMISSION: "The connected role is missing a permission",
  PROVIDER_ERROR: "The cloud provider returned an error",
  NOT_APPLICABLE: "No resources of this type in scope",
};

export const VERIFICATION_STATE: Record<VerificationState, StatusPresentation> = {
  PENDING: { label: "Pending", intent: "neutral", shape: "hollow", meaning: "Queued, not started." },
  VERIFYING: { label: "Verifying", intent: "info", shape: "ring", meaning: "Checks are running." },
  VERIFIED: { label: "Verified", intent: "success", shape: "dot", meaning: "Checks completed." },
  FAILED: { label: "Failed", intent: "danger", shape: "square", meaning: "The run could not complete." },
};

export const REMEDIATION_STATE: Record<RemediationState, StatusPresentation> = {
  NOT_STARTED: { label: "Not started", intent: "neutral", shape: "hollow", meaning: "No fix requested yet." },
  PENDING_APPROVAL: { label: "Awaiting approval", intent: "warning", shape: "hollow", meaning: "Needs a named approver." },
  APPROVED: { label: "Approved", intent: "info", shape: "dot", meaning: "Approved, not yet applied." },
  EXECUTING: { label: "Applying", intent: "info", shape: "ring", meaning: "The change is being applied." },
  APPLIED: { label: "Applied", intent: "info", shape: "half", meaning: "The change was made. Whether it fixed the control is shown separately." },
  COMPLETED: { label: "Completed", intent: "success", shape: "dot", meaning: "Applied and confirmed by a verification run." },
  PARTIAL: { label: "Partly applied", intent: "warning", shape: "half", meaning: "Some resources were fixed, others were not." },
  FAILED: { label: "Failed", intent: "danger", shape: "square", meaning: "The change did not apply." },
  REJECTED: { label: "Rejected", intent: "neutral", shape: "diamond", meaning: "An approver declined the change." },
  EXPIRED: { label: "Expired", intent: "neutral", shape: "hollow", meaning: "The approval window closed." },
};

export const REMEDIATION_VERDICT: Record<RemediationVerdict, StatusPresentation> = {
  PENDING: { label: "Not yet applied", intent: "neutral", shape: "hollow", meaning: "Nothing has changed in your cloud yet." },
  REMEDIATED: { label: "Fixed", intent: "success", shape: "dot", meaning: "A fresh check confirms the control now passes." },
  NOT_EFFECTIVE: { label: "Did not fix it", intent: "danger", shape: "square", meaning: "The change was made and the control still does not pass." },
  UNVERIFIED: { label: "Unconfirmed", intent: "warning", shape: "half", meaning: "The change was made. The control could not be re-checked, so nothing is claimed." },
  FAILED: { label: "Failed", intent: "danger", shape: "square", meaning: "The change could not be applied." },
  REJECTED: { label: "Rejected", intent: "neutral", shape: "diamond", meaning: "An approver declined the change." },
};

export const FINDING_STATUS: Record<FindingStatus, StatusPresentation> = {
  OPEN: { label: "Open", intent: "danger", shape: "square", meaning: "The resource is failing its control." },
  IN_REMEDIATION: { label: "In remediation", intent: "info", shape: "ring", meaning: "A fix is in progress." },
  AWAITING_VERIFICATION: { label: "Awaiting verification", intent: "warning", shape: "hollow", meaning: "A fix was applied; the next check decides." },
  RESOLVED: { label: "Resolved", intent: "success", shape: "dot", meaning: "A verification run confirmed the fix." },
  EXCEPTION: { label: "Exception", intent: "neutral", shape: "diamond", meaning: "Accepted risk with an expiry." },
};

export const SEVERITY: Record<Severity, StatusPresentation> = {
  CRITICAL: { label: "Critical", intent: "danger", shape: "square", meaning: "Fix first." },
  HIGH: { label: "High", intent: "danger", shape: "square", meaning: "Fix soon." },
  MEDIUM: { label: "Medium", intent: "warning", shape: "half", meaning: "Plan a fix." },
  LOW: { label: "Low", intent: "neutral", shape: "hollow", meaning: "Address when convenient." },
};

/** Worst first — the order findings are worked in. */
export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/** Open work first, settled states last. */
export const FINDING_STATUS_ORDER: Record<FindingStatus, number> = {
  OPEN: 0,
  IN_REMEDIATION: 1,
  AWAITING_VERIFICATION: 2,
  EXCEPTION: 3,
  RESOLVED: 4,
};

export const CONTROL_DOMAIN_LABEL: Record<ControlDomain, string> = {
  IDENTITY: "Identity",
  LOGGING: "Logging",
  STORAGE: "Storage",
  NETWORK: "Network",
  ENCRYPTION: "Encryption",
  ACCOUNT: "Account",
  RESILIENCE: "Resilience",
};

export const CONTROL_DOMAINS: ControlDomain[] = [
  "IDENTITY",
  "LOGGING",
  "STORAGE",
  "NETWORK",
  "ENCRYPTION",
  "ACCOUNT",
  "RESILIENCE",
];

export const PROVIDER_LABEL: Record<CloudProvider, string> = {
  AWS: "AWS",
  AZURE: "Azure",
  GCP: "Google Cloud",
};

/**
 * What the product may claim per provider today. Reconciliation gate §4:
 * AWS is the only provider with a validated path; Azure passed a Reader-scoped
 * scan but has no onboarding; GCP is unvalidated.
 */
export const PROVIDER_READINESS: Record<CloudProvider, ProviderReadiness> = {
  AWS: "SUPPORTED",
  AZURE: "IN_VALIDATION",
  GCP: "NOT_AVAILABLE",
};

export const PROVIDER_READINESS_LABEL: Record<ProviderReadiness, string> = {
  SUPPORTED: "Supported",
  IN_VALIDATION: "In validation",
  NOT_AVAILABLE: "Not available yet",
};

/** A control counts as needing attention when it is failing or has drifted. */
export function needsAttention(status: ControlStatus): boolean {
  return status === "FAIL" || status === "DRIFTED";
}

/** Sort order for lists: what needs attention first, settled states last. */
export const CONTROL_STATUS_ORDER: Record<ControlStatus, number> = {
  DRIFTED: 0,
  FAIL: 1,
  VERIFYING: 2,
  NOT_ASSESSED: 3,
  EXCEPTION: 4,
  PASS: 5,
};

/**
 * Evidence and report vocabulary.
 *
 * Evidence integrity is a check result, not a compliance verdict: VERIFIED
 * means the stored record still matches the hash written when it was taken.
 * FAILED is never quietly downgraded to "unchecked" — a record that cannot be
 * trusted is the one thing a customer most needs to be told.
 */
export const EVIDENCE_KIND: Record<EvidenceKind, string> = {
  CONTROL_VERIFICATION: "Control verification",
  REMEDIATION: "Remediation",
  DRIFT: "Drift",
};

export const EVIDENCE_KIND_MEANING: Record<EvidenceKind, string> = {
  CONTROL_VERIFICATION: "What a verification run observed.",
  REMEDIATION: "The change that was applied, and the check that confirmed it.",
  DRIFT: "The moment a control moved from passing to failing.",
};

export const EVIDENCE_INTEGRITY: Record<EvidenceIntegrity, StatusPresentation> = {
  VERIFIED: {
    label: "Integrity check passed",
    intent: "success",
    shape: "dot",
    meaning: "This record still matches the hash written when it was taken.",
  },
  FAILED: {
    label: "Integrity check failed",
    intent: "danger",
    shape: "square",
    meaning: "This record no longer matches its recorded hash. Contact support before relying on it.",
  },
  UNCHECKED: {
    label: "Not yet checked",
    intent: "neutral",
    shape: "hollow",
    meaning: "The integrity of this record has not been re-checked since it was written.",
  },
};

export const REPORT_KIND: Record<ReportKind, string> = {
  MONTHLY_ASSURANCE: "Monthly assurance",
  CUSTOMER_REVIEW: "Customer review",
  EVIDENCE_EXPORT: "Evidence export",
};

export const REPORT_KIND_MEANING: Record<ReportKind, string> = {
  MONTHLY_ASSURANCE: "The recurring record of what was checked in a calendar month, and what was found.",
  CUSTOMER_REVIEW: "A short, customer-safe summary to send when someone asks about your cloud controls.",
  EVIDENCE_EXPORT: "The underlying evidence records for a period, for an auditor to inspect.",
};

export const REPORT_STATE: Record<ReportState, StatusPresentation> = {
  GENERATING: {
    label: "Generating",
    intent: "info",
    shape: "ring",
    meaning: "The document is being produced. There is nothing to download yet.",
  },
  READY: {
    label: "Ready",
    intent: "success",
    shape: "dot",
    meaning: "The document was produced and covers the period shown.",
  },
  FAILED: {
    label: "Could not be generated",
    intent: "danger",
    shape: "square",
    meaning: "The document was not produced. The reason is recorded with it.",
  },
  UNAVAILABLE: {
    label: "Not available yet",
    intent: "neutral",
    shape: "dash",
    meaning: "This kind of report is not switched on for your account.",
  },
};

/**
 * Account connection, in the customer's words.
 *
 * Each label says what it means for their results, because that is the part
 * that matters: an account we cannot read produces NOT_ASSESSED controls, and
 * those must never be mistaken for passing ones.
 */
export const ACCOUNT_CONNECTION_LABEL: Record<AccountConnection, string> = {
  CONNECTING: "Connecting — the first verification has not run yet",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected — no controls are being checked",
  PERMISSION_FAILURE: "The connected role is missing a permission — some controls cannot be checked",
  SCAN_FAILURE: "The last verification could not read this account",
};

/** Where an alert goes. The destination itself is only ever shown masked. */
export const ALERT_CHANNEL_LABEL: Record<AlertChannel, string> = {
  EMAIL: "Email",
  SLACK: "Slack",
  PAGERDUTY: "PagerDuty",
  WEBHOOK: "Webhook",
};

/** What wakes a route up, in the words the customer chose it for. */
export const ALERT_EVENT_LABEL: Record<AlertEvent, string> = {
  DRIFT: "A control drifts",
  NEW_FAILURE: "A control starts failing",
  VERIFICATION_FAILED: "A verification run does not complete",
};

export const USER_STATUS: Record<UserStatus, StatusPresentation> = {
  ACTIVE: { label: "Active", intent: "success", shape: "dot", meaning: "Has signed in and can use the product." },
  INVITED: { label: "Invited", intent: "neutral", shape: "hollow", meaning: "Invited, has not signed in yet." },
  DISABLED: { label: "Disabled", intent: "neutral", shape: "dash", meaning: "Cannot sign in. The record is kept for the audit trail." },
};

export const ACCOUNT_CONNECTION: Record<AccountConnection, StatusPresentation> = {
  CONNECTING: {
    label: "Connecting",
    intent: "info",
    shape: "ring",
    meaning: "The connection is being set up. Nothing has been verified yet.",
  },
  CONNECTED: {
    label: "Connected",
    intent: "success",
    shape: "dot",
    meaning: "Tricognita can read this account and verify its controls.",
  },
  DISCONNECTED: {
    label: "Disconnected",
    intent: "danger",
    shape: "square",
    meaning: "No controls are being checked on this account.",
  },
  PERMISSION_FAILURE: {
    label: "Missing a permission",
    intent: "warning",
    shape: "half",
    meaning: "Some controls cannot be checked. Their results are Not assessed, never Passing.",
  },
  SCAN_FAILURE: {
    label: "Could not be read",
    intent: "warning",
    shape: "half",
    meaning: "The last verification could not read this account.",
  },
};
