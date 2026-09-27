/**
 * Backend shape for the product's evidence surface (GET /api/evidence).
 *
 * This is NOT the raw assurance chain record. The Go handler builds this from
 * the signed chain and deliberately leaves out the content hash, prev hash,
 * signature, database id, confidence score and resource digests. Those remain
 * available under the audit-scoped /api/assurance/* API for a customer who
 * wants to re-verify a record offline; they are not what the screen shows.
 *
 * Every field is optional-tolerant for the same reason as the control DTOs: a
 * backend that stops sending a field becomes a missing value the adapter
 * handles, not a crash inside a component.
 */

export interface EvidenceDTO {
  /** Short display reference derived from the record's content hash. */
  id: string;
  kind: string;
  controlId?: string;
  runId?: string;
  recordedAt: string;
  /** VERIFIED | FAILED | UNCHECKED, as the backend actually checked it. */
  integrity: string;
  summary: string;
}
