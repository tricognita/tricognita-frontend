import type { Evidence } from "@/lib/domain";
import { apiGet } from "./client";
import type { EvidenceDTO } from "./dto/evidence";
import { toEvidence } from "./adapters/evidence";

/**
 * The tenant's control-verification evidence, newest first.
 *
 * Records whose integrity check failed are included, not filtered out. Evidence
 * a customer cannot trust is the single most important thing this screen can
 * show them; quietly dropping it would turn a tamper-evident chain into a list
 * of the records that happen to look fine.
 */
export async function fetchEvidence(): Promise<Evidence[]> {
  const body = await apiGet<{ evidence: EvidenceDTO[] }>("/api/evidence", "evidence");
  return (body.evidence ?? []).map(toEvidence);
}
