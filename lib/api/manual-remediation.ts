import { apiGet, apiPost } from "@/lib/api/client";
import type { ManualRemediation } from "@/lib/domain";
import type { ManualRemediationDTO } from "./dto/manual-remediation";
import { toManualRemediation } from "./adapters/manual-remediation";
import type { AppliedMethod } from "@/lib/manual-remediation-policy";

/**
 * Changes the customer applies themselves — the existing backend lifecycle,
 * through the BFF. Nothing here names a tenant, account, region or resource
 * identifier: a proposal names a control and the product's opaque resource id,
 * and the backend resolves the rest from the tenant's own assessment.
 */

export async function fetchManualRemediations(controlId?: string): Promise<ManualRemediation[]> {
  const qs = controlId ? `?control=${encodeURIComponent(controlId)}` : "";
  const body = await apiGet<{ remediations: ManualRemediationDTO[] }>(
    `/api/remediation/manual${qs}`,
    "fixes you applied",
  );
  return (body.remediations ?? []).map(toManualRemediation);
}

export interface ManualProposalInput {
  controlId: string;
  resourceId: string;
  proposedChange: string;
  expectedResult?: string;
  rollback?: string;
}

export async function proposeManualRemediation(input: ManualProposalInput): Promise<{ id: string }> {
  return apiPost<{ id: string }>("/api/remediation/manual", "propose a fix", input);
}

export async function approveManualRemediation(id: string): Promise<void> {
  await apiPost(`/api/remediation/manual/${encodeURIComponent(id)}/approve`, "approve this fix");
}

export interface ManualAppliedInput {
  appliedBy: string;
  method: AppliedMethod;
  /** RFC 3339. The customer's own statement of when the change was made. */
  appliedAt: string;
}

export async function recordManualApplied(id: string, input: ManualAppliedInput): Promise<void> {
  await apiPost(`/api/remediation/manual/${encodeURIComponent(id)}/applied`, "record the change", input);
}

export interface ManualVerifyResult {
  verificationStatus: string;
  outcome: string;
}

export async function verifyManualRemediation(id: string): Promise<ManualVerifyResult> {
  return apiPost<ManualVerifyResult>(`/api/remediation/manual/${encodeURIComponent(id)}/verify`, "verify this fix");
}
