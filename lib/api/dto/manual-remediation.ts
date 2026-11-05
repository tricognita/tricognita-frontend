/**
 * Backend shape for GET /api/remediation/manual. The resource is named by the
 * product's opaque id and label only; the execution is always the customer's
 * statement (basis CUSTOMER_STATED).
 */
export interface ManualRemediationDTO {
  id: string;
  controlId: string;
  resourceId: string;
  resourceLabel: string;
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
    basis: string;
    executor: string;
    method: string;
    executedAt?: string;
    recordedBy?: string;
    recordedAt?: string;
  } | null;
  verification: { status: string; verifiedAt: string } | null;
  outcome: string;
}
