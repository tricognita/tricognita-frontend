/**
 * DTO → domain for the Control Assurance Record.
 *
 * The defensive rules, each one the mirror of a truth rule on the server:
 *   - a control status the product does not know is NOT_ASSESSED, never PASS;
 *   - an outcome the product does not know is NOT_VERIFIED, never FIXED — and
 *     FIXED is only accepted when the remediation's own verification is PASS;
 *   - an integrity value the product does not know is UNCHECKED, never VERIFIED;
 *   - an execution basis the product does not know is CUSTOMER_STATED, never
 *     "recorded by Tricognita".
 * The screen may say less than the backend knows. It may never say more.
 */

import {
  CONTROL_STATUS,
  NOT_ASSESSED_REASON,
  RECORD_INTEGRITY,
  RECORD_OUTCOME,
  type AssuranceRecord,
  type ControlStatus,
  type ExecutionBasis,
  type NotAssessedReason,
  type RecordEvidenceIntegrity,
  type RecordEvidenceRef,
  type RecordIntegrityStatus,
  type RecordObservation,
  type RecordOutcome,
  type RecordRemediation,
} from "@/lib/domain";
import type {
  AssuranceRecordDTO,
  RecordEvidenceRefDTO,
  RecordObservationDTO,
  RecordRemediationDTO,
} from "../dto/assurance-record";

const EVIDENCE_INTEGRITIES: RecordEvidenceIntegrity[] = ["VERIFIED", "FAILED", "UNCHECKED", "MISSING"];

function toStatus(raw: string | undefined): ControlStatus {
  return raw && raw in CONTROL_STATUS ? (raw as ControlStatus) : "NOT_ASSESSED";
}

function toOptionalStatus(raw: string | undefined): ControlStatus | undefined {
  return raw && raw in CONTROL_STATUS ? (raw as ControlStatus) : undefined;
}

function toReason(raw: string | undefined): NotAssessedReason | "NOT_RECORDED" | undefined {
  if (!raw) return undefined;
  return raw in NOT_ASSESSED_REASON ? (raw as NotAssessedReason) : "NOT_RECORDED";
}

function toEvidenceRef(dto: RecordEvidenceRefDTO | null | undefined): RecordEvidenceRef | null {
  if (!dto) return null;
  const integrity = EVIDENCE_INTEGRITIES.includes(dto.integrity as RecordEvidenceIntegrity)
    ? (dto.integrity as RecordEvidenceIntegrity)
    : "UNCHECKED";
  return { ref: dto.ref ?? "", integrity };
}

function toObservation(dto: RecordObservationDTO): RecordObservation {
  const status = toStatus(dto.status);
  return {
    status,
    // A NOT_ASSESSED observation always says why, even when the backend did
    // not: "not recorded" is an answer; silence reads as "fine".
    notAssessedReason: status === "NOT_ASSESSED" ? (toReason(dto.notAssessedReason) ?? "NOT_RECORDED") : undefined,
    previousStatus: toOptionalStatus(dto.previousStatus),
    observedAt: dto.observedAt ?? "",
    trigger: dto.trigger || undefined,
    detail: dto.detail || undefined,
    evidence: toEvidenceRef(dto.evidence),
  };
}

function toOutcome(dto: RecordRemediationDTO): RecordOutcome {
  const raw = dto.outcome as RecordOutcome;
  if (raw === "FIXED") {
    // FIXED needs its proof in the same payload. Without a passing
    // verification it is downgraded, whatever the outcome field says.
    return dto.verification?.status === "PASS" ? "FIXED" : "NOT_VERIFIED";
  }
  return raw && raw in RECORD_OUTCOME ? raw : "NOT_VERIFIED";
}

function toRemediation(dto: RecordRemediationDTO): RecordRemediation {
  const basis: ExecutionBasis =
    dto.execution?.basis === "RECORDED_BY_TRICOGNITA" && dto.kind === "TRICOGNITA_AUTOMATED_FIX"
      ? "RECORDED_BY_TRICOGNITA"
      : "CUSTOMER_STATED";
  return {
    id: dto.id,
    kind: dto.kind === "TRICOGNITA_AUTOMATED_FIX" ? "TRICOGNITA_AUTOMATED_FIX" : "CUSTOMER_APPLIED",
    state: dto.state ?? "",
    proposal: {
      change: dto.proposal?.change ?? "",
      scope: dto.proposal?.scope ?? "",
      expectedResult: dto.proposal?.expectedResult ?? "",
      rollback: dto.proposal?.rollback ?? "",
      proposedBy: dto.proposal?.proposedBy ?? "",
      proposedAt: dto.proposal?.proposedAt ?? "",
    },
    approval: dto.approval ? { approvedBy: dto.approval.approvedBy, approvedAt: dto.approval.approvedAt } : null,
    execution: dto.execution
      ? {
          basis,
          executor: dto.execution.executor ?? "",
          method: dto.execution.method ?? "",
          executedAt: dto.execution.executedAt || undefined,
          recordedBy: dto.execution.recordedBy || undefined,
          recordedAt: dto.execution.recordedAt || undefined,
        }
      : null,
    verification: dto.verification
      ? {
          status: toStatus(dto.verification.status),
          verifiedAt: dto.verification.verifiedAt ?? "",
          evidence: toEvidenceRef(dto.verification.evidence),
        }
      : null,
    outcome: toOutcome(dto),
  };
}

export function toAssuranceRecord(dto: AssuranceRecordDTO): AssuranceRecord {
  const integrityStatus: RecordIntegrityStatus =
    dto.integrity?.status && dto.integrity.status in RECORD_INTEGRITY
      ? (dto.integrity.status as RecordIntegrityStatus)
      : "UNCHECKED";

  const counts: Partial<Record<ControlStatus, number>> = {};
  for (const [status, n] of Object.entries(dto.counts?.byLatestStatus ?? {})) {
    const s = toStatus(status);
    counts[s] = (counts[s] ?? 0) + n;
  }

  return {
    schema: dto.schema ?? "",
    disclaimer: dto.disclaimer ?? "",
    organisation: dto.organisation ?? "",
    generatedAt: dto.generatedAt ?? "",
    generatedBy: dto.generatedBy ?? "",
    period: { from: dto.period?.from ?? "", to: dto.period?.to ?? "" },
    scope: {
      accounts: dto.scope?.accounts ?? [],
      regions: dto.scope?.regions ?? [],
      environment: dto.scope?.environment ?? { declared: false, label: "Not declared by the customer" },
    },
    integrity: {
      status: integrityStatus,
      recordsReferenced: dto.integrity?.recordsReferenced ?? 0,
      recordsVerified: dto.integrity?.recordsVerified ?? 0,
      recordsFailed: dto.integrity?.recordsFailed ?? 0,
      recordsUnchecked: dto.integrity?.recordsUnchecked ?? 0,
      recordsMissing: dto.integrity?.recordsMissing ?? 0,
      chainLinksBroken: dto.integrity?.chainLinksBroken ?? 0,
      statement: dto.integrity?.statement ?? "",
    },
    countsByLatestStatus: counts,
    controlsNotAssessed: dto.controlsNotAssessed ?? [],
    entries: (dto.entries ?? []).map((e) => ({
      controlId: e.controlId,
      controlName: e.controlName || e.controlId,
      expectedState: e.expectedState ?? "",
      resource: e.resource,
      cloud: e.cloud || "Not recorded",
      account: e.account ?? { label: "", idMasked: "" },
      region: e.region ?? "",
      environment: e.environment ?? { declared: false, label: "Not declared by the customer" },
      original: toObservation(e.original),
      latest: toObservation(e.latest),
      checks: (e.checks ?? []).map(toObservation),
      subsequentChecks: e.subsequentChecks ?? 0,
      driftEvents: (e.driftEvents ?? []).map((d) => ({
        detectedAt: d.detectedAt,
        previousStatus: d.previousStatus,
        evidence: toEvidenceRef(d.evidence),
      })),
      remediations: (e.remediations ?? []).map(toRemediation),
    })),
    truncated: Boolean(dto.truncated),
    exportDocument: JSON.stringify(dto, null, 2),
  };
}
