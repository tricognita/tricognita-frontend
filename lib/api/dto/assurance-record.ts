/**
 * Backend shape for the Control Assurance Record (GET /api/evidence/record).
 *
 * The Go handler builds this entirely from persisted product data. It carries
 * no provider-native identifier (no ARN, no full account number), no hash, no
 * signature and no database internals beyond the ids a customer needs to act
 * on a remediation again.
 *
 * Fields are optional-tolerant for the same reason as the other DTOs: a field
 * the backend stops sending becomes a missing value the adapter handles.
 */

export interface RecordEvidenceRefDTO {
  ref: string;
  /** VERIFIED | FAILED | UNCHECKED | MISSING */
  integrity: string;
}

export interface RecordObservationDTO {
  status: string;
  notAssessedReason?: string;
  previousStatus?: string;
  observedAt: string;
  trigger?: string;
  detail?: string;
  evidence: RecordEvidenceRefDTO | null;
}

export interface RecordDriftEventDTO {
  detectedAt: string;
  previousStatus: string;
  evidence: RecordEvidenceRefDTO | null;
}

export interface RecordRemediationDTO {
  id: string;
  /** TRICOGNITA_AUTOMATED_FIX | CUSTOMER_APPLIED */
  kind: string;
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
    /** RECORDED_BY_TRICOGNITA | CUSTOMER_STATED */
    basis: string;
    executor: string;
    method: string;
    executedAt?: string;
    recordedBy?: string;
    recordedAt?: string;
  } | null;
  verification: { status: string; verifiedAt: string; evidence: RecordEvidenceRefDTO | null } | null;
  /** FIXED | DID_NOT_FIX | NOT_VERIFIED | PENDING | FAILED | REJECTED | EXPIRED */
  outcome: string;
}

export interface RecordEntryDTO {
  controlId: string;
  controlName: string;
  expectedState: string;
  resource: { id: string; label: string; type: string; identifierMasked: string };
  cloud: string;
  account: { label: string; idMasked: string };
  region: string;
  environment: { declared: boolean; label: string };
  original: RecordObservationDTO;
  latest: RecordObservationDTO;
  checks: RecordObservationDTO[];
  subsequentChecks: number;
  driftEvents: RecordDriftEventDTO[];
  remediations: RecordRemediationDTO[];
}

export interface AssuranceRecordDTO {
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
    /** VERIFIED | FAILED | UNCHECKED | NO_EVIDENCE */
    status: string;
    recordsReferenced: number;
    recordsVerified: number;
    recordsFailed: number;
    recordsUnchecked: number;
    recordsMissing: number;
    chainLinksBroken: number;
    statement: string;
  };
  counts: { entries: number; byLatestStatus: Record<string, number> };
  controlsNotAssessed: { controlId: string; controlName: string; reason: string }[];
  entries: RecordEntryDTO[];
  truncated: boolean;
}
