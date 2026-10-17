/**
 * Wire shapes for the bounded remediation API.
 *
 * These mirror the Go DTOs exactly and carry nothing the backend refuses to
 * send: no credential, no approval token, no role ARN, no provider object, no
 * database identifier beyond the request's own id.
 */

export interface RemediationActionDTO {
  action: string;
  controlId: string;
  summary: string;
  rollback: string;
  requiredParams?: string[];
  /** The platform has validated the action. Present on the wire; false means nobody can switch it on yet. */
  available?: boolean;
  enabled: boolean;
  reason?: string;
}

export interface RemediationDTO {
  id: string;
  controlId: string;
  action: string;
  summary: string;
  /** REQUESTED | APPROVED | EXECUTING | SUCCEEDED | FAILED | REJECTED | EXPIRED */
  state: string;
  /** PENDING | REMEDIATED | NOT_EFFECTIVE | UNVERIFIED | FAILED | REJECTED */
  outcome: string;
  verificationRunId?: string;
  verificationStatus?: string;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  executedAt?: string;
  finishedAt?: string;
  failureReason?: string;
}
