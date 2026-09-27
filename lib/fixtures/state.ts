import type {
  Control,
  ControlResult,
  ControlStatus,
  NotAssessedReason,
  VerificationRun,
} from "@/lib/domain";
import { CONTROL_SEEDS } from "./controls";
import { daysAfter, daysBefore, hoursBefore, minutesAfter } from "./time";

/**
 * Verification runs and their results — the spine of the fixture narrative.
 *
 * Results are derived: every verified run evaluates every control against every
 * resource in its scope, and a small override table encodes the story. Nothing
 * is random, and control status is computed from results rather than asserted,
 * so the dataset cannot contradict itself.
 */

const EXCEPTION_CONTROL = "TC-NET-03";
const EXCEPTION_RESOURCE = "ec2-worker";

export const FIXTURE_RUNS: VerificationRun[] = [
  { id: "run-01", trigger: "SCHEDULED", state: "VERIFIED", startedAt: daysBefore(6), scope: {}, counts: zero() },
  { id: "run-02", trigger: "SCHEDULED", state: "VERIFIED", startedAt: daysBefore(5), scope: {}, counts: zero() },
  { id: "run-03", trigger: "SCHEDULED", state: "VERIFIED", startedAt: daysBefore(4), scope: {}, counts: zero() },
  {
    id: "run-04", trigger: "POST_REMEDIATION", state: "VERIFIED", startedAt: daysBefore(4, 11),
    scope: { controlIds: ["TC-DATA-02"] }, counts: zero(), requestedBy: "Priya Raman",
  },
  {
    id: "run-05", trigger: "SCHEDULED", state: "FAILED", startedAt: daysBefore(3),
    finishedAt: minutesAfter(daysBefore(3), 2), scope: {}, counts: zero(),
    error: { code: "NO_PERMISSION", message: "Data platform: the role is missing kms:ListKeyRotations." },
  },
  { id: "run-06", trigger: "MANUAL", state: "VERIFIED", startedAt: daysBefore(2, 15), scope: {}, counts: zero(), requestedBy: "Arun Menon" },
  { id: "run-07", trigger: "SCHEDULED", state: "VERIFIED", startedAt: daysBefore(1), scope: {}, counts: zero() },
  { id: "run-08", trigger: "SCHEDULED", state: "VERIFIED", startedAt: hoursBefore(3), scope: {}, counts: zero() },
  {
    id: "run-09", trigger: "MANUAL", state: "VERIFYING", startedAt: hoursBefore(0.05),
    scope: { controlIds: ["TC-DATA-01"] }, counts: zero(), requestedBy: "Arun Menon",
  },
];

function zero() {
  return { evaluated: 0, passed: 0, failed: 0, notAssessed: 0 };
}

/** Runs that actually produced results, oldest first. */
const RESULT_RUNS = FIXTURE_RUNS.filter((r) => r.state === "VERIFIED");
export const LATEST_RUN_ID = "run-08";

interface Override {
  status: ControlResult["status"];
  reason?: NotAssessedReason;
  previousStatus?: ControlStatus;
}

/**
 * The story, as overrides on an otherwise passing estate:
 *   TC-DATA-02 / customer-exports  drifted in run-03, fixed, verified in run-04
 *   TC-DATA-02 / partner-share     drifted in run-08 and is still open
 *   TC-LOG-03  / staging-trail     has never met the 365-day retention control
 *   TC-IAM-04  / deploy-ci         key overdue; a fix is awaiting verification
 *   TC-NET-03  / worker-node-1     fails, but is covered by an active exception
 *   TC-ENC-03  / analytics-key     cannot be checked — the role lacks permission
 */
function overrideFor(runId: string, controlId: string, resourceId: string): Override | null {
  if (controlId === "TC-ENC-03" && resourceId === "kms-analytics") {
    return { status: "NOT_ASSESSED", reason: "NO_PERMISSION" };
  }
  if (controlId === "TC-LOG-03" && resourceId === "trail-staging") return { status: "FAIL" };
  if (controlId === "TC-IAM-04" && resourceId === "iam-deploy") return { status: "FAIL" };
  if (controlId === EXCEPTION_CONTROL && resourceId === EXCEPTION_RESOURCE) return { status: "FAIL" };
  if (controlId === "TC-DATA-02" && resourceId === "s3-customer-exports" && runId === "run-03") {
    return { status: "FAIL", previousStatus: "PASS" };
  }
  if (controlId === "TC-DATA-02" && resourceId === "s3-partner-share" && runId === "run-08") {
    return { status: "FAIL", previousStatus: "PASS" };
  }
  return null;
}

function buildResults(): ControlResult[] {
  const out: ControlResult[] = [];
  for (const run of RESULT_RUNS) {
    const scopedControls = run.scope.controlIds
      ? CONTROL_SEEDS.filter((c) => run.scope.controlIds?.includes(c.id))
      : CONTROL_SEEDS;
    for (const control of scopedControls) {
      for (const resourceId of control.scope) {
        const o = overrideFor(run.id, control.id, resourceId);
        out.push({
          id: `res-${run.id}-${control.id}-${resourceId}`,
          controlId: control.id,
          resourceId,
          runId: run.id,
          status: o?.status ?? "PASS",
          notAssessedReason: o?.reason,
          checkedAt: minutesAfter(run.startedAt, 3),
          evidenceId: `EV-${run.id.slice(-2)}00`,
          previousStatus: o?.previousStatus,
        });
      }
    }
  }
  return out;
}

export const FIXTURE_RESULTS: ControlResult[] = buildResults();

// Runs carry the counts their own results produce — they cannot disagree.
for (const run of FIXTURE_RUNS) {
  const rs = FIXTURE_RESULTS.filter((r) => r.runId === run.id);
  run.counts = {
    evaluated: rs.length,
    passed: rs.filter((r) => r.status === "PASS").length,
    failed: rs.filter((r) => r.status === "FAIL").length,
    notAssessed: rs.filter((r) => r.status === "NOT_ASSESSED").length,
  };
  if (run.state === "VERIFIED" && !run.finishedAt) {
    run.finishedAt = minutesAfter(run.startedAt, 4);
  }
}

const LATEST_RUN = FIXTURE_RUNS.find((r) => r.id === LATEST_RUN_ID)!;

/** Precedence when a control spans several resources: attention first. */
function statusFromResults(results: ControlResult[]): ControlStatus {
  if (results.some((r) => r.status === "FAIL" && r.previousStatus === "PASS")) return "DRIFTED";
  if (results.some((r) => r.status === "FAIL")) return "FAIL";
  if (results.some((r) => r.status === "NOT_ASSESSED")) return "NOT_ASSESSED";
  return "PASS";
}

function buildControls(): Control[] {
  return CONTROL_SEEDS.map((seed) => {
    const latest = FIXTURE_RESULTS.filter((r) => r.runId === LATEST_RUN_ID && r.controlId === seed.id);
    let status = statusFromResults(latest);
    const notAssessed = latest.find((r) => r.status === "NOT_ASSESSED");
    const isExcepted = seed.id === EXCEPTION_CONTROL;
    if (isExcepted) status = "EXCEPTION";

    return {
      id: seed.id,
      name: seed.name,
      description: seed.description,
      whyItMatters: seed.whyItMatters,
      domain: seed.domain,
      expectedState: seed.expectedState,
      severity: seed.severity,
      provider: "AWS" as const,
      frameworkRefs: seed.frameworkRefs,
      status,
      notAssessedReason: status === "NOT_ASSESSED" ? notAssessed?.notAssessedReason : undefined,
      resourcesInScope: latest.length,
      resourcesFailing: latest.filter((r) => r.status === "FAIL").length,
      lastVerifiedAt: LATEST_RUN.finishedAt,
      nextVerificationAt: daysAfter(1),
      verification: seed.id === "TC-DATA-01" ? ("VERIFYING" as const) : ("VERIFIED" as const),
      remediationAvailable: seed.remediationAvailable,
      exception: isExcepted ? { id: "exc-01", expiresAt: daysAfter(74) } : undefined,
      evidenceRefs: [`EV-${LATEST_RUN_ID.slice(-2)}00`],
    };
  });
}

export const FIXTURE_CONTROLS: Control[] = buildControls();
