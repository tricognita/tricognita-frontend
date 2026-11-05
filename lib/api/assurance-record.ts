import type { AssuranceRecord } from "@/lib/domain";
import { apiGet } from "./client";
import type { AssuranceRecordDTO } from "./dto/assurance-record";
import { toAssuranceRecord } from "./adapters/assurance-record";

/**
 * The Control Assurance Record: every control × resource this organisation's
 * checks have covered, with its original state, every later check, drift,
 * remediation history and the evidence behind each state.
 *
 * Generated server-side from persisted product data on every request. The
 * domain record keeps the server's document verbatim for export, so what a
 * customer downloads is exactly what the screen shows.
 */
export async function fetchAssuranceRecord(): Promise<AssuranceRecord> {
  const body = await apiGet<AssuranceRecordDTO>("/api/evidence/record", "assurance record");
  return toAssuranceRecord(body);
}
