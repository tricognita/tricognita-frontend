import type { Remediation, RemediationState, RemediationVerdict } from "@/lib/domain";
import type { RemediationActionDTO, RemediationDTO } from "@/lib/api/dto/remediation";

/**
 * Backend state → product state.
 *
 * SUCCEEDED becomes APPLIED, never COMPLETED. The backend is explicit that
 * SUCCEEDED means the provider accepted the call and not that the control
 * passes; mapping it to COMPLETED would put that conflation back the moment the
 * data crossed into the UI. Completion is a verdict, so this adapter never
 * emits COMPLETED at all.
 */
const STATE: Record<string, RemediationState> = {
  REQUESTED: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  EXECUTING: "EXECUTING",
  SUCCEEDED: "APPLIED",
  FAILED: "FAILED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
};

const VERDICT: Record<string, RemediationVerdict> = {
  PENDING: "PENDING",
  REMEDIATED: "REMEDIATED",
  NOT_EFFECTIVE: "NOT_EFFECTIVE",
  UNVERIFIED: "UNVERIFIED",
  FAILED: "FAILED",
  REJECTED: "REJECTED",
};

function toState(raw: string | undefined): RemediationState {
  // An unrecognised state is not optimistically treated as progress.
  return (raw && STATE[raw]) || "NOT_STARTED";
}

function toVerdict(raw: string | undefined): RemediationVerdict {
  // An unrecognised verdict is never REMEDIATED: the one claim that must be
  // earned is the one a default may not grant.
  return (raw && VERDICT[raw]) || "UNVERIFIED";
}

export function toRemediation(dto: RemediationDTO): Remediation {
  return {
    id: dto.id,
    controlId: dto.controlId,
    action: dto.action || undefined,
    resourceIds: [],
    state: toState(dto.state),
    verdict: toVerdict(dto.outcome),
    method: "AUTOMATED",
    requestedBy: dto.requestedBy,
    requestedAt: dto.requestedAt,
    approvedBy: dto.approvedBy || undefined,
    approvedAt: dto.approvedAt || undefined,
    executedAt: dto.executedAt || undefined,
    completedAt: dto.finishedAt || undefined,
    summary: dto.summary ?? "",
    verificationRunId: dto.verificationRunId || undefined,
  };
}

export interface RemediationOffer {
  action: string;
  controlId: string;
  summary: string;
  rollback: string;
  requiredParams: string[];
  /** Validated by the platform, so an administrator may switch it on or off for the organisation. */
  available: boolean;
  enabled: boolean;
  /** Why it is unavailable. Present exactly when enabled is false. */
  reason?: string;
}

export function toRemediationOffer(dto: RemediationActionDTO): RemediationOffer {
  return {
    action: dto.action,
    controlId: dto.controlId,
    summary: dto.summary ?? "",
    rollback: dto.rollback ?? "",
    requiredParams: dto.requiredParams ?? [],
    available: Boolean(dto.available) || Boolean(dto.enabled),
    enabled: Boolean(dto.enabled),
    reason: dto.reason || undefined,
  };
}
