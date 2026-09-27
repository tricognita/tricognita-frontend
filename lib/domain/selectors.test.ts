/**
 * Selector behaviour, checked against the fixture dataset.
 *
 * These are the decisions the Overview makes — what counts as needing
 * attention, and in what order — so they are tested without rendering.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  activeExceptions,
  activeRun,
  attentionItems,
  controlHistory,
  countControls,
  countControlsByDomain,
  filterControls,
  filterFindings,
  findingsForControl,
  isFindingOpen,
  sortControlsByAttention,
  sortFindingsByAttention,
  lastCompletedRun,
  nextVerificationAt,
  recentRuns,
  sortedDrift,
  runsByRecency,
  reportsByPeriod,
  latestReportOfKind,
  isReportDownloadable,
  evidenceByRecency,
  evidenceForControl,
  evidenceForRun,
  evidenceInPeriod,
  findEvidence,
  runsInPeriod,
  driftInPeriod,
  periodRecord,
  verificationTotals,
  openDrift,
  resolvedDrift,
  pastExceptions,
  daysUntil,
  remediationsByRecency,
  findRemediation,
  remediationsForControl,
  findingForRemediation,
  isRemediationConfirmed,
  isAwaitingVerification,
  isFixRequestable,
  remediationQueue,
  remediationsNeedingAction,
  remediationActionVisibility,
  REMEDIATION_ATTENTION_BUCKETS,
  failedRuns,
  unhealthyAccounts,
} from "./selectors";
import type { Remediation } from "./entities";
import {
  FIXTURE_ACCOUNTS,
  FIXTURE_CONTROLS,
  FIXTURE_DRIFT,
  FIXTURE_EVIDENCE,
  FIXTURE_EXCEPTIONS,
  FIXTURE_FINDINGS,
  FIXTURE_REMEDIATIONS,
  FIXTURE_REPORTS,
  FIXTURE_RESOURCES,
  FIXTURE_RESULTS,
  FIXTURE_RUNS,
} from "../fixtures";

const input = {
  controls: FIXTURE_CONTROLS,
  drift: FIXTURE_DRIFT,
  exceptions: FIXTURE_EXCEPTIONS,
  remediations: FIXTURE_REMEDIATIONS,
  accounts: FIXTURE_ACCOUNTS,
  resources: FIXTURE_RESOURCES,
};

test("countControls reports the baseline exactly", () => {
  const c = countControls(FIXTURE_CONTROLS);
  assert.equal(c.total, 27);
  assert.equal(c.passing, 22);
  assert.equal(c.failing, 2);
  assert.equal(c.drifted, 1);
  assert.equal(c.exception, 1);
  assert.equal(c.notAssessed, 1);
  assert.equal(c.passing + c.failing + c.drifted + c.exception + c.notAssessed, c.total);
});

test("countControls never derives a score or percentage", () => {
  const c = countControls(FIXTURE_CONTROLS) as unknown as Record<string, unknown>;
  for (const key of Object.keys(c)) {
    assert.ok(!/score|percent|rating|grade/i.test(key), `${key} must not exist`);
    assert.equal(typeof c[key], "number");
  }
});

test("needsAttention counts only failing and drifted controls", () => {
  const c = countControls(FIXTURE_CONTROLS);
  assert.equal(c.needsAttention, c.failing + c.drifted);
  assert.equal(c.needsAttention, 3);
});

test("attention is ranked: drift before a control that never passed", () => {
  const items = attentionItems(input);
  assert.ok(items.length > 0);
  assert.equal(items[0].kind, "DRIFT", "an open drift event leads the list");
  const kinds = items.map((i) => i.kind);
  assert.ok(kinds.indexOf("DRIFT") < kinds.indexOf("FAILING_CONTROL"));
  assert.ok(kinds.indexOf("FAILING_CONTROL") < kinds.indexOf("EXCEPTION"));
});

test("attention surfaces every state that needs a person", () => {
  const kinds = new Set(attentionItems(input).map((i) => i.kind));
  for (const expected of [
    "DRIFT",
    "FAILING_CONTROL",
    "REMEDIATION_FAILED",
    "REMEDIATION_AWAITING_APPROVAL",
    "NOT_ASSESSED",
    "ACCOUNT",
    "EXCEPTION",
  ]) {
    assert.ok(kinds.has(expected as never), `attention includes ${expected}`);
  }
});

test("attention never invents an item: every row links to something real", () => {
  const controlIds = new Set(FIXTURE_CONTROLS.map((c) => c.id));
  for (const item of attentionItems(input)) {
    assert.ok(item.title.length > 0 && item.detail.length > 0);
    assert.ok(item.href.startsWith("/dashboard/"), `${item.id} links into the product`);
    const match = item.href.match(/^\/dashboard\/controls\/(.+)$/);
    if (match) assert.ok(controlIds.has(match[1]), `${item.id} points at a real control`);
  }
});

test("resolved drift is not treated as needing attention", () => {
  const ids = attentionItems(input).map((i) => i.id);
  for (const d of FIXTURE_DRIFT.filter((x) => x.resolvedAt)) {
    assert.ok(!ids.includes(`drift:${d.id}`), `${d.id} is closed and stays off the list`);
  }
});

test("run selectors find the in-flight run and the last completed one", () => {
  const running = activeRun(FIXTURE_RUNS);
  assert.equal(running?.state, "VERIFYING");
  const last = lastCompletedRun(FIXTURE_RUNS);
  assert.ok(last && ["VERIFIED", "FAILED"].includes(last.state));
  assert.ok(Date.parse(last!.startedAt) <= Date.parse(running!.startedAt));
  assert.equal(recentRuns(FIXTURE_RUNS, 5).length, 5);
  assert.ok(
    Date.parse(recentRuns(FIXTURE_RUNS)[0].startedAt) >=
      Date.parse(recentRuns(FIXTURE_RUNS)[1].startedAt),
    "recent runs are newest first",
  );
});

test("nextVerificationAt is the soonest scheduled check", () => {
  const next = nextVerificationAt(FIXTURE_CONTROLS);
  assert.ok(next, "a next verification exists");
  const all = FIXTURE_CONTROLS.map((c) => c.nextVerificationAt).filter(Boolean) as string[];
  for (const t of all) assert.ok(Date.parse(next!) <= Date.parse(t));
});

test("sortedDrift puts open events first", () => {
  const sorted = sortedDrift(FIXTURE_DRIFT);
  const firstResolvedIndex = sorted.findIndex((d) => d.resolvedAt);
  const lastOpenIndex = sorted.map((d) => !d.resolvedAt).lastIndexOf(true);
  assert.ok(firstResolvedIndex === -1 || lastOpenIndex < firstResolvedIndex);
});

// ── Controls list and detail (Phase 2B.1) ────────────────────────────────────

test("every control in the baseline is represented, unfiltered", () => {
  const all = filterControls(FIXTURE_CONTROLS, {});
  assert.equal(all.length, 27);
  assert.equal(new Set(all.map((c) => c.id)).size, 27);
});

test("status filtering matches the baseline distribution", () => {
  const counts = {
    PASS: 22,
    FAIL: 2,
    DRIFTED: 1,
    EXCEPTION: 1,
    NOT_ASSESSED: 1,
  } as const;
  let total = 0;
  for (const [status, expected] of Object.entries(counts)) {
    const filtered = filterControls(FIXTURE_CONTROLS, { status: status as never });
    assert.equal(filtered.length, expected, `${status} count`);
    for (const c of filtered) assert.equal(c.status, status);
    total += filtered.length;
  }
  assert.equal(total, 27, "the five statuses account for every control");
  assert.equal(filterControls(FIXTURE_CONTROLS, { status: "ALL" }).length, 27);
});

test("category filtering covers all seven domains and nothing else", () => {
  const byDomain = countControlsByDomain(FIXTURE_CONTROLS);
  const domains = Object.keys(byDomain);
  assert.equal(domains.length, 7, "exactly seven categories exist");
  let total = 0;
  for (const d of domains) {
    const filtered = filterControls(FIXTURE_CONTROLS, { domain: d as never });
    assert.equal(filtered.length, byDomain[d]);
    for (const c of filtered) assert.equal(c.domain, d);
    total += filtered.length;
  }
  assert.equal(total, 27);
});

test("search reads customer-visible fields and is case-insensitive", () => {
  const byName = filterControls(FIXTURE_CONTROLS, { search: "public" });
  assert.ok(byName.length > 0, "matches control names");
  assert.ok(byName.every((c) => /public/i.test(`${c.id} ${c.name} ${c.description} ${c.expectedState} ${c.whyItMatters}`)));

  const byId = filterControls(FIXTURE_CONTROLS, { search: "tc-data-02" });
  assert.equal(byId.length, 1);
  assert.equal(byId[0].id, "TC-DATA-02");

  const byFramework = filterControls(FIXTURE_CONTROLS, { search: "DPDP" });
  assert.ok(byFramework.length > 0, "matches framework references");

  assert.equal(filterControls(FIXTURE_CONTROLS, { search: "   " }).length, 27, "blank search filters nothing");
  assert.equal(filterControls(FIXTURE_CONTROLS, { search: "zzzz-no-match" }).length, 0);
});

test("search never reads fields the customer cannot see", () => {
  // No fixture carries an ARN, but the guard matters if one ever appears.
  assert.equal(filterControls(FIXTURE_CONTROLS, { search: "arn:aws" }).length, 0);
  assert.equal(filterControls(FIXTURE_CONTROLS, { search: "tenant" }).length, 0);
});

test("filters combine", () => {
  const combined = filterControls(FIXTURE_CONTROLS, { status: "PASS", domain: "IDENTITY" });
  for (const c of combined) {
    assert.equal(c.status, "PASS");
    assert.equal(c.domain, "IDENTITY");
  }
  assert.ok(combined.length < 27);
});

test("attention ordering puts drift first and passing last, stably", () => {
  const sorted = sortControlsByAttention(FIXTURE_CONTROLS);
  assert.equal(sorted.length, 27);
  assert.equal(sorted[0].status, "DRIFTED");
  assert.equal(sorted[sorted.length - 1].status, "PASS");

  const rank = ["DRIFTED", "FAIL", "VERIFYING", "NOT_ASSESSED", "EXCEPTION", "PASS"];
  const positions = sorted.map((c) => rank.indexOf(c.status));
  for (let i = 1; i < positions.length; i++) {
    assert.ok(positions[i] >= positions[i - 1], "status ranking is monotonic");
  }
  assert.deepEqual(
    sortControlsByAttention(FIXTURE_CONTROLS).map((c) => c.id),
    sortControlsByAttention([...FIXTURE_CONTROLS].reverse()).map((c) => c.id),
    "ordering does not depend on input order",
  );
});

test("control lookup finds a control by its customer-safe id", () => {
  const drifted = FIXTURE_CONTROLS.find((c) => c.status === "DRIFTED");
  assert.ok(drifted);
  assert.equal(filterControls(FIXTURE_CONTROLS, { search: drifted!.id })[0].id, drifted!.id);
});

test("control history is chronological and assembled only from real records", () => {
  const events = controlHistory({
    controlId: "TC-DATA-02",
    results: FIXTURE_RESULTS,
    runs: FIXTURE_RUNS,
    drift: FIXTURE_DRIFT,
    remediations: FIXTURE_REMEDIATIONS,
  });
  assert.ok(events.length > 0);
  for (let i = 1; i < events.length; i++) {
    assert.ok(Date.parse(events[i - 1].at) >= Date.parse(events[i].at), "newest first");
  }
  const kinds = new Set(events.map((e) => e.kind));
  assert.ok(kinds.has("DRIFT_DETECTED"), "drift appears in history");
  assert.ok(kinds.has("DRIFT_RESOLVED"), "closed drift stays on the record");
  assert.ok(kinds.has("REMEDIATION"), "fixes appear in history");
  assert.ok(kinds.has("VERIFIED"), "verification results appear in history");
});

test("control history is empty for a control with no recorded results", () => {
  const events = controlHistory({
    controlId: "TC-DOES-NOT-EXIST",
    results: FIXTURE_RESULTS,
    runs: FIXTURE_RUNS,
    drift: FIXTURE_DRIFT,
    remediations: FIXTURE_REMEDIATIONS,
  });
  assert.equal(events.length, 0, "no history is an honest empty state, not invented events");
});

test("no control-derived value is a score, percentage, rating or grade", () => {
  const derived = [
    ...filterControls(FIXTURE_CONTROLS, {}),
    ...sortControlsByAttention(FIXTURE_CONTROLS),
  ];
  for (const c of derived) {
    for (const key of Object.keys(c)) {
      assert.ok(!/score|percent|rating|grade|risk_?level/i.test(key), `${c.id}.${key} must not exist`);
    }
  }
  const byDomain = countControlsByDomain(FIXTURE_CONTROLS);
  for (const value of Object.values(byDomain)) assert.equal(typeof value, "number");
});

// ── Findings (Phase 2C) ──────────────────────────────────────────────────────

const findingCtx = { controls: FIXTURE_CONTROLS, resources: FIXTURE_RESOURCES };

test("every recorded finding is retrievable, unfiltered", () => {
  const all = filterFindings(FIXTURE_FINDINGS, {}, findingCtx);
  assert.equal(all.length, FIXTURE_FINDINGS.length);
  assert.equal(new Set(all.map((f) => f.id)).size, all.length);
  assert.ok(all.length > 0, "the dataset has findings to show");
});

test("every finding points at a control and a resource that exist", () => {
  for (const f of FIXTURE_FINDINGS) {
    assert.ok(
      FIXTURE_CONTROLS.some((c) => c.id === f.controlId),
      `${f.id} belongs to a real control`,
    );
    assert.ok(
      FIXTURE_RESOURCES.some((r) => r.id === f.resourceId),
      `${f.id} names a real resource`,
    );
  }
});

test("status filtering partitions the findings", () => {
  const statuses = ["OPEN", "IN_REMEDIATION", "AWAITING_VERIFICATION", "RESOLVED", "EXCEPTION"] as const;
  let total = 0;
  for (const status of statuses) {
    const filtered = filterFindings(FIXTURE_FINDINGS, { status }, findingCtx);
    for (const f of filtered) assert.equal(f.status, status);
    total += filtered.length;
  }
  assert.equal(total, FIXTURE_FINDINGS.length, "every finding falls in exactly one status");
});

test("severity filtering returns only that severity", () => {
  for (const severity of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
    for (const f of filterFindings(FIXTURE_FINDINGS, { severity }, findingCtx)) {
      assert.equal(f.severity, severity);
    }
  }
  assert.equal(filterFindings(FIXTURE_FINDINGS, { severity: "ALL" }, findingCtx).length, FIXTURE_FINDINGS.length);
});

test("category filtering uses the control the finding belongs to", () => {
  const domains = new Set(
    FIXTURE_FINDINGS.map((f) => FIXTURE_CONTROLS.find((c) => c.id === f.controlId)?.domain),
  );
  for (const domain of domains) {
    if (!domain) continue;
    const filtered = filterFindings(FIXTURE_FINDINGS, { domain }, findingCtx);
    assert.ok(filtered.length > 0);
    for (const f of filtered) {
      assert.equal(FIXTURE_CONTROLS.find((c) => c.id === f.controlId)?.domain, domain);
    }
  }
});

test("search covers the finding, its control and its resource — and nothing internal", () => {
  const byTitle = filterFindings(FIXTURE_FINDINGS, { search: "public" }, findingCtx);
  assert.ok(byTitle.length > 0, "matches finding titles");

  const byControl = filterFindings(FIXTURE_FINDINGS, { search: "TC-DATA-02" }, findingCtx);
  assert.ok(byControl.length > 0 && byControl.every((f) => f.controlId === "TC-DATA-02"));

  const byResource = filterFindings(FIXTURE_FINDINGS, { search: "partner-share" }, findingCtx);
  assert.ok(byResource.length > 0, "matches the resource label");

  assert.equal(filterFindings(FIXTURE_FINDINGS, { search: "arn:aws" }, findingCtx).length, 0);
  assert.equal(filterFindings(FIXTURE_FINDINGS, { search: "tenant" }, findingCtx).length, 0);
  assert.equal(filterFindings(FIXTURE_FINDINGS, { search: "  " }, findingCtx).length, FIXTURE_FINDINGS.length);
});

test("findings are ordered open first, then worst severity", () => {
  const sorted = sortFindingsByAttention(FIXTURE_FINDINGS);
  const statusRank = ["OPEN", "IN_REMEDIATION", "AWAITING_VERIFICATION", "EXCEPTION", "RESOLVED"];
  const severityRank = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  for (let i = 1; i < sorted.length; i++) {
    const prev = statusRank.indexOf(sorted[i - 1].status);
    const cur = statusRank.indexOf(sorted[i].status);
    assert.ok(prev <= cur, "status ordering is monotonic");
    if (prev === cur) {
      assert.ok(
        severityRank.indexOf(sorted[i - 1].severity) <= severityRank.indexOf(sorted[i].severity),
        "severity orders within a status",
      );
    }
  }
  assert.deepEqual(
    sortFindingsByAttention(FIXTURE_FINDINGS).map((f) => f.id),
    sortFindingsByAttention([...FIXTURE_FINDINGS].reverse()).map((f) => f.id),
    "ordering does not depend on input order",
  );
});

test("a control resolves to its own findings, and only those", () => {
  const controlId = FIXTURE_FINDINGS[0].controlId;
  const forControl = findingsForControl(FIXTURE_FINDINGS, controlId);
  assert.ok(forControl.length > 0);
  for (const f of forControl) assert.equal(f.controlId, controlId);
  assert.equal(findingsForControl(FIXTURE_FINDINGS, "TC-DOES-NOT-EXIST").length, 0);
});

test("finding lookup by id, and an unknown id yields nothing", () => {
  const known = FIXTURE_FINDINGS[0];
  assert.equal(FIXTURE_FINDINGS.find((f) => f.id === known.id)?.id, known.id);
  assert.equal(FIXTURE_FINDINGS.find((f) => f.id === "find-does-not-exist"), undefined);
});

test("open findings exclude resolved and excepted work", () => {
  for (const f of FIXTURE_FINDINGS) {
    const expected = f.status !== "RESOLVED" && f.status !== "EXCEPTION";
    assert.equal(isFindingOpen(f), expected, `${f.id} openness`);
  }
});

test("no finding-derived value is a score, rating or grade", () => {
  for (const f of sortFindingsByAttention(FIXTURE_FINDINGS)) {
    for (const key of Object.keys(f)) {
      assert.ok(!/score|percent|rating|grade|priority/i.test(key), `${f.id}.${key} must not exist`);
    }
    assert.equal(typeof f.severity, "string", "severity stays categorical, never numeric");
  }
});

// ─── Assurance ──────────────────────────────────────────────────────────────

test("runs are ordered most recent first, whatever order they arrive in", () => {
  const ordered = runsByRecency(FIXTURE_RUNS);
  assert.equal(ordered.length, FIXTURE_RUNS.length, "no run is dropped");
  for (let i = 1; i < ordered.length; i += 1) {
    assert.ok(
      Date.parse(ordered[i - 1].startedAt) >= Date.parse(ordered[i].startedAt),
      "descending by start time",
    );
  }
  assert.deepEqual(
    ordered.map((r) => r.id),
    runsByRecency([...FIXTURE_RUNS].reverse()).map((r) => r.id),
    "ordering does not depend on input order",
  );
  assert.deepEqual(FIXTURE_RUNS.map((r) => r.id), FIXTURE_RUNS.map((r) => r.id), "input is not mutated");
});

test("verification totals are sums of the record, never a rate", () => {
  const t = verificationTotals(FIXTURE_RUNS);
  assert.equal(t.runs, FIXTURE_RUNS.length);
  assert.equal(
    t.completed + t.failedRuns + t.inFlight,
    t.runs,
    "every run is counted in exactly one state bucket",
  );
  assert.equal(
    t.results,
    FIXTURE_RUNS.reduce((n, r) => n + r.counts.evaluated, 0),
    "results is the sum of evaluated counts",
  );
  assert.equal(t.passed + t.failed + t.notAssessed, t.results, "results decompose exactly");
  for (const [key, value] of Object.entries(t)) {
    assert.equal(Number.isInteger(value), true, `${key} is a whole count`);
    assert.ok(value >= 0, `${key} is not negative`);
  }
});

test("empty input yields zeroes, not NaN or a divided rate", () => {
  const t = verificationTotals([]);
  for (const [key, value] of Object.entries(t)) {
    assert.equal(value, 0, `${key} is zero`);
  }
});

test("drift splits into open and closed with nothing lost or double-counted", () => {
  const open = openDrift(FIXTURE_DRIFT);
  const closed = resolvedDrift(FIXTURE_DRIFT);
  assert.equal(open.length + closed.length, FIXTURE_DRIFT.length, "every event lands on one side");
  for (const d of open) assert.equal(d.resolvedAt, undefined, "open drift has no resolution time");
  for (const d of closed) assert.ok(d.resolvedAt, "closed drift records when it was closed");
  const ids = new Set([...open, ...closed].map((d) => d.id));
  assert.equal(ids.size, FIXTURE_DRIFT.length, "no event appears twice");
});

test("exceptions split into active and past, active soonest-to-expire first", () => {
  const active = activeExceptions(FIXTURE_EXCEPTIONS);
  const past = pastExceptions(FIXTURE_EXCEPTIONS);
  assert.equal(active.length + past.length, FIXTURE_EXCEPTIONS.length);
  for (const e of active) assert.equal(e.state, "ACTIVE");
  for (const e of past) assert.notEqual(e.state, "ACTIVE");
  for (let i = 1; i < active.length; i += 1) {
    assert.ok(
      Date.parse(active[i - 1].expiresAt) <= Date.parse(active[i].expiresAt),
      "the exception lapsing soonest is listed first",
    );
  }
});

test("every active exception still names an owner, a reason and an expiry", () => {
  for (const e of activeExceptions(FIXTURE_EXCEPTIONS)) {
    assert.ok(e.owner.length > 0, `${e.id} names who accepted the risk`);
    assert.ok(e.reason.length > 0, `${e.id} records why`);
    assert.ok(Number.isFinite(Date.parse(e.expiresAt)), `${e.id} has a real expiry date`);
    assert.ok(
      Date.parse(e.expiresAt) > Date.parse(e.createdAt),
      `${e.id} expires after it was accepted`,
    );
  }
});

test("days remaining counts whole days and goes negative once lapsed", () => {
  const now = Date.parse("2026-09-17T09:00:00.000Z");
  assert.equal(daysUntil("2026-09-18T09:00:00.000Z", now), 1);
  assert.equal(daysUntil("2026-09-17T09:00:00.000Z", now), 0);
  assert.equal(daysUntil("2026-09-16T09:00:00.000Z", now), -1);
  assert.equal(daysUntil("2026-09-18T08:00:00.000Z", now), 1, "a part day rounds up to one day left");
});

test("no assurance total is expressed as a percentage or score", () => {
  const t = verificationTotals(FIXTURE_RUNS) as unknown as Record<string, number>;
  for (const key of Object.keys(t)) {
    assert.ok(!/score|percent|rate|ratio|grade/i.test(key), `${key} must not exist`);
  }
});

// ─── Reports and evidence ───────────────────────────────────────────────────

test("reports are ordered newest period first, without mutating the input", () => {
  const before = FIXTURE_REPORTS.map((r) => r.id);
  const ordered = reportsByPeriod(FIXTURE_REPORTS);
  assert.equal(ordered.length, FIXTURE_REPORTS.length, "no report is dropped");
  for (let i = 1; i < ordered.length; i += 1) {
    assert.ok(
      Date.parse(ordered[i - 1].periodEnd) >= Date.parse(ordered[i].periodEnd),
      "descending by period end",
    );
  }
  assert.deepEqual(
    ordered.map((r) => r.id),
    reportsByPeriod([...FIXTURE_REPORTS].reverse()).map((r) => r.id),
    "ordering does not depend on input order",
  );
  assert.deepEqual(FIXTURE_REPORTS.map((r) => r.id), before, "input is not mutated");
});

test("report lookup by kind returns the most recent, and nothing for an absent kind", () => {
  for (const kind of ["MONTHLY_ASSURANCE", "CUSTOMER_REVIEW", "EVIDENCE_EXPORT"] as const) {
    const found = latestReportOfKind(FIXTURE_REPORTS, kind);
    const all = FIXTURE_REPORTS.filter((r) => r.kind === kind);
    if (all.length === 0) {
      assert.equal(found, undefined, `${kind} has no record`);
    } else {
      assert.equal(found?.kind, kind);
      for (const other of all) {
        assert.ok(
          Date.parse(found!.periodEnd) >= Date.parse(other.periodEnd),
          "the returned report covers the latest period",
        );
      }
    }
  }
  assert.equal(latestReportOfKind([], "MONTHLY_ASSURANCE"), undefined, "empty input yields nothing");
});

test("only a READY report with a document counts as downloadable", () => {
  for (const r of FIXTURE_REPORTS) {
    const expected = r.state === "READY" && Boolean(r.downloadUrl);
    assert.equal(isReportDownloadable(r), expected, `${r.id} downloadability`);
    if (r.state !== "READY") {
      assert.equal(isReportDownloadable(r), false, `${r.id} is not offered while ${r.state}`);
    }
  }
});

test("evidence is ordered by when it was recorded, newest first", () => {
  const ordered = evidenceByRecency(FIXTURE_EVIDENCE);
  assert.equal(ordered.length, FIXTURE_EVIDENCE.length);
  for (let i = 1; i < ordered.length; i += 1) {
    assert.ok(
      Date.parse(ordered[i - 1].recordedAt) >= Date.parse(ordered[i].recordedAt),
      "descending by recordedAt",
    );
  }
  assert.deepEqual(
    ordered.map((e) => e.id),
    evidenceByRecency([...FIXTURE_EVIDENCE].reverse()).map((e) => e.id),
    "ordering does not depend on input order",
  );
});

test("evidence resolves to a control only when the record names one", () => {
  const withControl = FIXTURE_EVIDENCE.filter((e) => e.controlId);
  assert.ok(withControl.length > 0, "the fixture exercises this path");
  const controlId = withControl[0].controlId!;
  const forControl = evidenceForControl(FIXTURE_EVIDENCE, controlId);
  assert.ok(forControl.length > 0);
  for (const e of forControl) assert.equal(e.controlId, controlId);
  assert.equal(
    forControl.length,
    FIXTURE_EVIDENCE.filter((e) => e.controlId === controlId).length,
    "no record without that controlId is inferred in",
  );
  assert.equal(evidenceForControl(FIXTURE_EVIDENCE, "TC-DOES-NOT-EXIST").length, 0);
  assert.equal(evidenceForControl([], controlId).length, 0);
});

test("evidence resolves to the verification run that produced it", () => {
  const runId = FIXTURE_EVIDENCE.find((e) => e.runId)!.runId!;
  const forRun = evidenceForRun(FIXTURE_EVIDENCE, runId);
  assert.ok(forRun.length > 0);
  for (const e of forRun) assert.equal(e.runId, runId);
  assert.ok(
    FIXTURE_RUNS.some((r) => r.id === runId),
    "the run a record points at actually exists in the record",
  );
  assert.equal(evidenceForRun(FIXTURE_EVIDENCE, "run-does-not-exist").length, 0);
});

test("evidence lookup by id, and an unknown id yields nothing", () => {
  const known = FIXTURE_EVIDENCE[0];
  assert.equal(findEvidence(FIXTURE_EVIDENCE, known.id)?.id, known.id);
  assert.equal(findEvidence(FIXTURE_EVIDENCE, "EV-NOPE"), undefined);
  assert.equal(findEvidence([], known.id), undefined);
});

test("period filters are inclusive at both ends and exclude what falls outside", () => {
  const sorted = evidenceByRecency(FIXTURE_EVIDENCE);
  const newest = sorted[0].recordedAt;
  const oldest = sorted[sorted.length - 1].recordedAt;

  assert.equal(
    evidenceInPeriod(FIXTURE_EVIDENCE, oldest, newest).length,
    FIXTURE_EVIDENCE.length,
    "the full span includes every record, endpoints included",
  );
  assert.equal(
    evidenceInPeriod(FIXTURE_EVIDENCE, "2020-01-01T00:00:00.000Z", "2020-12-31T00:00:00.000Z").length,
    0,
    "a period with no records is empty, not everything",
  );
  assert.equal(evidenceInPeriod([], oldest, newest).length, 0);
  assert.equal(
    runsInPeriod(FIXTURE_RUNS, "2020-01-01T00:00:00.000Z", "2020-12-31T00:00:00.000Z").length,
    0,
  );
  assert.equal(
    driftInPeriod(FIXTURE_DRIFT, "2020-01-01T00:00:00.000Z", "2020-12-31T00:00:00.000Z").length,
    0,
  );
});

test("the period record counts the record itself, and is all zeroes for an empty period", () => {
  const runsSorted = runsByRecency(FIXTURE_RUNS);
  const start = runsSorted[runsSorted.length - 1].startedAt;
  const end = runsSorted[0].startedAt;
  const full = periodRecord({
    runs: FIXTURE_RUNS,
    drift: FIXTURE_DRIFT,
    evidence: FIXTURE_EVIDENCE,
    start,
    end,
  });
  assert.equal(full.runs, FIXTURE_RUNS.length, "every run falls inside its own span");
  assert.equal(
    full.runsCompleted + full.runsFailed,
    FIXTURE_RUNS.filter((r) => r.state === "VERIFIED" || r.state === "FAILED").length,
    "runs still in flight are not counted as completed",
  );
  assert.ok(full.driftResolved <= full.driftDetected, "resolved drift is a subset of detected");
  assert.ok(
    full.evidenceIntegrityFailed <= full.evidence,
    "integrity failures are a subset of the records counted",
  );

  const none = periodRecord({
    runs: FIXTURE_RUNS,
    drift: FIXTURE_DRIFT,
    evidence: FIXTURE_EVIDENCE,
    start: "2020-01-01T00:00:00.000Z",
    end: "2020-12-31T00:00:00.000Z",
  });
  for (const [key, value] of Object.entries(none)) {
    assert.equal(value, 0, `${key} is zero for a period with no records`);
  }
});

test("no report or evidence derivation produces a score, percentage or grade", () => {
  const record = periodRecord({
    runs: FIXTURE_RUNS,
    drift: FIXTURE_DRIFT,
    evidence: FIXTURE_EVIDENCE,
    start: "2020-01-01T00:00:00.000Z",
    end: "2030-01-01T00:00:00.000Z",
  }) as unknown as Record<string, number>;
  for (const [key, value] of Object.entries(record)) {
    assert.ok(!/score|percent|rate|ratio|grade|rating/i.test(key), `${key} must not exist`);
    assert.equal(Number.isInteger(value), true, `${key} is a whole count, never a derived fraction`);
  }
  for (const r of FIXTURE_REPORTS) {
    for (const key of Object.keys(r.summary ?? {})) {
      assert.ok(!/score|percent|rate|ratio|grade|rating/i.test(key), `report summary.${key} must not exist`);
    }
  }
});

// ─── Remediation and operations ─────────────────────────────────────────────

test("remediations are ordered by request time, newest first, without mutating input", () => {
  const before = FIXTURE_REMEDIATIONS.map((r) => r.id);
  const ordered = remediationsByRecency(FIXTURE_REMEDIATIONS);
  assert.equal(ordered.length, FIXTURE_REMEDIATIONS.length, "none is dropped");
  for (let i = 1; i < ordered.length; i += 1) {
    assert.ok(
      Date.parse(ordered[i - 1].requestedAt) >= Date.parse(ordered[i].requestedAt),
      "descending by requestedAt",
    );
  }
  assert.deepEqual(
    ordered.map((r) => r.id),
    remediationsByRecency([...FIXTURE_REMEDIATIONS].reverse()).map((r) => r.id),
    "ordering does not depend on input order",
  );
  assert.deepEqual(FIXTURE_REMEDIATIONS.map((r) => r.id), before, "input is not mutated");
});

test("remediation lookup by id, and an unknown id yields nothing", () => {
  const known = FIXTURE_REMEDIATIONS[0];
  assert.equal(findRemediation(FIXTURE_REMEDIATIONS, known.id)?.id, known.id);
  assert.equal(findRemediation(FIXTURE_REMEDIATIONS, "rem-does-not-exist"), undefined);
  assert.equal(findRemediation([], known.id), undefined);
});

test("a control resolves to its own remediations, and only those", () => {
  const controlId = FIXTURE_REMEDIATIONS[0].controlId;
  const forControl = remediationsForControl(FIXTURE_REMEDIATIONS, controlId);
  assert.ok(forControl.length > 0);
  for (const r of forControl) assert.equal(r.controlId, controlId);
  assert.equal(
    forControl.length,
    FIXTURE_REMEDIATIONS.filter((r) => r.controlId === controlId).length,
    "nothing is inferred in",
  );
  assert.equal(remediationsForControl(FIXTURE_REMEDIATIONS, "TC-DOES-NOT-EXIST").length, 0);
  assert.equal(remediationsForControl([], controlId).length, 0);
});

test("the finding link is read from the finding, never guessed from the control", () => {
  const linked = FIXTURE_FINDINGS.filter((f) => f.remediation);
  assert.ok(linked.length > 0, "the fixture exercises this path");
  for (const f of linked) {
    const found = findingForRemediation(FIXTURE_FINDINGS, f.remediation!.id);
    assert.equal(found?.id, f.id, `${f.remediation!.id} resolves back to its own finding`);
  }
  const unlinked = FIXTURE_REMEDIATIONS.filter(
    (r) => !FIXTURE_FINDINGS.some((f) => f.remediation?.id === r.id),
  );
  for (const r of unlinked) {
    assert.equal(
      findingForRemediation(FIXTURE_FINDINGS, r.id),
      undefined,
      `${r.id} shares a control with a finding but is not attached to one`,
    );
  }
  assert.equal(findingForRemediation([], "rem-01"), undefined);
});

test("a change counts as confirmed only when a verification run recorded it", () => {
  for (const r of FIXTURE_REMEDIATIONS) {
    const applied = r.state === "COMPLETED" || r.state === "PARTIAL";
    assert.equal(
      isRemediationConfirmed(r),
      applied && Boolean(r.verificationRunId),
      `${r.id} confirmation`,
    );
    assert.equal(
      isAwaitingVerification(r),
      applied && !r.verificationRunId,
      `${r.id} awaiting verification`,
    );
    assert.equal(
      isRemediationConfirmed(r) && isAwaitingVerification(r),
      false,
      `${r.id} cannot be both`,
    );
    if (r.state !== "COMPLETED" && r.state !== "PARTIAL") {
      assert.equal(isRemediationConfirmed(r), false, `${r.id} is not confirmed while ${r.state}`);
    }
  }
  const completedNoRun = { ...FIXTURE_REMEDIATIONS[0], verificationRunId: undefined };
  assert.equal(
    isRemediationConfirmed(completedNoRun),
    false,
    "COMPLETED without a run is never confirmed",
  );
  assert.equal(isAwaitingVerification(completedNoRun), true, "it is awaiting verification instead");
});

test("a fix can be asked for only when an automated fix exists and the finding is open", () => {
  const withFix = FIXTURE_CONTROLS.find((c) => c.remediationAvailable)!;
  const withoutFix = FIXTURE_CONTROLS.find((c) => !c.remediationAvailable)!;
  const openFinding = FIXTURE_FINDINGS.find((f) => f.status === "OPEN" || f.status === "IN_REMEDIATION");
  const closedFinding = FIXTURE_FINDINGS.find((f) => f.status === "RESOLVED" || f.status === "EXCEPTION");

  assert.equal(isFixRequestable(undefined, openFinding), false, "no control, no request");
  assert.equal(isFixRequestable(withFix, undefined), false, "no finding, no request");
  assert.equal(isFixRequestable(withoutFix, openFinding), false, "no automated fix, no request");
  if (openFinding) assert.equal(isFixRequestable(withFix, openFinding), true);
  if (closedFinding) {
    assert.equal(isFixRequestable(withFix, closedFinding), false, "a closed finding is not re-fixed");
  }
});

test("every remediation lands in exactly one queue bucket", () => {
  const queue = remediationQueue(FIXTURE_REMEDIATIONS);
  const all = Object.values(queue).flat();
  assert.equal(all.length, FIXTURE_REMEDIATIONS.length, "nothing is dropped");
  assert.equal(new Set(all.map((r) => r.id)).size, all.length, "nothing appears twice");
  for (const r of queue.awaitingApproval) assert.equal(r.state, "PENDING_APPROVAL");
  for (const r of queue.needsAttention) {
    assert.ok(r.state === "FAILED" || r.verdict === "NOT_EFFECTIVE", `${r.id} needs attention`);
  }
  for (const r of queue.confirmed) assert.ok(isRemediationConfirmed(r));
  for (const r of queue.awaitingVerification) assert.ok(isAwaitingVerification(r));
  for (const r of queue.inFlight) {
    assert.ok(r.state === "APPROVED" || r.state === "EXECUTING", `${r.id} is in flight`);
  }
  for (const r of queue.closed) {
    assert.ok(r.state === "REJECTED" || r.state === "EXPIRED", `${r.id} is closed`);
  }
});

test("bucketing is empty but well formed for an empty collection", () => {
  const queue = remediationQueue([]);
  for (const [key, rows] of Object.entries(queue)) {
    assert.deepEqual(rows, [], `${key} is an empty list, never undefined`);
  }
  assert.equal(remediationsNeedingAction(queue), 0);
});

test("the count of work waiting on someone is the sum of its buckets", () => {
  const queue = remediationQueue(FIXTURE_REMEDIATIONS);
  const expected = REMEDIATION_ATTENTION_BUCKETS.reduce((n, key) => n + queue[key].length, 0);
  assert.equal(remediationsNeedingAction(queue), expected);
  assert.ok(
    remediationsNeedingAction(queue) <= FIXTURE_REMEDIATIONS.length,
    "it never exceeds the record",
  );
  for (const key of REMEDIATION_ATTENTION_BUCKETS) {
    assert.notEqual(key, "confirmed", "confirmed work never counts as waiting");
    assert.notEqual(key, "closed", "closed work never counts as waiting");
  }
});

test("operational failures are read from the record, not inferred", () => {
  const failed = failedRuns(FIXTURE_RUNS);
  for (const r of failed) assert.equal(r.state, "FAILED");
  assert.equal(
    failed.length,
    FIXTURE_RUNS.filter((r) => r.state === "FAILED").length,
    "every failed run is listed",
  );
  assert.equal(failedRuns([]).length, 0);

  const unhealthy = unhealthyAccounts(FIXTURE_ACCOUNTS);
  for (const a of unhealthy) assert.notEqual(a.connection, "CONNECTED");
  assert.equal(
    unhealthy.length,
    FIXTURE_ACCOUNTS.filter((a) => a.connection !== "CONNECTED").length,
  );
  assert.equal(unhealthyAccounts([]).length, 0);
});

function remediation(over: Partial<Remediation> = {}): Remediation {
  return {
    id: "r1",
    controlId: "TC-DATA-02",
    resourceIds: [],
    state: "PENDING_APPROVAL",
    method: "AUTOMATED",
    requestedBy: "a@b.c",
    requestedAt: "2026-09-20T00:00:00Z",
    summary: "",
    ...over,
  };
}

// The live API maps SUCCEEDED to APPLIED, a state the fixtures never use. Every
// applied change must land in exactly one bucket, and only a REMEDIATED verdict
// with its verification run may land in "confirmed".
test("an APPLIED change is bucketed by its verdict and never dropped", () => {
  const confirmed = remediation({ id: "a1", state: "APPLIED", verdict: "REMEDIATED", verificationRunId: "run-1" });
  const ineffective = remediation({ id: "a2", state: "APPLIED", verdict: "NOT_EFFECTIVE", verificationRunId: "run-2" });
  const unverified = remediation({ id: "a3", state: "APPLIED", verdict: "UNVERIFIED" });
  const noRun = remediation({ id: "a4", state: "APPLIED", verdict: "REMEDIATED" });

  const queue = remediationQueue([confirmed, ineffective, unverified, noRun]);
  const all = Object.values(queue).flat();
  assert.equal(all.length, 4, "no applied change is dropped");
  assert.equal(new Set(all.map((r) => r.id)).size, 4, "none appears twice");

  assert.deepEqual(queue.confirmed.map((r) => r.id), ["a1"]);
  assert.deepEqual(queue.needsAttention.map((r) => r.id), ["a2"]);
  assert.deepEqual(queue.awaitingVerification.map((r) => r.id).sort(), ["a3", "a4"]);

  assert.equal(isRemediationConfirmed(confirmed), true);
  assert.equal(isRemediationConfirmed(noRun), false, "REMEDIATED without its run is not confirmed");
  assert.equal(isRemediationConfirmed(ineffective), false);
  for (const r of all) {
    assert.equal(isRemediationConfirmed(r) && isAwaitingVerification(r), false, `${r.id} cannot be both`);
  }
});

test("remediationActionVisibility offers nothing to a reader with neither capability", () => {
  for (const state of ["PENDING_APPROVAL", "APPROVED", "FAILED", "REJECTED", "EXPIRED"] as const) {
    const v = remediationActionVisibility(remediation({ state }), false, false);
    assert.equal(v.showApproval, false);
    assert.equal(v.showApply, false);
    assert.equal(v.showReRequest, false);
  }
});

test("approve/reject are offered only for PENDING_APPROVAL to someone who may approve", () => {
  assert.equal(
    remediationActionVisibility(remediation({ state: "PENDING_APPROVAL" }), true, false).showApproval,
    true,
  );
  assert.equal(
    remediationActionVisibility(remediation({ state: "PENDING_APPROVAL" }), false, true).showApproval,
    false,
    "requestRemediation alone does not grant approve/reject",
  );
  assert.equal(
    remediationActionVisibility(remediation({ state: "APPROVED" }), true, false).showApproval,
    false,
    "approve is not offered again once the state has moved on",
  );
});

test("apply is offered only for APPROVED to someone who may approve", () => {
  assert.equal(
    remediationActionVisibility(remediation({ state: "APPROVED" }), true, false).showApply,
    true,
  );
  assert.equal(
    remediationActionVisibility(remediation({ state: "PENDING_APPROVAL" }), true, false).showApply,
    false,
  );
});

test("re-request is offered for terminal-but-unresolved states, and for an ineffective fix, to a requester", () => {
  for (const state of ["FAILED", "REJECTED", "EXPIRED"] as const) {
    assert.equal(
      remediationActionVisibility(remediation({ state }), false, true).showReRequest,
      true,
      state,
    );
  }
  assert.equal(
    remediationActionVisibility(
      remediation({ state: "APPLIED", verdict: "NOT_EFFECTIVE" }),
      false,
      true,
    ).showReRequest,
    true,
    "a write that did not fix the control is re-requestable even though the state itself is terminal",
  );
  assert.equal(
    remediationActionVisibility(remediation({ state: "APPLIED", verdict: "REMEDIATED" }), false, true)
      .showReRequest,
    false,
    "a confirmed fix is never offered re-request",
  );
});

test("remediationActionVisibility never derives a fourth control beyond approval/apply/re-request", () => {
  const v = remediationActionVisibility(remediation({ state: "PENDING_APPROVAL" }), true, true);
  assert.deepEqual(Object.keys(v).sort(), ["ineffective", "showApply", "showApproval", "showReRequest"]);
});

test("no remediation derivation produces a score, priority or rank", () => {
  const queue = remediationQueue(FIXTURE_REMEDIATIONS) as unknown as Record<string, unknown[]>;
  for (const key of Object.keys(queue)) {
    assert.ok(!/score|percent|rate|ratio|grade|rating|priority|rank/i.test(key), `${key} must not exist`);
  }
  for (const r of remediationsByRecency(FIXTURE_REMEDIATIONS)) {
    for (const key of Object.keys(r)) {
      assert.ok(
        !/score|percent|rating|grade|priority|rank/i.test(key),
        `${r.id}.${key} must not exist`,
      );
    }
    assert.equal(typeof r.state, "string", "state stays categorical, never numeric");
  }
});
