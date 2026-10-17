import type {
  DriftEvent,
  Evidence,
  Exception,
  Finding,
  Remediation,
  Report,
  User,
} from "@/lib/domain";
import { daysAfter, daysBefore, hoursBefore, minutesAfter } from "./time";

/**
 * The narrative entities that hang off the verification results in state.ts.
 *
 * Every id here resolves to a control, resource or run that exists, and every
 * chain is ordered in time. fixtures.test.ts enforces both.
 */

export const FIXTURE_FINDINGS: Finding[] = [
  {
    id: "find-log-03",
    controlId: "TC-LOG-03",
    resourceId: "trail-staging",
    title: "Staging trail keeps only 90 days of audit logs",
    severity: "HIGH",
    status: "OPEN",
    firstSeenAt: daysBefore(6),
    lastSeenAt: hoursBefore(3),
    remediationSteps: [
      { order: 1, instruction: "Open the log group for the staging trail.", console: "CloudWatch → Log groups → /aws/cloudtrail/staging" },
      { order: 2, instruction: "Set retention to 365 days or more.", cli: "aws logs put-retention-policy --log-group-name /aws/cloudtrail/staging --retention-in-days 365" },
      { order: 3, instruction: "Re-run verification for this control." },
    ],
    remediation: { id: "rem-02", state: "FAILED" },
  },
  {
    id: "find-data-02",
    controlId: "TC-DATA-02",
    resourceId: "s3-partner-share",
    title: "Bucket partner-share allows public access",
    severity: "CRITICAL",
    status: "OPEN",
    firstSeenAt: hoursBefore(3),
    lastSeenAt: hoursBefore(3),
    remediationSteps: [
      { order: 1, instruction: "Check whether anything depends on public reads from this bucket." },
      { order: 2, instruction: "Enable Block Public Access on the bucket.", cli: "aws s3api put-public-access-block --bucket partner-share --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" },
      { order: 3, instruction: "Verification runs again automatically once the change is applied." },
    ],
    remediation: { id: "rem-03", state: "PENDING_APPROVAL" },
  },
  {
    id: "find-iam-04",
    controlId: "TC-IAM-04",
    resourceId: "iam-deploy",
    title: "Access key for deploy-ci is 142 days old",
    severity: "MEDIUM",
    status: "AWAITING_VERIFICATION",
    firstSeenAt: daysBefore(6),
    lastSeenAt: hoursBefore(3),
    remediationSteps: [
      { order: 1, instruction: "Create a replacement key and update the CI secret." },
      { order: 2, instruction: "Disable the old key, then delete it after the next successful deploy." },
    ],
  },
];

export const FIXTURE_REMEDIATIONS: Remediation[] = [
  {
    id: "rem-01",
    controlId: "TC-DATA-02",
    resourceIds: ["s3-customer-exports"],
    state: "COMPLETED",
    method: "AUTOMATED",
    requestedBy: "Arun Menon",
    requestedAt: daysBefore(4, 9),
    approvedBy: "Priya Raman",
    approvedAt: daysBefore(4, 10),
    approvalExpiresAt: minutesAfter(daysBefore(4, 10), 30),
    executedAt: daysBefore(4, 10),
    completedAt: daysBefore(4, 11),
    summary: "Enable Block Public Access on customer-exports at bucket level.",
    rollback: "Remove the bucket-level public access block.",
    verificationRunId: "run-04",
    outcome: [{ resourceId: "s3-customer-exports", status: "FIXED" }],
  },
  {
    id: "rem-02",
    controlId: "TC-LOG-03",
    resourceIds: ["trail-staging"],
    state: "FAILED",
    method: "TRICOGNITA_ENGINEER",
    requestedBy: "Arun Menon",
    requestedAt: daysBefore(2, 14),
    approvedBy: "Priya Raman",
    approvedAt: daysBefore(2, 14),
    executedAt: daysBefore(2, 15),
    summary: "Raise audit log retention on the staging trail to 365 days.",
    rollback: "Restore the previous 90-day retention.",
    outcome: [
      {
        resourceId: "trail-staging",
        status: "FAILED",
        message: "Access denied: the role may not change retention on this log group.",
      },
    ],
  },
  {
    id: "rem-03",
    controlId: "TC-DATA-02",
    resourceIds: ["s3-partner-share"],
    state: "PENDING_APPROVAL",
    method: "AUTOMATED",
    requestedBy: "Arun Menon",
    requestedAt: hoursBefore(2),
    approvalExpiresAt: minutesAfter(hoursBefore(2), 30),
    summary: "Enable Block Public Access on partner-share at bucket level.",
    rollback: "Remove the bucket-level public access block.",
  },
];

export const FIXTURE_DRIFT: DriftEvent[] = [
  {
    id: "drift-01",
    controlId: "TC-DATA-02",
    resourceId: "s3-customer-exports",
    detectedAt: daysBefore(4, 6),
    previousStatus: "PASS",
    currentStatus: "FAIL",
    detectedByRunId: "run-03",
    resolvedAt: daysBefore(4, 11),
    resolvedByRunId: "run-04",
    remediationId: "rem-01",
    notifiedRoutes: ["Platform team (Slack)"],
  },
  {
    id: "drift-02",
    controlId: "TC-DATA-02",
    resourceId: "s3-partner-share",
    detectedAt: hoursBefore(3),
    previousStatus: "PASS",
    currentStatus: "FAIL",
    detectedByRunId: "run-08",
    remediationId: "rem-03",
    notifiedRoutes: ["Platform team (Slack)"],
  },
];

export const FIXTURE_EXCEPTIONS: Exception[] = [
  {
    id: "exc-01",
    controlId: "TC-NET-03",
    resourceIds: ["ec2-worker"],
    reason:
      "Legacy batch agent on this worker cannot use IMDSv2. Replacement is scheduled for the November release.",
    owner: "Priya Raman",
    createdAt: daysBefore(30),
    expiresAt: daysAfter(74),
    state: "ACTIVE",
  },
];

export const FIXTURE_EVIDENCE: Evidence[] = [
  { id: "EV-0100", kind: "CONTROL_VERIFICATION", runId: "run-01", recordedAt: daysBefore(6), integrity: "VERIFIED", summary: "Scheduled verification of 27 controls." },
  { id: "EV-0200", kind: "CONTROL_VERIFICATION", runId: "run-02", recordedAt: daysBefore(5), integrity: "VERIFIED", summary: "Scheduled verification of 27 controls." },
  { id: "EV-0300", kind: "CONTROL_VERIFICATION", runId: "run-03", recordedAt: daysBefore(4), integrity: "VERIFIED", summary: "Scheduled verification; customer-exports began failing." },
  { id: "EV-0400", kind: "REMEDIATION", controlId: "TC-DATA-02", runId: "run-04", recordedAt: daysBefore(4, 11), integrity: "VERIFIED", summary: "Block Public Access applied to customer-exports and verified." },
  { id: "EV-0600", kind: "CONTROL_VERIFICATION", runId: "run-06", recordedAt: daysBefore(2, 15), integrity: "VERIFIED", summary: "Manual verification requested by Arun Menon." },
  { id: "EV-0700", kind: "CONTROL_VERIFICATION", runId: "run-07", recordedAt: daysBefore(1), integrity: "VERIFIED", summary: "Scheduled verification of 27 controls." },
  { id: "EV-0800", kind: "CONTROL_VERIFICATION", runId: "run-08", recordedAt: hoursBefore(3), integrity: "UNCHECKED", summary: "Scheduled verification; partner-share began failing." },
  { id: "EV-0801", kind: "DRIFT", controlId: "TC-DATA-02", runId: "run-08", recordedAt: hoursBefore(3), integrity: "VERIFIED", summary: "Drift recorded: partner-share moved from passing to failing." },
  { id: "EV-0301", kind: "DRIFT", controlId: "TC-DATA-02", runId: "run-03", recordedAt: daysBefore(4, 6), integrity: "VERIFIED", summary: "Drift recorded: customer-exports moved from passing to failing." },
];

export const FIXTURE_REPORTS: Report[] = [
  {
    id: "rep-2026-08",
    kind: "MONTHLY_ASSURANCE",
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-08-31T23:59:59.000Z",
    state: "READY",
    generatedAt: daysBefore(17),
    downloadUrl: "#",
    formats: ["PDF", "CSV"],
    summary: { controlsVerified: 25, controlsFailing: 2, driftEvents: 1, remediations: 2 },
  },
  {
    id: "rep-review-acme",
    kind: "CUSTOMER_REVIEW",
    periodStart: daysBefore(30),
    periodEnd: hoursBefore(3),
    state: "GENERATING",
    formats: ["PDF"],
  },
  {
    id: "rep-evidence-q3",
    kind: "EVIDENCE_EXPORT",
    periodStart: "2026-07-01T00:00:00.000Z",
    periodEnd: "2026-09-16T23:59:59.000Z",
    state: "FAILED",
    formats: ["CSV"],
    error: "The export timed out. Try a shorter period, or contact support with reference R-4471.",
  },
];

export const FIXTURE_USERS: User[] = [
  { id: "usr-priya", name: "Priya Raman", email: "priya@acme.example", role: "SECURITY_OPS", lastActiveAt: hoursBefore(1), status: "ACTIVE" },
  { id: "usr-arun", name: "Arun Menon", email: "arun@acme.example", role: "ENGINEERING", lastActiveAt: hoursBefore(4), status: "ACTIVE" },
  { id: "usr-divya", name: "Divya Krishnan", email: "divya@acme.example", role: "ADMIN", lastActiveAt: daysBefore(1, 12), status: "ACTIVE" },
  { id: "usr-sam", name: "Sameer Iqbal", email: "sameer@acme.example", role: "ENGINEERING", lastActiveAt: daysBefore(3, 9), status: "ACTIVE" },
  { id: "usr-nina", name: "Nina Fernandes", email: "nina@acme.example", role: "VIEWER", status: "INVITED" },
];
