/**
 * DTO → domain for customer-applied changes. Same rules as the record adapter:
 * FIXED only with a passing verification in the same payload, an unknown state
 * is treated as the earliest step (never as done), and an unknown verification
 * status is NOT_ASSESSED.
 */

import {
  CONTROL_STATUS,
  RECORD_OUTCOME,
  type ControlStatus,
  type ManualRemediation,
  type ManualRemediationState,
  type RecordOutcome,
} from "@/lib/domain";
import type { ManualRemediationDTO } from "../dto/manual-remediation";
import { APPLIED_METHODS } from "@/lib/manual-remediation-policy";

const STATES: ManualRemediationState[] = ["PROPOSED", "APPROVED", "APPLIED"];

export function toManualRemediation(dto: ManualRemediationDTO): ManualRemediation {
  const state = STATES.includes(dto.state as ManualRemediationState) ? (dto.state as ManualRemediationState) : "PROPOSED";
  const verification = dto.verification
    ? {
        status: (dto.verification.status in CONTROL_STATUS ? dto.verification.status : "NOT_ASSESSED") as ControlStatus,
        verifiedAt: dto.verification.verifiedAt ?? "",
      }
    : null;

  let outcome: RecordOutcome = dto.outcome in RECORD_OUTCOME ? (dto.outcome as RecordOutcome) : "NOT_VERIFIED";
  if (outcome === "FIXED" && verification?.status !== "PASS") outcome = "NOT_VERIFIED";

  return {
    id: dto.id,
    controlId: dto.controlId,
    resourceId: dto.resourceId,
    resourceLabel: dto.resourceLabel || dto.resourceId,
    state,
    proposal: {
      change: dto.proposal?.change ?? "",
      scope: dto.proposal?.scope ?? "",
      expectedResult: dto.proposal?.expectedResult ?? "",
      rollback: dto.proposal?.rollback ?? "",
      proposedBy: dto.proposal?.proposedBy ?? "",
      proposedAt: dto.proposal?.proposedAt ?? "",
    },
    approval: dto.approval ?? null,
    // Whatever the payload says about the basis, a change recorded through
    // this flow is the customer's statement.
    statement: dto.execution
      ? {
          appliedBy: dto.execution.executor ?? "",
          // Only the customer's own methods. Anything else (including a
          // Tricognita method) is shown as "Other", never as ours.
          method: (APPLIED_METHODS as readonly string[]).includes(dto.execution.method) ? dto.execution.method : "OTHER",
          appliedAt: dto.execution.executedAt || undefined,
          recordedBy: dto.execution.recordedBy ?? "",
          recordedAt: dto.execution.recordedAt ?? "",
        }
      : null,
    verification,
    outcome,
  };
}
