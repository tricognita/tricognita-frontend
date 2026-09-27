import type { VerificationRun } from "@/lib/domain";
import { apiGet } from "./client";
import type { VerificationRunDTO } from "./dto/control";
import { toVerificationRun } from "./adapters/control";

/**
 * Verification runs, newest first.
 *
 * Failed runs are included, because a history with its failures removed is not
 * a history — a customer needs to see that yesterday's assessment did not
 * complete.
 */
export async function fetchVerificationRuns(): Promise<VerificationRun[]> {
  const body = await apiGet<{ runs: VerificationRunDTO[] }>(
    "/api/verification-runs",
    "verification runs",
  );
  return (body.runs ?? []).map(toVerificationRun);
}
