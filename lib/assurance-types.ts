// Detection Assurance report DTOs — mirror the Go JSON contracts in
// api/assurance/graph/reader (report shapes) and api/assurance/api (verify).
// Keep in sync with the backend; these back the G3 customer report surfaces.

export type ControlStatus = "SATISFIED" | "FAILING" | "UNKNOWN";

export interface ControlPosture {
  control: string;
  status: ControlStatus;
  passing_results: number;
  failing_results: number;
  concepts: string[];
  last_evaluated_at?: string;
  latest_evidence_ids?: string[];
}

export interface ControlPostureReport {
  tenant_id: string;
  framework?: string;
  summary: { controls: number; satisfied: number; failing: number; unknown: number };
  controls: ControlPosture[];
}

export type CoverageStatus = "COVERED" | "GAP" | "UNASSESSED";

export interface ConceptCoverage {
  concept: string;
  title: string;
  severity: string;
  status: CoverageStatus;
  controls: string[];
  last_evaluated_at?: string;
}

export interface CoverageReport {
  tenant_id: string;
  summary: { concepts_total: number; covered: number; gaps: number; unassessed: number };
  concepts: ConceptCoverage[];
}

export interface Verdict {
  assurance_result_id: string;
  contract_id: string;
  concept?: string;
  passed: boolean;
  evaluated_at?: string;
  evidence_id: string;
  controls?: string[];
}

export interface LedgerPage {
  count: number;
  next_cursor?: string;
  verdicts: Verdict[];
}

// Returned by GET /api/assurance/verify/:id — backs the EvidenceVerifyChip.
export interface VerifyResult {
  id: string;
  tenant_id: string;
  verified: boolean;
  kind: string;
  content_hash: string;
  prev_hash: string;
}
