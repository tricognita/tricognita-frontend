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

/** What a refusal to switch a fix on or off means, in the words the administrator needs. */
export function fixSwitchProblem(status: number, error: string | undefined): string {
  if (status === 403 && error === "mfa_required") {
    return "Switching a fix on or off needs a sign-in that used your authenticator code. Sign out, sign in again with the code, and retry.";
  }
  if (status === 403) return "Only an administrator of your organisation can switch a fix on or off.";
  if (status === 409) return "This fix has not been validated for use yet, so it cannot be switched on.";
  if (status === 404) return "That fix does not exist.";
  return `The change was not made (${error ?? status}). Nothing was switched.`;
}

/** Switch one automated fix on or off for the signed-in administrator's organisation. Throws with a plain reason. */
export async function setFixEnabled(action: string, enabled: boolean): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/remediation/actions/${encodeURIComponent(action)}`, {
      method: enabled ? "PUT" : "DELETE",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("The request could not be sent, so nothing was switched.");
  }
  if (!res.ok) {
    let error: string | undefined;
    try {
      error = ((await res.json()) as { error?: string }).error;
    } catch {
      // a non-JSON refusal is still a refusal
    }
    throw new Error(fixSwitchProblem(res.status, error));
  }
  const b = (await res.json().catch(() => null)) as { enabled?: boolean } | null;
  if (b?.enabled !== enabled) throw new Error("The change was not confirmed, so the current state is unknown. Reload to see it.");
}
