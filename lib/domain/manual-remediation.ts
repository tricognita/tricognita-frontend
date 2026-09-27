/**
 * A change the customer applies themselves, as the workflow drives it.
 *
 * PROPOSED → APPROVED → APPLIED (customer-stated) → verified by Tricognita.
 * Neither approval nor the customer's "applied" statement means the control is
 * fixed: only `outcome === "FIXED"` does, and only a passing Tricognita check
 * produces it.
 */

import type { ControlStatus } from "./status";
import type { RecordOutcome } from "./assurance-record";

export type ManualRemediationState = "PROPOSED" | "APPROVED" | "APPLIED";

export interface ManualRemediation {
  id: string;
  controlId: string;
  resourceId: string;
  resourceLabel: string;
  state: ManualRemediationState;
  proposal: {
    change: string;
    scope: string;
    expectedResult: string;
    rollback: string;
    proposedBy: string;
    proposedAt: string;
  };
  approval: { approvedBy: string; approvedAt: string } | null;
  /** Always the customer's statement — Tricognita did not observe the change. */
  statement: {
    appliedBy: string;
    method: string;
    appliedAt?: string;
    recordedBy: string;
    recordedAt: string;
  } | null;
  verification: { status: ControlStatus; verifiedAt: string } | null;
  outcome: RecordOutcome;
}

/** The next step the lifecycle allows, or null when it is finished. */
export type ManualNextStep = "approve" | "applied" | "verify" | null;

export function manualNextStep(r: ManualRemediation): ManualNextStep {
  if (r.state === "PROPOSED") return "approve";
  if (r.state === "APPROVED") return "applied";
  // A check that could not see the resource may be re-run; any other verdict
  // is final — a retry is a new proposal.
  if (!r.verification || r.verification.status === "NOT_ASSESSED") return "verify";
  return null;
}

/** Still open: not yet given a final verdict by a Tricognita check. */
export function isManualRemediationOpen(r: ManualRemediation): boolean {
  return manualNextStep(r) !== null;
}
