import type { RemediationOffer } from "@/lib/api/adapters/remediation";
import type { RemediationRequestInput } from "@/lib/api/remediation";
import type { VerifyNowResult } from "@/lib/api/controls";
import type { ManualAppliedInput, ManualProposalInput, ManualVerifyResult } from "@/lib/api/manual-remediation";
import type { AuditPage } from "@/lib/api/audit";
import type {
  AlertRoute,
  AssuranceRecord,
  ManualRemediation,
  CloudAccount,
  Control,
  ControlResult,
  DriftEvent,
  Evidence,
  Exception,
  Finding,
  Remediation,
  Organisation,
  Report,
  Resource,
  User,
  VerificationRun,
} from "@/lib/domain";

/**
 * DataSource — the contract both the fixture source and the API client satisfy.
 *
 * Pages never see this interface: they use the hooks in lib/data/hooks.ts. It
 * exists so the two implementations cannot drift, and so switching a capability
 * from fixtures to the real API is a one-line change in source.ts.
 *
 * Every method returns domain types. Backend shapes stop at the adapter.
 */
export interface DataSource {
  readonly kind: "fixtures" | "api";

  getControls(): Promise<Control[]>;
  getControl(controlId: string): Promise<Control | null>;
  getControlResults(controlId: string): Promise<ControlResult[]>;
  /** Every recorded result for one control, across runs — the control's history. */
  getControlHistory(controlId: string): Promise<ControlResult[]>;

  getFindings(): Promise<Finding[]>;
  getFinding(findingId: string): Promise<Finding | null>;

  getResources(): Promise<Resource[]>;

  getVerificationRuns(): Promise<VerificationRun[]>;
  getDriftEvents(): Promise<DriftEvent[]>;
  getExceptions(): Promise<Exception[]>;
  getRemediations(): Promise<Remediation[]>;
  /** The fixes the product could offer for a control, with their availability. */
  getRemediationOffers(controlId?: string): Promise<RemediationOffer[]>;

  // ── mutations ─────────────────────────────────────────────────────────────
  // Deliberately on the DataSource rather than called from a component, so the
  // fixture source can refuse them out loud. A fixture cannot change a
  // customer's cloud, and one that pretended to would be worse than one that
  // admits it cannot.
  requestRemediation(input: RemediationRequestInput): Promise<{ id: string }>;
  approveRemediation(id: string): Promise<void>;
  rejectRemediation(id: string, reason: string): Promise<void>;
  executeRemediation(id: string): Promise<Remediation>;
  /** On-demand re-check of one resource against one control ("Verify now"). */
  verifyControl(controlId: string, resourceId: string): Promise<VerifyNowResult>;

  // Changes the customer applies themselves (proposal → approval → customer
  // statement → Tricognita's check). Same refusal rule for fixtures.
  getManualRemediations(controlId?: string): Promise<ManualRemediation[]>;
  proposeManualRemediation(input: ManualProposalInput): Promise<{ id: string }>;
  approveManualRemediation(id: string): Promise<void>;
  recordManualApplied(id: string, input: ManualAppliedInput): Promise<void>;
  verifyManualRemediation(id: string): Promise<ManualVerifyResult>;
  getEvidence(): Promise<Evidence[]>;
  /** The organisation's audit trail, newest first. `before` pages to older events. */
  getAuditEvents(filters?: import("@/lib/api/audit").AuditFilters, before?: number): Promise<AuditPage>;
  /** The Control Assurance Record, generated from persisted product data. */
  getAssuranceRecord(): Promise<AssuranceRecord>;
  getReports(): Promise<Report[]>;

  getCloudAccounts(): Promise<CloudAccount[]>;
  getAlertRoutes(): Promise<AlertRoute[]>;
  getUsers(): Promise<User[]>;

  /** The customer's own organisation record. Settings reads it; nothing writes it. */
  getOrganisation(): Promise<Organisation>;
}

/** Thrown by the API source for capabilities the backend does not serve yet. */
export class NotImplementedError extends Error {
  readonly capability: string;
  constructor(capability: string) {
    super(`Not available yet: ${capability}`);
    this.name = "NotImplementedError";
    this.capability = capability;
  }
}

export function isNotImplemented(err: unknown): err is NotImplementedError {
  return err instanceof Error && err.name === "NotImplementedError";
}
