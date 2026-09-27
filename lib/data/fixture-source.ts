import { NotImplementedError, type DataSource } from "./types";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_ALERT_ROUTES,
  FIXTURE_CONTROLS,
  FIXTURE_DRIFT,
  FIXTURE_EVIDENCE,
  FIXTURE_EXCEPTIONS,
  FIXTURE_FINDINGS,
  FIXTURE_ORG,
  FIXTURE_REMEDIATIONS,
  FIXTURE_REPORTS,
  FIXTURE_RESOURCES,
  FIXTURE_RESULTS,
  FIXTURE_RUNS,
  FIXTURE_USERS,
  LATEST_RUN_ID,
} from "@/lib/fixtures";

/**
 * Fixture data source — development only.
 *
 * A fixed delay keeps loading states honest during development: if a screen
 * looks wrong for 120ms, it will look wrong for 800ms against the real API.
 */

const DELAY_MS = 120;

function resolve<T>(value: T): Promise<T> {
  return new Promise((r) => setTimeout(() => r(value), DELAY_MS));
}

export const fixtureSource: DataSource = {
  kind: "fixtures",

  getControls: () => resolve(FIXTURE_CONTROLS),
  getControl: (id) => resolve(FIXTURE_CONTROLS.find((c) => c.id === id) ?? null),
  getControlResults: (id) =>
    resolve(FIXTURE_RESULTS.filter((r) => r.controlId === id && r.runId === LATEST_RUN_ID)),
  getControlHistory: (id) => resolve(FIXTURE_RESULTS.filter((r) => r.controlId === id)),

  getFindings: () => resolve(FIXTURE_FINDINGS),
  getFinding: (id) => resolve(FIXTURE_FINDINGS.find((f) => f.id === id) ?? null),

  getResources: () => resolve(FIXTURE_RESOURCES),

  getVerificationRuns: () => resolve(FIXTURE_RUNS),
  getDriftEvents: () => resolve(FIXTURE_DRIFT),
  getExceptions: () => resolve(FIXTURE_EXCEPTIONS),
  getRemediations: () => resolve(FIXTURE_REMEDIATIONS),
  // Offers and mutations have no fixture form. A fixture can show what a fix
  // WOULD look like; it cannot tell you whether one is switched on for your
  // account, and it certainly cannot apply one. Saying so is the honest answer.
  getRemediationOffers: () => Promise.reject(new NotImplementedError("remediation actions")),
  requestRemediation: () => Promise.reject(new NotImplementedError("requesting a fix")),
  approveRemediation: () => Promise.reject(new NotImplementedError("approving a fix")),
  rejectRemediation: () => Promise.reject(new NotImplementedError("rejecting a fix")),
  executeRemediation: () => Promise.reject(new NotImplementedError("applying a fix")),
  verifyControl: () => Promise.reject(new NotImplementedError("verifying a control")),
  getManualRemediations: () => Promise.reject(new NotImplementedError("fixes you applied")),
  proposeManualRemediation: () => Promise.reject(new NotImplementedError("proposing a fix")),
  approveManualRemediation: () => Promise.reject(new NotImplementedError("approving a fix")),
  recordManualApplied: () => Promise.reject(new NotImplementedError("recording a change")),
  verifyManualRemediation: () => Promise.reject(new NotImplementedError("verifying a fix")),
  getEvidence: () => resolve(FIXTURE_EVIDENCE),
  // The record is proof. A fixture version would be a fabricated record of
  // checks that never ran, so fixtures say it is not available instead.
  getAssuranceRecord: () => Promise.reject(new NotImplementedError("assurance record")),
  getReports: () => resolve(FIXTURE_REPORTS),

  getCloudAccounts: () => resolve(FIXTURE_ACCOUNTS),
  getAlertRoutes: () => resolve(FIXTURE_ALERT_ROUTES),
  getUsers: () => resolve(FIXTURE_USERS),
  getOrganisation: () => resolve(FIXTURE_ORG),
};
