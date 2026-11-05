// How long the BFF waits on the Go API for one remediation call.
//
// execute is a real cloud write followed by a full re-assessment: the backend
// gives post-remediation verification its own 2-minute budget
// (remediation/service.go verificationTimeout) plus a 30-second write-back.
// A 30-second proxy timeout made the browser report a 502 for fixes that went
// on to succeed. approve and reject are single row updates.
export const EXECUTE_UPSTREAM_TIMEOUT_MS = 160_000;
export const DEFAULT_UPSTREAM_TIMEOUT_MS = 30_000;

export function remediationUpstreamTimeoutMs(verb: string): number {
  return verb === "execute" ? EXECUTE_UPSTREAM_TIMEOUT_MS : DEFAULT_UPSTREAM_TIMEOUT_MS;
}
