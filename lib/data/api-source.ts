import {
  fetchRemediations,
  fetchRemediationOffers,
  requestRemediation as requestRemediationApi,
  approveRemediation as approveRemediationApi,
  rejectRemediation as rejectRemediationApi,
  executeRemediation as executeRemediationApi,
} from "@/lib/api/remediation";
import type { DataSource } from "./types";
import { NotImplementedError } from "./types";
import {
  fetchControl,
  fetchControlHistory,
  fetchControlResults,
  fetchControls,
  fetchResources,
  verifyControl,
} from "@/lib/api/controls";
import { fetchVerificationRuns } from "@/lib/api/assurance";
import { fetchFinding, fetchFindings } from "@/lib/api/findings";
import { fetchCloudAccounts } from "@/lib/api/accounts";
import { fetchEvidence } from "@/lib/api/evidence";
import { fetchAuditEvents } from "@/lib/api/audit";
import { fetchAssuranceRecord } from "@/lib/api/assurance-record";
import {
  approveManualRemediation,
  fetchManualRemediations,
  proposeManualRemediation,
  recordManualApplied,
  verifyManualRemediation,
} from "@/lib/api/manual-remediation";

/**
 * API data source.
 *
 * Each method is wired the moment the backend can answer it truthfully, and not
 * before. The ones still calling pending() are not oversights — they are
 * capabilities the backend does not have, and the product says so rather than
 * inventing an answer.
 *
 * WIRED (Phase 4D), reading real AWS assessment data:
 *   controls, control results, control history, resources,
 *   verification runs, cloud accounts
 *
 * WIRED (Phase 4E):
 *   evidence      the control evaluator now seals a signed, hash-chained record
 *                 of every control verdict, so the chain can name the control
 *                 and run a record is about. Integrity is re-checked per record
 *                 on read, not assumed.
 *
 * NOT WIRED, and why:
 *   findings      still blocked, and Phase 4E did not unblock it. The backend's
 *                 findings are CSPM-shaped: findings.control_id exists
 *                 (migration 017) but is nullable and deliberately unbackfilled
 *                 because no deterministic finding→control mapping exists; the
 *                 status vocabulary is three states against the product's five;
 *                 and each row carries a risk score and a SHAP vector the
 *                 product does not have a place for. Evidence did not create
 *                 that mapping either — a control verdict names the resources
 *                 behind it by digest, not the findings. Connecting Findings
 *                 would mean inventing the join, so it stays unavailable.
 *   drift         no detection exists. The store can record DRIFTED when a PASS
 *                 becomes a FAIL, but nothing yet reads that back as an event.
 *   exceptions    no table, no endpoint.
 *   reports       no table, no endpoint.
 *   alert routes  endpoint exists, not yet adapted.
 *   users         endpoint exists, not yet adapted.
 *   organisation  no endpoint.
 *
 * The rule this file exists to enforce: production NEVER silently falls back to
 * fixtures. A missing capability is visible, not invented — hooks turn
 * NotImplementedError into "Not available yet", which is a different thing on
 * screen from "nothing found" and from "this broke".
 */

function pending(capability: string): never {
  throw new NotImplementedError(capability);
}

export const apiSource: DataSource = {
  kind: "api",

  getControls: fetchControls,
  getControl: fetchControl,
  getControlResults: fetchControlResults,
  getControlHistory: fetchControlHistory,

  getFindings: fetchFindings,
  getFinding: fetchFinding,

  getResources: fetchResources,

  getVerificationRuns: fetchVerificationRuns,
  getDriftEvents: () => pending("drift detection"),
  getExceptions: () => pending("exceptions"),
  // WIRED — bounded remediation. The executor is the narrow one; a request
  // names a control, a resource and an allow-listed action, and the backend
  // resolves everything it will act on from this tenant's own assessment
  // records.
  getRemediations: fetchRemediations,
  getRemediationOffers: fetchRemediationOffers,
  requestRemediation: requestRemediationApi,
  approveRemediation: async (id: string) => {
    await approveRemediationApi(id);
  },
  rejectRemediation: async (id: string, reason: string) => {
    await rejectRemediationApi(id, reason);
  },
  executeRemediation: executeRemediationApi,
  verifyControl: verifyControl,
  getEvidence: fetchEvidence,
  getAuditEvents: fetchAuditEvents,
  getAssuranceRecord: fetchAssuranceRecord,
  getManualRemediations: fetchManualRemediations,
  proposeManualRemediation,
  approveManualRemediation,
  recordManualApplied,
  verifyManualRemediation,
  getReports: () => pending("reports"),

  getCloudAccounts: fetchCloudAccounts,
  getAlertRoutes: () => pending("alert routes"),
  getUsers: () => pending("users"),
  getOrganisation: () => pending("organisation settings"),
};
