import type {
  AlertRoute,
  CloudAccount,
  Control,
  ControlResult,
  DriftEvent,
  Evidence,
  Exception,
  Finding,
  Remediation,
  Report,
  Resource,
  Timestamp,
  User,
  VerificationRun,
} from "./entities";
import type {
  ControlDomain,
  ControlStatus,
  FindingStatus,
  ReportKind,
  Severity,
} from "./status";
import { CONTROL_STATUS_ORDER, FINDING_STATUS_ORDER, SEVERITY_ORDER } from "./status";

/**
 * Derivations over the domain model.
 *
 * Pure functions, no React: the Overview decides what to show by asking these
 * questions, and a test can ask the same questions without rendering anything.
 */

export interface ControlCounts {
  total: number;
  passing: number;
  failing: number;
  drifted: number;
  exception: number;
  notAssessed: number;
  verifying: number;
  /** Failing + drifted — the two states that mean someone must act. */
  needsAttention: number;
}

export function countControls(controls: Control[]): ControlCounts {
  const by = (s: ControlStatus) => controls.filter((c) => c.status === s).length;
  const failing = by("FAIL");
  const drifted = by("DRIFTED");
  return {
    total: controls.length,
    passing: by("PASS"),
    failing,
    drifted,
    exception: by("EXCEPTION"),
    notAssessed: by("NOT_ASSESSED"),
    verifying: controls.filter((c) => c.verification === "VERIFYING").length,
    needsAttention: failing + drifted,
  };
}

export type AttentionKind =
  | "DRIFT"
  | "FAILING_CONTROL"
  | "REMEDIATION_FAILED"
  | "REMEDIATION_AWAITING_APPROVAL"
  | "NOT_ASSESSED"
  | "ACCOUNT"
  | "EXCEPTION";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  /** Control status to badge the row with, where one applies. */
  status?: ControlStatus;
  href: string;
  /** When this became true — rendered with <DateTime>. */
  occurredAt?: Timestamp;
}

/** Most urgent first: a regression outranks a control that never passed. */
const PRIORITY: Record<AttentionKind, number> = {
  DRIFT: 0,
  FAILING_CONTROL: 1,
  REMEDIATION_FAILED: 2,
  REMEDIATION_AWAITING_APPROVAL: 3,
  NOT_ASSESSED: 4,
  ACCOUNT: 5,
  EXCEPTION: 6,
};

export interface AttentionInput {
  controls: Control[];
  drift: DriftEvent[];
  exceptions: Exception[];
  remediations: Remediation[];
  accounts?: CloudAccount[];
  resources?: Resource[];
}

/**
 * What a customer must act on, gathered from what the product already knows.
 * Nothing here is invented: every item points at a real control, drift event,
 * remediation, exception or account.
 */
export function attentionItems(input: AttentionInput): AttentionItem[] {
  const { controls, drift, exceptions, remediations, accounts = [], resources = [] } = input;
  const controlById = new Map(controls.map((c) => [c.id, c]));
  const resourceLabel = (id: string) => resources.find((r) => r.id === id)?.label ?? "a resource";
  const items: AttentionItem[] = [];

  for (const d of drift.filter((e) => !e.resolvedAt)) {
    const control = controlById.get(d.controlId);
    items.push({
      id: `drift:${d.id}`,
      kind: "DRIFT",
      title: control?.name ?? d.controlId,
      detail: `${resourceLabel(d.resourceId)} was passing and is now failing`,
      status: "DRIFTED",
      href: `/dashboard/controls/${d.controlId}`,
      occurredAt: d.detectedAt,
    });
  }

  for (const c of controls.filter((x) => x.status === "FAIL")) {
    items.push({
      id: `control:${c.id}`,
      kind: "FAILING_CONTROL",
      title: c.name,
      detail: `${c.resourcesFailing} of ${c.resourcesInScope} resources failing`,
      status: "FAIL",
      href: `/dashboard/controls/${c.id}`,
      occurredAt: c.lastVerifiedAt,
    });
  }

  for (const m of remediations) {
    const control = controlById.get(m.controlId);
    if (m.state === "FAILED") {
      const failed = m.outcome?.find((o) => o.status === "FAILED");
      items.push({
        id: `rem:${m.id}`,
        kind: "REMEDIATION_FAILED",
        title: `Fix failed — ${control?.name ?? m.controlId}`,
        detail: failed?.message ?? "The change did not apply.",
        href: `/dashboard/remediation`,
        occurredAt: m.executedAt ?? m.requestedAt,
      });
    }
    if (m.state === "PENDING_APPROVAL") {
      items.push({
        id: `rem:${m.id}`,
        kind: "REMEDIATION_AWAITING_APPROVAL",
        title: `Fix awaiting approval — ${control?.name ?? m.controlId}`,
        detail: m.summary,
        href: `/dashboard/remediation`,
        occurredAt: m.requestedAt,
      });
    }
  }

  for (const c of controls.filter((x) => x.status === "NOT_ASSESSED")) {
    items.push({
      id: `na:${c.id}`,
      kind: "NOT_ASSESSED",
      title: c.name,
      detail: "This control could not be checked, so it is not counted as passing.",
      status: "NOT_ASSESSED",
      href: `/dashboard/controls/${c.id}`,
      occurredAt: c.lastVerifiedAt,
    });
  }

  for (const a of accounts.filter((x) => x.connection !== "CONNECTED")) {
    items.push({
      id: `acct:${a.id}`,
      kind: "ACCOUNT",
      title: `${a.alias} needs attention`,
      detail: a.message ?? "This account could not be read at the last verification.",
      href: `/dashboard/cloud-accounts`,
      occurredAt: a.lastVerifiedAt,
    });
  }

  for (const e of exceptions.filter((x) => x.state === "ACTIVE")) {
    const control = controlById.get(e.controlId);
    items.push({
      id: `exc:${e.id}`,
      kind: "EXCEPTION",
      title: `Exception — ${control?.name ?? e.controlId}`,
      detail: `Accepted by ${e.owner}. Expires`,
      status: "EXCEPTION",
      href: `/dashboard/assurance/exceptions`,
      occurredAt: e.expiresAt,
    });
  }

  return items.sort(
    (a, b) =>
      PRIORITY[a.kind] - PRIORITY[b.kind] ||
      Date.parse(b.occurredAt ?? "") - Date.parse(a.occurredAt ?? ""),
  );
}

const startedDesc = (a: VerificationRun, b: VerificationRun) =>
  Date.parse(b.startedAt) - Date.parse(a.startedAt);

/** The run in flight, if any. */
export function activeRun(runs: VerificationRun[]): VerificationRun | undefined {
  return [...runs]
    .sort(startedDesc)
    .find((r) => r.state === "VERIFYING" || r.state === "PENDING");
}

/** The most recent run that finished, whether it succeeded or failed. */
export function lastCompletedRun(runs: VerificationRun[]): VerificationRun | undefined {
  return [...runs].sort(startedDesc).find((r) => r.state === "VERIFIED" || r.state === "FAILED");
}

/** Most recent first, for the recent-activity table. */
export function recentRuns(runs: VerificationRun[], limit = 5): VerificationRun[] {
  return [...runs].sort(startedDesc).slice(0, limit);
}

/** The soonest scheduled verification across the baseline. */
export function nextVerificationAt(controls: Control[]): Timestamp | undefined {
  const times = controls
    .map((c) => c.nextVerificationAt)
    .filter((t): t is string => Boolean(t))
    .sort();
  return times[0];
}

/** Open drift first, then most recently detected. */
export function sortedDrift(drift: DriftEvent[]): DriftEvent[] {
  return [...drift].sort(
    (a, b) =>
      Number(Boolean(a.resolvedAt)) - Number(Boolean(b.resolvedAt)) ||
      Date.parse(b.detectedAt) - Date.parse(a.detectedAt),
  );
}

// ── Controls list ────────────────────────────────────────────────────────────

export interface ControlFilter {
  status?: ControlStatus | "ALL";
  domain?: ControlDomain | "ALL";
  /** Free text over customer-visible control fields only. */
  search?: string;
}

/** Fields a customer can see, and therefore the only fields search may read. */
function searchableText(c: Control): string {
  return [
    c.id,
    c.name,
    c.description,
    c.expectedState,
    c.whyItMatters,
    ...c.frameworkRefs.map((f) => `${f.framework} ${f.ref}`),
  ]
    .join(" ")
    .toLowerCase();
}

export function filterControls(controls: Control[], filter: ControlFilter): Control[] {
  const term = filter.search?.trim().toLowerCase();
  return controls.filter((c) => {
    if (filter.status && filter.status !== "ALL" && c.status !== filter.status) return false;
    if (filter.domain && filter.domain !== "ALL" && c.domain !== filter.domain) return false;
    if (term && !searchableText(c).includes(term)) return false;
    return true;
  });
}

/**
 * Operational order: what needs someone first. Uses the established status
 * ranking (drifted, failing, verifying, not assessed, exception, passing) and
 * falls back to the control id so the list is stable between renders.
 */
export function sortControlsByAttention(controls: Control[]): Control[] {
  return [...controls].sort(
    (a, b) =>
      CONTROL_STATUS_ORDER[a.status] - CONTROL_STATUS_ORDER[b.status] || a.id.localeCompare(b.id),
  );
}

export function countControlsByDomain(controls: Control[]): Record<string, number> {
  return controls.reduce<Record<string, number>>((acc, c) => {
    acc[c.domain] = (acc[c.domain] ?? 0) + 1;
    return acc;
  }, {});
}

// ── One control ──────────────────────────────────────────────────────────────

export type ControlEventKind =
  | "VERIFIED"
  | "FAILING"
  | "NOT_ASSESSED"
  | "DRIFT_DETECTED"
  | "DRIFT_RESOLVED"
  | "REMEDIATION";

export interface ControlEvent {
  id: string;
  at: Timestamp;
  kind: ControlEventKind;
  title: string;
  detail?: string;
}

export interface ControlHistoryInput {
  controlId: string;
  results: ControlResult[];
  runs: VerificationRun[];
  drift: DriftEvent[];
  remediations: Remediation[];
}

/**
 * One control's life, newest first: each verification run that touched it, the
 * drift it suffered, and the fixes applied to it. Assembled from records that
 * already exist — nothing here is generated to fill the page.
 */
export function controlHistory(input: ControlHistoryInput): ControlEvent[] {
  const { controlId, results, runs, drift, remediations } = input;
  const events: ControlEvent[] = [];
  const runById = new Map(runs.map((r) => [r.id, r]));

  const byRun = new Map<string, ControlResult[]>();
  for (const r of results.filter((x) => x.controlId === controlId)) {
    byRun.set(r.runId, [...(byRun.get(r.runId) ?? []), r]);
  }

  for (const [runId, rs] of byRun) {
    const run = runById.get(runId);
    const at = run?.finishedAt ?? run?.startedAt ?? rs[0].checkedAt;
    const failed = rs.filter((r) => r.status === "FAIL").length;
    const notAssessed = rs.filter((r) => r.status === "NOT_ASSESSED").length;
    const kind: ControlEventKind = failed > 0 ? "FAILING" : notAssessed > 0 ? "NOT_ASSESSED" : "VERIFIED";
    events.push({
      id: `run:${runId}`,
      at,
      kind,
      title:
        kind === "VERIFIED"
          ? "Verified"
          : kind === "FAILING"
            ? `Failing on ${failed} of ${rs.length} resources`
            : "Could not be checked",
      detail: run?.trigger === "POST_REMEDIATION" ? "Checked after a fix" : undefined,
    });
  }

  for (const d of drift.filter((x) => x.controlId === controlId)) {
    events.push({
      id: `drift:${d.id}`,
      at: d.detectedAt,
      kind: "DRIFT_DETECTED",
      title: "Drift detected",
      detail: "This control was passing and began failing again.",
    });
    if (d.resolvedAt) {
      events.push({
        id: `drift-resolved:${d.id}`,
        at: d.resolvedAt,
        kind: "DRIFT_RESOLVED",
        title: "Drift closed and re-verified",
      });
    }
  }

  for (const m of remediations.filter((x) => x.controlId === controlId)) {
    events.push({
      id: `rem:${m.id}`,
      at: m.completedAt ?? m.executedAt ?? m.requestedAt,
      kind: "REMEDIATION",
      title: `Fix ${m.state === "COMPLETED" ? "applied and verified" : m.state.toLowerCase().replace(/_/g, " ")}`,
      detail: m.summary,
    });
  }

  return events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

// ── Findings ─────────────────────────────────────────────────────────────────

export interface FindingFilter {
  status?: FindingStatus | "ALL";
  severity?: Severity | "ALL";
  /** The category of the control the finding belongs to. */
  domain?: ControlDomain | "ALL";
  search?: string;
}

export interface FindingSearchContext {
  controls: Control[];
  resources: Resource[];
}

/**
 * Customer-visible text only: the finding's own words, the control it belongs
 * to, and the resource's friendly label. Never an internal identifier.
 */
function findingSearchText(f: Finding, ctx: FindingSearchContext): string {
  const control = ctx.controls.find((c) => c.id === f.controlId);
  const resource = ctx.resources.find((r) => r.id === f.resourceId);
  return [
    f.title,
    control?.id ?? "",
    control?.name ?? "",
    resource?.label ?? "",
    resource?.service ?? "",
    resource?.regionLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function filterFindings(
  findings: Finding[],
  filter: FindingFilter,
  ctx: FindingSearchContext,
): Finding[] {
  const term = filter.search?.trim().toLowerCase();
  const domainOf = (f: Finding) => ctx.controls.find((c) => c.id === f.controlId)?.domain;
  return findings.filter((f) => {
    if (filter.status && filter.status !== "ALL" && f.status !== filter.status) return false;
    if (filter.severity && filter.severity !== "ALL" && f.severity !== filter.severity) return false;
    if (filter.domain && filter.domain !== "ALL" && domainOf(f) !== filter.domain) return false;
    if (term && !findingSearchText(f, ctx).includes(term)) return false;
    return true;
  });
}

/**
 * Open work first, worst severity first inside that — the order an engineer
 * actually works the queue. No composite priority number: severity and status
 * are both facts the customer can check, a blended score is not.
 */
export function sortFindingsByAttention(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      FINDING_STATUS_ORDER[a.status] - FINDING_STATUS_ORDER[b.status] ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      Date.parse(a.firstSeenAt) - Date.parse(b.firstSeenAt),
  );
}

/** The findings recorded against one control — the Control → Finding link. */
export function findingsForControl(findings: Finding[], controlId: string): Finding[] {
  return sortFindingsByAttention(findings.filter((f) => f.controlId === controlId));
}

/** A finding is still being worked unless it is resolved or excepted. */
export function isFindingOpen(f: Finding): boolean {
  return f.status !== "RESOLVED" && f.status !== "EXCEPTION";
}

// ── Assurance ────────────────────────────────────────────────────────────────

/** Newest first. The historical record reads backwards from now. */
export function runsByRecency(runs: VerificationRun[]): VerificationRun[] {
  return [...runs].sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || a.id.localeCompare(b.id),
  );
}

/**
 * Totals across the recorded runs. Counts, never a rate: "734 results across 8
 * completed runs" is checkable; "98.4% assured" is a claim.
 */
export interface VerificationTotals {
  runs: number;
  completed: number;
  failedRuns: number;
  inFlight: number;
  results: number;
  passed: number;
  failed: number;
  notAssessed: number;
}

export function verificationTotals(runs: VerificationRun[]): VerificationTotals {
  return runs.reduce<VerificationTotals>(
    (acc, r) => ({
      runs: acc.runs + 1,
      completed: acc.completed + (r.state === "VERIFIED" ? 1 : 0),
      failedRuns: acc.failedRuns + (r.state === "FAILED" ? 1 : 0),
      inFlight: acc.inFlight + (r.state === "VERIFYING" || r.state === "PENDING" ? 1 : 0),
      results: acc.results + r.counts.evaluated,
      passed: acc.passed + r.counts.passed,
      failed: acc.failed + r.counts.failed,
      notAssessed: acc.notAssessed + r.counts.notAssessed,
    }),
    { runs: 0, completed: 0, failedRuns: 0, inFlight: 0, results: 0, passed: 0, failed: 0, notAssessed: 0 },
  );
}

/** Drift that nobody has closed yet. */
export function openDrift(drift: DriftEvent[]): DriftEvent[] {
  return sortedDrift(drift.filter((d) => !d.resolvedAt));
}

/** Drift that was closed and re-verified — the part that proves the loop works. */
export function resolvedDrift(drift: DriftEvent[]): DriftEvent[] {
  return sortedDrift(drift.filter((d) => Boolean(d.resolvedAt)));
}

export function activeExceptions(exceptions: Exception[]): Exception[] {
  return exceptions
    .filter((e) => e.state === "ACTIVE")
    .sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));
}

/** Exceptions that no longer hold — kept, because the record matters at audit. */
export function pastExceptions(exceptions: Exception[]): Exception[] {
  return exceptions
    .filter((e) => e.state !== "ACTIVE")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** How long an exception has left, in whole days, given the caller's clock. */
export function daysUntil(iso: string, nowMs: number): number {
  return Math.ceil((Date.parse(iso) - nowMs) / 86_400_000);
}

// ─── Reports and evidence — the proof layer ─────────────────────────────────

/** Reports newest period first, so the current month leads the list. */
export function reportsByPeriod(reports: Report[]): Report[] {
  return [...reports].sort(
    (a, b) => Date.parse(b.periodEnd) - Date.parse(a.periodEnd) || a.id.localeCompare(b.id),
  );
}

/** The most recent report of one kind, or undefined when none has been produced. */
export function latestReportOfKind(reports: Report[], kind: ReportKind): Report | undefined {
  return reportsByPeriod(reports.filter((r) => r.kind === kind))[0];
}

/** True when a report has a document behind it. GENERATING is not READY. */
export function isReportDownloadable(report: Report): boolean {
  return report.state === "READY" && Boolean(report.downloadUrl);
}

/**
 * Evidence newest first, ties broken by reference.
 *
 * Records genuinely share an instant — a run writes its verification record
 * and the drift it detected at the same moment — so time alone is not a total
 * order. Without the tie-break the same evidence list could come back in a
 * different order on two reads of the same record, which is exactly the thing
 * an auditor is entitled not to see.
 */
export function evidenceByRecency(evidence: Evidence[]): Evidence[] {
  return [...evidence].sort(
    (a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt) || a.id.localeCompare(b.id),
  );
}

/**
 * Evidence recorded against one control.
 *
 * Only a recorded controlId counts. Evidence from a run that happened to touch
 * the control is not evidence *for* it, and inferring that link would be the
 * product asserting something it was never told.
 */
export function evidenceForControl(evidence: Evidence[], controlId: string): Evidence[] {
  return evidenceByRecency(evidence.filter((e) => e.controlId === controlId));
}

export function evidenceForRun(evidence: Evidence[], runId: string): Evidence[] {
  return evidenceByRecency(evidence.filter((e) => e.runId === runId));
}

export function findEvidence(evidence: Evidence[], id: string): Evidence | undefined {
  return evidence.find((e) => e.id === id);
}

/** Records whose recordedAt falls inside [start, end], inclusive. */
export function evidenceInPeriod(evidence: Evidence[], start: Timestamp, end: Timestamp): Evidence[] {
  const from = Date.parse(start);
  const to = Date.parse(end);
  return evidenceByRecency(
    evidence.filter((e) => {
      const at = Date.parse(e.recordedAt);
      return at >= from && at <= to;
    }),
  );
}

/** Runs that started inside [start, end], inclusive. */
export function runsInPeriod(runs: VerificationRun[], start: Timestamp, end: Timestamp): VerificationRun[] {
  const from = Date.parse(start);
  const to = Date.parse(end);
  return runsByRecency(
    runs.filter((r) => {
      const at = Date.parse(r.startedAt);
      return at >= from && at <= to;
    }),
  );
}

/** Drift detected inside [start, end], inclusive. */
export function driftInPeriod(drift: DriftEvent[], start: Timestamp, end: Timestamp): DriftEvent[] {
  const from = Date.parse(start);
  const to = Date.parse(end);
  return sortedDrift(
    drift.filter((d) => {
      const at = Date.parse(d.detectedAt);
      return at >= from && at <= to;
    }),
  );
}

/**
 * What the retained record itself says about a period.
 *
 * Kept separate from Report.summary on purpose: a report's counts are a
 * snapshot taken when it was generated, while these are read from the record
 * as it stands now. Showing them as one number would hide that difference.
 */
export interface PeriodRecord {
  runs: number;
  runsCompleted: number;
  runsFailed: number;
  results: number;
  driftDetected: number;
  driftResolved: number;
  evidence: number;
  evidenceIntegrityFailed: number;
}

export function periodRecord(input: {
  runs: VerificationRun[];
  drift: DriftEvent[];
  evidence: Evidence[];
  start: Timestamp;
  end: Timestamp;
}): PeriodRecord {
  const runs = runsInPeriod(input.runs, input.start, input.end);
  const drift = driftInPeriod(input.drift, input.start, input.end);
  const evidence = evidenceInPeriod(input.evidence, input.start, input.end);
  const totals = verificationTotals(runs);
  return {
    runs: totals.runs,
    runsCompleted: totals.completed,
    runsFailed: totals.failedRuns,
    results: totals.results,
    driftDetected: drift.length,
    driftResolved: drift.filter((d) => Boolean(d.resolvedAt)).length,
    evidence: evidence.length,
    evidenceIntegrityFailed: evidence.filter((e) => e.integrity === "FAILED").length,
  };
}

// ─── Remediation — the controlled change, and what still owes an answer ─────

/** Requests newest first, ties broken by reference so two reads agree. */
export function remediationsByRecency(remediations: Remediation[]): Remediation[] {
  return [...remediations].sort(
    (a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt) || a.id.localeCompare(b.id),
  );
}

export function findRemediation(remediations: Remediation[], id: string): Remediation | undefined {
  return remediations.find((r) => r.id === id);
}

export function remediationsForControl(remediations: Remediation[], controlId: string): Remediation[] {
  return remediationsByRecency(remediations.filter((r) => r.controlId === controlId));
}

/**
 * The finding a remediation was raised from.
 *
 * The link is recorded on the finding, not on the remediation, so it is read
 * in that direction only. Matching on controlId instead would attach a fix to
 * a finding nobody connected it to.
 */
export function findingForRemediation(findings: Finding[], remediationId: string): Finding | undefined {
  return findings.find((f) => f.remediation?.id === remediationId);
}

/**
 * A change is only confirmed when a verification run says so.
 *
 * COMPLETED means the change was applied. It does not mean the control passes.
 * Without the run that re-checked it, the honest word is "awaiting
 * verification", and the product must not print the other one.
 */
export function isRemediationConfirmed(remediation: Remediation): boolean {
  // APPLIED is what the live API reports for a change the provider accepted
  // (see adapters/remediation.ts); for it, only the verdict can earn "confirmed".
  if (remediation.state === "APPLIED") {
    return remediation.verdict === "REMEDIATED" && Boolean(remediation.verificationRunId);
  }
  return (
    (remediation.state === "COMPLETED" || remediation.state === "PARTIAL") &&
    Boolean(remediation.verificationRunId)
  );
}

export function isAwaitingVerification(remediation: Remediation): boolean {
  if (remediation.state === "APPLIED") {
    return !isRemediationConfirmed(remediation) && remediation.verdict !== "NOT_EFFECTIVE";
  }
  return (
    (remediation.state === "COMPLETED" || remediation.state === "PARTIAL") &&
    !remediation.verificationRunId
  );
}

/**
 * Whether a fix can be asked for at all.
 *
 * Eligibility is a product fact — the control has an automated fix and the
 * finding is still open. Whether the person may ask, and whether the API can
 * carry the request, are separate questions answered elsewhere.
 */
export function isFixRequestable(control: Control | undefined, finding: Finding | undefined): boolean {
  if (!control?.remediationAvailable) return false;
  if (!finding) return false;
  return isFindingOpen(finding);
}

export interface RemediationActionVisibility {
  showApproval: boolean;
  showApply: boolean;
  showReRequest: boolean;
  /** A change was applied and the control still fails — different from a write that never went through. */
  ineffective: boolean;
}

/**
 * Which controls RemediationActions offers for one remediation, given what the
 * viewer may do.
 *
 * Capability is passed in as already-resolved booleans rather than a role,
 * so this stays a pure function of state — hiding a control is not
 * authorization either way; the BFF and the backend re-check on every call.
 */
export function remediationActionVisibility(
  remediation: Remediation,
  mayApprove: boolean,
  mayRequest: boolean,
): RemediationActionVisibility {
  const ineffective = remediation.verdict === "NOT_EFFECTIVE";
  return {
    showApproval: remediation.state === "PENDING_APPROVAL" && mayApprove,
    showApply: remediation.state === "APPROVED" && mayApprove,
    showReRequest:
      (remediation.state === "FAILED" ||
        remediation.state === "REJECTED" ||
        remediation.state === "EXPIRED" ||
        ineffective) &&
      mayRequest,
    ineffective,
  };
}

/**
 * The operational queue: every remediation in exactly one bucket.
 *
 * Buckets, not a ranked list. A single ordering would have to decide that a
 * failed change outranks one awaiting approval, which is a judgement the
 * product does not get to make for an operator.
 */
export interface RemediationQueue {
  awaitingApproval: Remediation[];
  inFlight: Remediation[];
  needsAttention: Remediation[];
  awaitingVerification: Remediation[];
  confirmed: Remediation[];
  closed: Remediation[];
  notStarted: Remediation[];
}

export function remediationQueue(remediations: Remediation[]): RemediationQueue {
  const queue: RemediationQueue = {
    awaitingApproval: [],
    inFlight: [],
    needsAttention: [],
    awaitingVerification: [],
    confirmed: [],
    closed: [],
    notStarted: [],
  };

  for (const r of remediationsByRecency(remediations)) {
    switch (r.state) {
      case "PENDING_APPROVAL":
        queue.awaitingApproval.push(r);
        break;
      case "APPROVED":
      case "EXECUTING":
        queue.inFlight.push(r);
        break;
      case "FAILED":
        queue.needsAttention.push(r);
        break;
      case "PARTIAL":
      case "COMPLETED":
        if (isRemediationConfirmed(r)) queue.confirmed.push(r);
        else queue.awaitingVerification.push(r);
        break;
      case "APPLIED":
        // A change the provider accepted, sorted by what re-checking found.
        // Without this case every applied change fell through the switch and
        // vanished from the board, including ones verification had confirmed.
        if (isRemediationConfirmed(r)) queue.confirmed.push(r);
        else if (r.verdict === "NOT_EFFECTIVE") queue.needsAttention.push(r);
        else queue.awaitingVerification.push(r);
        break;
      case "REJECTED":
      case "EXPIRED":
        queue.closed.push(r);
        break;
      case "NOT_STARTED":
        queue.notStarted.push(r);
        break;
    }
  }

  return queue;
}

/** Buckets whose contents are waiting on a person, in the order an operator works them. */
export const REMEDIATION_ATTENTION_BUCKETS = [
  "awaitingApproval",
  "needsAttention",
  "awaitingVerification",
  "inFlight",
] as const;

/** How many remediations are waiting on someone. A count, never a rank. */
export function remediationsNeedingAction(queue: RemediationQueue): number {
  return REMEDIATION_ATTENTION_BUCKETS.reduce((n, key) => n + queue[key].length, 0);
}

/** Verification runs that did not complete — the operational failure, not a control result. */
export function failedRuns(runs: VerificationRun[]): VerificationRun[] {
  return runsByRecency(runs.filter((r) => r.state === "FAILED"));
}

/** Accounts that are not cleanly connected, worst first is not implied — insertion order is kept. */
export function unhealthyAccounts(accounts: CloudAccount[]): CloudAccount[] {
  return accounts.filter((a) => a.connection !== "CONNECTED");
}

// ─── Administration — configuration, not assurance ─────────────────────────

/**
 * Accounts that cannot be read cleanly first, then by alias.
 *
 * The broken ones lead because that is what an administrator opened the page
 * to deal with. Within each group the order is alphabetical and stable, never
 * a ranking: no account is "worse" than another.
 */
export function accountsByAttention(accounts: CloudAccount[]): CloudAccount[] {
  return [...accounts].sort((a, b) => {
    const aBroken = a.connection === "CONNECTED" ? 1 : 0;
    const bBroken = b.connection === "CONNECTED" ? 1 : 0;
    return aBroken - bBroken || a.alias.localeCompare(b.alias);
  });
}

/** Users by name, so the list reads the same on every load. */
export function usersByName(users: User[]): User[] {
  return [...users].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** Everyone who has not signed in yet — an invitation is unfinished work. */
export function invitedUsers(users: User[]): User[] {
  return usersByName(users.filter((u) => u.status === "INVITED"));
}

/** Enabled routes first, then by name. A disabled route is not deleted, only silent. */
export function alertRoutesByStatus(routes: AlertRoute[]): AlertRoute[] {
  return [...routes].sort(
    (a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name),
  );
}

/** Events nobody is notified about — the gap that matters on the alerts page. */
export function uncoveredAlertEvents(routes: AlertRoute[], all: readonly AlertEventName[]): AlertEventName[] {
  const covered = new Set(routes.filter((r) => r.enabled).flatMap((r) => r.events));
  return all.filter((e) => !covered.has(e));
}

/** Local alias so this file needs no import from the status vocabulary. */
type AlertEventName = AlertRoute["events"][number];
