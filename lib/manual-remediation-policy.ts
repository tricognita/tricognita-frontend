/**
 * The BFF's rules for recording a change the customer applies themselves.
 *
 * Kept out of the route files so they can be tested without a Next runtime.
 * The backend is the authority for everything here (it resolves the account,
 * region and resource from the tenant's own assessment and enforces its own
 * scope); these rules make sure the browser can never send it more than the
 * step needs, and that a role is refused before the backend is touched.
 */

import type { Capability } from "@/lib/rbac";

export type ManualStep = "propose" | "approve" | "applied" | "verify";

/**
 * Same boundary as the automated flow: whoever may request a fix may propose
 * one and record that they applied it; only an approver may approve; the
 * check itself is "Verify now"'s capability.
 */
export const MANUAL_STEP_CAPABILITY: Record<ManualStep, Capability> = {
  propose: "requestRemediation",
  approve: "approveRemediation",
  applied: "requestRemediation",
  verify: "runVerification",
};

/** The path verbs the BFF will forward. Anything else is not a step. */
export function manualStepFromVerb(verb: string): Exclude<ManualStep, "propose"> | null {
  return verb === "approve" || verb === "applied" || verb === "verify" ? verb : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A remediation id is a UUID the backend issued. Nothing else is forwarded. */
export function isRemediationId(id: string): boolean {
  return UUID.test(id);
}

/** Customer-stated ways a change was made. Mirrors the backend's list. */
export const APPLIED_METHODS = ["CONSOLE", "CLI", "IAC", "OTHER"] as const;
export type AppliedMethod = (typeof APPLIED_METHODS)[number];

const ALLOWED_FIELDS: Record<ManualStep, readonly string[]> = {
  // No tenant, account, region, URN or proposer: the backend resolves the
  // target from the opaque resource id and takes the proposer from the token.
  propose: ["controlId", "resourceId", "proposedChange", "expectedResult", "rollback"],
  // The approver is the authenticated user. Nothing in the body is used.
  approve: [],
  applied: ["appliedBy", "method", "appliedAt"],
  verify: [],
};

/**
 * The body the BFF forwards for a step: only the step's own string fields,
 * everything else dropped. Returns null when the input is not a JSON object.
 */
export function manualRequestBody(step: ManualStep, raw: unknown): Record<string, string> | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return ALLOWED_FIELDS[step].length === 0 ? {} : null;
  }
  const out: Record<string, string> = {};
  for (const key of ALLOWED_FIELDS[step]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string") out[key] = v;
  }
  return out;
}
