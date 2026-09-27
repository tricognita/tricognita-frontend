import { apiGet, apiPost } from "@/lib/api/client";
import type { RemediationActionDTO, RemediationDTO } from "@/lib/api/dto/remediation";
import {
  toRemediation,
  toRemediationOffer,
  type RemediationOffer,
} from "@/lib/api/adapters/remediation";
import type { Remediation } from "@/lib/domain";

/**
 * The bounded remediation API, as the product sees it.
 *
 * Every function names an operation the backend already implements. There is no
 * generic mutation here and nothing that lets a caller describe a cloud change:
 * a request names a control, a resource and an allow-listed action, and the
 * backend resolves the account, region and target from the tenant's own
 * assessment records.
 */

export async function fetchRemediations(): Promise<Remediation[]> {
  const body = await apiGet<{ remediations: RemediationDTO[] }>("/api/remediation", "remediations");
  return (body.remediations ?? []).map(toRemediation);
}

export async function fetchRemediationOffers(controlId?: string): Promise<RemediationOffer[]> {
  const qs = controlId ? `?control=${encodeURIComponent(controlId)}` : "";
  const body = await apiGet<{ actions: RemediationActionDTO[] }>(
    `/api/remediation/actions${qs}`,
    "remediation actions",
  );
  return (body.actions ?? []).map(toRemediationOffer);
}

export interface RemediationRequestInput {
  controlId: string;
  resourceUrn: string;
  action: string;
  params?: Record<string, string>;
}

export async function requestRemediation(input: RemediationRequestInput): Promise<{ id: string }> {
  return apiPost<{ id: string }>("/api/remediation", "request a fix", input);
}

export async function approveRemediation(id: string): Promise<{ id: string; state: string }> {
  return apiPost(`/api/remediation/${encodeURIComponent(id)}/approve`, "approve a fix");
}

export async function rejectRemediation(id: string, reason: string): Promise<{ id: string; state: string }> {
  return apiPost(`/api/remediation/${encodeURIComponent(id)}/reject`, "reject a fix", { reason });
}

export async function executeRemediation(id: string): Promise<Remediation> {
  const dto = await apiPost<RemediationDTO>(
    `/api/remediation/${encodeURIComponent(id)}/execute`,
    "apply a fix",
  );
  return toRemediation(dto);
}
