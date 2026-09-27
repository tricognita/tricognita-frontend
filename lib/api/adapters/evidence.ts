/**
 * DTO → domain for evidence records.
 *
 * The defensive rule here is the mirror of the one in the control adapter. An
 * integrity value the product does not recognise becomes UNCHECKED, never
 * VERIFIED: the screen may say "we have not confirmed this record", and it may
 * say "this record failed its check", but it may never claim a record is sound
 * on the strength of a word it did not understand.
 */

import { EVIDENCE_INTEGRITY, EVIDENCE_KIND, type Evidence, type EvidenceIntegrity, type EvidenceKind } from "@/lib/domain";
import type { EvidenceDTO } from "../dto/evidence";

/** An unrecognised integrity value is an unchecked record, not a sound one. */
function toIntegrity(raw: string | undefined): EvidenceIntegrity {
  return raw && raw in EVIDENCE_INTEGRITY ? (raw as EvidenceIntegrity) : "UNCHECKED";
}

/**
 * An unrecognised kind falls back to CONTROL_VERIFICATION, which is what this
 * endpoint returns by construction — the backend filters the chain down to
 * control-verification records before it answers. The fallback exists so a new
 * backend kind renders as a generic record instead of crashing the screen.
 */
function toKind(raw: string | undefined): EvidenceKind {
  return raw && raw in EVIDENCE_KIND ? (raw as EvidenceKind) : "CONTROL_VERIFICATION";
}

export function toEvidence(dto: EvidenceDTO): Evidence {
  return {
    id: dto.id,
    kind: toKind(dto.kind),
    // Left undefined rather than blank: the screen distinguishes "no control"
    // from a control whose id happens to be empty.
    controlId: dto.controlId || undefined,
    runId: dto.runId || undefined,
    recordedAt: dto.recordedAt,
    integrity: toIntegrity(dto.integrity),
    summary: dto.summary ?? "",
  };
}
