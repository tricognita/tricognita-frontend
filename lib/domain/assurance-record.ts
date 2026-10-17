/**
 * The Control Assurance Record — the product's factual record of checks and
 * changes, per control per resource.
 *
 * It is a record, not an opinion: there is no score, no "compliant" and no
 * "audit ready" anywhere in this model, and none may be added. The one outcome
 * that says a change worked (FIXED) exists only when a Tricognita check passed.
 */

import type { ControlStatus, NotAssessedReason, StatusPresentation } from "./status";

/** VERIFIED | FAILED | UNCHECKED | MISSING. Anything else is UNCHECKED. */
export type RecordEvidenceIntegrity = "VERIFIED" | "FAILED" | "UNCHECKED" | "MISSING";

/** The whole record's integrity. NO_EVIDENCE means nothing was recorded yet. */
export type RecordIntegrityStatus = "VERIFIED" | "FAILED" | "UNCHECKED" | "NO_EVIDENCE";

export type RecordOutcome =
  | "FIXED"
  | "DID_NOT_FIX"
  | "NOT_VERIFIED"
  | "PENDING"
  | "FAILED"
  | "REJECTED"
  | "EXPIRED";

export type RecordRemediationKind = "TRICOGNITA_AUTOMATED_FIX" | "CUSTOMER_APPLIED";

/** On what basis the record knows who applied a change. */
export type ExecutionBasis = "RECORDED_BY_TRICOGNITA" | "CUSTOMER_STATED";

export interface RecordEvidenceRef {
  /** Empty when the evidence could not be located. */
  ref: string;
  integrity: RecordEvidenceIntegrity;
}

export interface RecordObservation {
  status: ControlStatus;
  notAssessedReason?: NotAssessedReason | "NOT_RECORDED";
  previousStatus?: ControlStatus;
  observedAt: string;
  trigger?: string;
  detail?: string;
  evidence: RecordEvidenceRef | null;
}

export interface RecordRemediation {
  id: string;
  kind: RecordRemediationKind;
  state: string;
  proposal: {
    change: string;
    scope: string;
    expectedResult: string;
    rollback: string;
    proposedBy: string;
    proposedAt: string;
  };
  approval: { approvedBy: string; approvedAt: string } | null;
  execution: {
    basis: ExecutionBasis;
    executor: string;
    method: string;
    executedAt?: string;
    recordedBy?: string;
    recordedAt?: string;
  } | null;
  verification: { status: ControlStatus; verifiedAt: string; evidence: RecordEvidenceRef | null } | null;
  outcome: RecordOutcome;
}

export interface RecordEntry {
  controlId: string;
  controlName: string;
  expectedState: string;
  resource: { id: string; label: string; type: string; identifierMasked: string };
  cloud: string;
  account: { label: string; idMasked: string };
  region: string;
  environment: { declared: boolean; label: string };
  original: RecordObservation;
  latest: RecordObservation;
  checks: RecordObservation[];
  subsequentChecks: number;
  driftEvents: { detectedAt: string; previousStatus: string; evidence: RecordEvidenceRef | null }[];
  remediations: RecordRemediation[];
}

export interface AssuranceRecord {
  schema: string;
  disclaimer: string;
  organisation: string;
  generatedAt: string;
  generatedBy: string;
  period: { from: string; to: string };
  scope: {
    accounts: { cloud: string; label: string; idMasked: string; regions: string[] }[];
    regions: string[];
    environment: { declared: boolean; label: string };
  };
  integrity: {
    status: RecordIntegrityStatus;
    recordsReferenced: number;
    recordsVerified: number;
    recordsFailed: number;
    recordsUnchecked: number;
    recordsMissing: number;
    chainLinksBroken: number;
    statement: string;
  };
  /** Counts of entries by latest state. Counts, never a score. */
  countsByLatestStatus: Partial<Record<ControlStatus, number>>;
  controlsNotAssessed: { controlId: string; controlName: string; reason: string }[];
  entries: RecordEntry[];
  truncated: boolean;
  /**
   * The document exactly as the server generated it, for export. The export
   * is this string, byte for byte: what the customer downloads is what the
   * screen was rendered from.
   */
  exportDocument: string;
}

export const RECORD_OUTCOME: Record<RecordOutcome, StatusPresentation> = {
  FIXED: {
    label: "Fixed",
    intent: "success",
    shape: "dot",
    meaning: "A Tricognita check after the change found the control passing on this resource.",
  },
  DID_NOT_FIX: {
    label: "Did not fix it",
    intent: "danger",
    shape: "square",
    meaning: "A Tricognita check after the change found the control still failing.",
  },
  NOT_VERIFIED: {
    label: "Not verified",
    intent: "warning",
    shape: "hollow",
    meaning: "No Tricognita check has confirmed this change. It is not shown as fixed.",
  },
  PENDING: {
    label: "Pending",
    intent: "neutral",
    shape: "hollow",
    meaning: "Proposed or approved, and not yet applied.",
  },
  FAILED: {
    label: "Change failed",
    intent: "danger",
    shape: "square",
    meaning: "The change could not be made.",
  },
  REJECTED: { label: "Rejected", intent: "neutral", shape: "dash", meaning: "The change was not approved." },
  EXPIRED: { label: "Expired", intent: "neutral", shape: "dash", meaning: "The approval lapsed before the change was made." },
};

export const EXECUTION_BASIS: Record<ExecutionBasis, string> = {
  RECORDED_BY_TRICOGNITA: "Recorded by Tricognita",
  CUSTOMER_STATED: "Customer-stated",
};

export const EXECUTION_METHOD: Record<string, string> = {
  TRICOGNITA_AUTOMATED_FIX: "Tricognita automated fix",
  CONSOLE: "Cloud console",
  CLI: "Command line",
  IAC: "Infrastructure as code",
  OTHER: "Other",
};

export const RECORD_INTEGRITY: Record<RecordIntegrityStatus, StatusPresentation> = {
  VERIFIED: {
    label: "Evidence integrity checked",
    intent: "success",
    shape: "dot",
    meaning: "Every evidence record referenced matched its hash and signature, and the chain was continuous.",
  },
  FAILED: {
    label: "Evidence integrity failed",
    intent: "danger",
    shape: "square",
    meaning: "At least one evidence record does not match what was written, or the chain is broken.",
  },
  UNCHECKED: {
    label: "Evidence not checked",
    intent: "warning",
    shape: "hollow",
    meaning: "Some evidence could not be checked. Unchecked evidence is not reported as sound.",
  },
  NO_EVIDENCE: {
    label: "No evidence yet",
    intent: "neutral",
    shape: "dash",
    meaning: "No evidence has been recorded for this organisation yet.",
  },
};

export const RECORD_EVIDENCE_INTEGRITY: Record<RecordEvidenceIntegrity, string> = {
  VERIFIED: "integrity checked",
  FAILED: "integrity FAILED",
  UNCHECKED: "not checked",
  MISSING: "evidence MISSING",
};
