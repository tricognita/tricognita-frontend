/**
 * Fixture invariants — FRONTEND_FIXTURE_MODEL.md §3.
 *
 * The fixtures are a contract, not decoration: four engineers build screens
 * against them in parallel. A dataset that contradicts itself produces screens
 * that cannot exist, so every reference and every count is checked here.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  FIXTURE_ACCOUNTS,
  FIXTURE_ALERT_ROUTES,
  FIXTURE_CONTROLS,
  FIXTURE_DRIFT,
  FIXTURE_EVIDENCE,
  FIXTURE_EXCEPTIONS,
  FIXTURE_FINDINGS,
  FIXTURE_NOW,
  FIXTURE_REMEDIATIONS,
  FIXTURE_REPORTS,
  FIXTURE_RESOURCES,
  FIXTURE_RESULTS,
  FIXTURE_RUNS,
  FIXTURE_USERS,
  LATEST_RUN_ID,
} from "./index";

const NOW = Date.parse(FIXTURE_NOW);
const controlIds = new Set(FIXTURE_CONTROLS.map((c) => c.id));
const resourceIds = new Set(FIXTURE_RESOURCES.map((r) => r.id));
const runIds = new Set(FIXTURE_RUNS.map((r) => r.id));
const evidenceIds = new Set(FIXTURE_EVIDENCE.map((e) => e.id));
const accountIds = new Set(FIXTURE_ACCOUNTS.map((a) => a.id));
const latest = FIXTURE_RESULTS.filter((r) => r.runId === LATEST_RUN_ID);

test("anchor: the dataset is anchored to the fixed September 2026 timestamp", () => {
  assert.equal(FIXTURE_NOW, "2026-09-17T09:00:00.000Z");
});

test("catalogue: 27 controls with unique ids", () => {
  assert.equal(FIXTURE_CONTROLS.length, 27);
  assert.equal(controlIds.size, 27);
});

test("1. control counts match the results behind them", () => {
  for (const c of FIXTURE_CONTROLS) {
    const rs = latest.filter((r) => r.controlId === c.id);
    assert.equal(c.resourcesInScope, rs.length, `${c.id} resourcesInScope`);
    assert.equal(
      c.resourcesFailing,
      rs.filter((r) => r.status === "FAIL").length,
      `${c.id} resourcesFailing`,
    );
    assert.ok(rs.length > 0, `${c.id} has at least one result`);
  }
});

test("2. every reference resolves", () => {
  for (const r of FIXTURE_RESULTS) {
    assert.ok(controlIds.has(r.controlId), `result ${r.id} control`);
    assert.ok(resourceIds.has(r.resourceId), `result ${r.id} resource`);
    assert.ok(runIds.has(r.runId), `result ${r.id} run`);
  }
  for (const f of FIXTURE_FINDINGS) {
    assert.ok(controlIds.has(f.controlId) && resourceIds.has(f.resourceId), `finding ${f.id}`);
  }
  for (const m of FIXTURE_REMEDIATIONS) {
    assert.ok(controlIds.has(m.controlId), `remediation ${m.id} control`);
    m.resourceIds.forEach((id) => assert.ok(resourceIds.has(id), `remediation ${m.id} resource`));
    if (m.verificationRunId) assert.ok(runIds.has(m.verificationRunId), `remediation ${m.id} run`);
  }
  for (const d of FIXTURE_DRIFT) {
    assert.ok(controlIds.has(d.controlId) && resourceIds.has(d.resourceId), `drift ${d.id}`);
    assert.ok(runIds.has(d.detectedByRunId), `drift ${d.id} detecting run`);
    if (d.resolvedByRunId) assert.ok(runIds.has(d.resolvedByRunId), `drift ${d.id} resolving run`);
    if (d.remediationId) {
      assert.ok(FIXTURE_REMEDIATIONS.some((m) => m.id === d.remediationId), `drift ${d.id} remediation`);
    }
  }
  for (const e of FIXTURE_EVIDENCE) {
    if (e.controlId) assert.ok(controlIds.has(e.controlId), `evidence ${e.id} control`);
    if (e.runId) assert.ok(runIds.has(e.runId), `evidence ${e.id} run`);
  }
  for (const c of FIXTURE_CONTROLS) {
    c.evidenceRefs.forEach((id) => assert.ok(evidenceIds.has(id), `${c.id} evidence ref ${id}`));
  }
  for (const r of FIXTURE_RESOURCES) {
    assert.ok(accountIds.has(r.accountId), `resource ${r.id} account`);
  }
});

test("3. every finding sits on a control failing for that resource", () => {
  for (const f of FIXTURE_FINDINGS) {
    const result = latest.find((r) => r.controlId === f.controlId && r.resourceId === f.resourceId);
    assert.ok(result, `finding ${f.id} has a latest result`);
    assert.equal(result?.status, "FAIL", `finding ${f.id} result is FAIL`);
  }
});

test("4. an excepted control has one active exception and no open finding", () => {
  for (const c of FIXTURE_CONTROLS.filter((x) => x.status === "EXCEPTION")) {
    const active = FIXTURE_EXCEPTIONS.filter((e) => e.controlId === c.id && e.state === "ACTIVE");
    assert.equal(active.length, 1, `${c.id} active exceptions`);
    assert.equal(
      FIXTURE_FINDINGS.filter((f) => f.controlId === c.id && f.status === "OPEN").length,
      0,
      `${c.id} has no open finding`,
    );
    assert.ok(c.exception, `${c.id} carries an exception reference`);
  }
});

test("5. drift always regresses from a run that passed, and resolution is verified", () => {
  const order = FIXTURE_RUNS.map((r) => r.id);
  for (const d of FIXTURE_DRIFT) {
    assert.equal(d.previousStatus, "PASS");
    assert.equal(d.currentStatus, "FAIL");

    const detectedIdx = order.indexOf(d.detectedByRunId);
    const passedEarlier = FIXTURE_RESULTS.some(
      (r) =>
        r.controlId === d.controlId &&
        r.resourceId === d.resourceId &&
        r.status === "PASS" &&
        order.indexOf(r.runId) < detectedIdx,
    );
    assert.ok(passedEarlier, `drift ${d.id} has an earlier passing run`);

    if (d.resolvedAt) {
      assert.ok(d.resolvedByRunId, `drift ${d.id} names the resolving run`);
      const resolving = FIXTURE_RESULTS.find(
        (r) =>
          r.runId === d.resolvedByRunId && r.controlId === d.controlId && r.resourceId === d.resourceId,
      );
      assert.equal(resolving?.status, "PASS", `drift ${d.id} resolved by a passing result`);
      assert.ok(order.indexOf(d.resolvedByRunId!) > detectedIdx, `drift ${d.id} resolved after detection`);
    }
  }
});

test("6. a completed remediation is confirmed by a verification run", () => {
  for (const m of FIXTURE_REMEDIATIONS.filter((x) => x.state === "COMPLETED")) {
    assert.ok(m.verificationRunId, `${m.id} names a verification run`);
    const run = FIXTURE_RUNS.find((r) => r.id === m.verificationRunId);
    assert.equal(run?.state, "VERIFIED", `${m.id} run is verified`);
    assert.equal(m.outcome?.length, m.resourceIds.length, `${m.id} outcome covers every resource`);
    assert.ok(m.completedAt, `${m.id} has a completion time`);
  }
});

test("7. a failed remediation leaves the control failing and the finding open", () => {
  for (const m of FIXTURE_REMEDIATIONS.filter((x) => x.state === "FAILED")) {
    const control = FIXTURE_CONTROLS.find((c) => c.id === m.controlId);
    assert.ok(control && ["FAIL", "DRIFTED"].includes(control.status), `${m.id} control still failing`);
    const finding = FIXTURE_FINDINGS.find((f) => f.remediation?.id === m.id);
    assert.ok(finding && finding.status !== "RESOLVED", `${m.id} finding still open`);
  }
});

test("8. run counts equal the results attributed to that run", () => {
  for (const run of FIXTURE_RUNS) {
    const rs = FIXTURE_RESULTS.filter((r) => r.runId === run.id);
    assert.equal(run.counts.evaluated, rs.length, `${run.id} evaluated`);
    assert.equal(
      run.counts.passed + run.counts.failed + run.counts.notAssessed,
      run.counts.evaluated,
      `${run.id} counts add up`,
    );
  }
});

test("9. timestamps are ordered and never in the future", () => {
  const notFuture = (iso: string | undefined, label: string) => {
    if (!iso) return;
    assert.ok(Date.parse(iso) <= NOW, `${label} is not in the future`);
  };
  for (const run of FIXTURE_RUNS) {
    notFuture(run.startedAt, `run ${run.id} start`);
    notFuture(run.finishedAt, `run ${run.id} finish`);
    if (run.finishedAt) assert.ok(Date.parse(run.finishedAt) >= Date.parse(run.startedAt));
  }
  for (const m of FIXTURE_REMEDIATIONS) {
    const chain = [m.requestedAt, m.approvedAt, m.executedAt, m.completedAt].filter(Boolean) as string[];
    for (let i = 1; i < chain.length; i++) {
      assert.ok(Date.parse(chain[i]) >= Date.parse(chain[i - 1]), `${m.id} chain ordered`);
    }
    notFuture(m.completedAt, `${m.id} completion`);
  }
  for (const f of FIXTURE_FINDINGS) {
    assert.ok(Date.parse(f.lastSeenAt) >= Date.parse(f.firstSeenAt), `${f.id} seen range`);
  }
  for (const e of FIXTURE_EXCEPTIONS) {
    assert.ok(Date.parse(e.expiresAt) > Date.parse(e.createdAt), `${e.id} expiry after creation`);
    const days = (Date.parse(e.expiresAt) - Date.parse(e.createdAt)) / 86_400_000;
    assert.ok(days <= 180, `${e.id} expiry within 180 days`);
  }
});

test("10. an account that cannot be read produces NOT_ASSESSED, never a pass", () => {
  const broken = FIXTURE_ACCOUNTS.filter((a) => a.connection === "PERMISSION_FAILURE").map((a) => a.id);
  assert.ok(broken.length > 0, "the dataset exercises a permission failure");
  const brokenResources = FIXTURE_RESOURCES.filter((r) => broken.includes(r.accountId)).map((r) => r.id);
  const notAssessed = latest.filter((r) => r.status === "NOT_ASSESSED");
  assert.ok(notAssessed.length > 0, "at least one control could not be assessed");
  for (const r of notAssessed) {
    assert.ok(brokenResources.includes(r.resourceId), "not-assessed results belong to the failing account");
    assert.ok(r.notAssessedReason, "a reason is always given");
  }
  for (const c of FIXTURE_CONTROLS.filter((x) => x.status === "NOT_ASSESSED")) {
    assert.ok(c.notAssessedReason, `${c.id} states why it could not be assessed`);
  }
});

test("11. no internal identifiers anywhere in the fixtures", () => {
  const blob = JSON.stringify({
    FIXTURE_CONTROLS,
    FIXTURE_RESULTS,
    FIXTURE_RESOURCES,
    FIXTURE_FINDINGS,
    FIXTURE_REMEDIATIONS,
    FIXTURE_DRIFT,
    FIXTURE_EVIDENCE,
    FIXTURE_EXCEPTIONS,
    FIXTURE_REPORTS,
    FIXTURE_ACCOUNTS,
    FIXTURE_ALERT_ROUTES,
    FIXTURE_USERS,
  });
  for (const banned of ["arn:aws", "tenant_id", "tenantId", "SHAP", "ReAct", "content_hash", "signature"]) {
    assert.ok(!blob.includes(banned), `fixtures contain no ${banned}`);
  }
});

test("12. every provider is AWS — nothing implies Azure or GCP is live", () => {
  for (const r of FIXTURE_RESOURCES) assert.equal(r.provider, "AWS");
  for (const c of FIXTURE_CONTROLS) assert.equal(c.provider, "AWS");
  for (const a of FIXTURE_ACCOUNTS) assert.equal(a.provider, "AWS");
});

test("narrative: the dataset exercises every state the UI must render", () => {
  const statuses = new Set(FIXTURE_CONTROLS.map((c) => c.status));
  for (const s of ["PASS", "FAIL", "DRIFTED", "EXCEPTION", "NOT_ASSESSED"]) {
    assert.ok(statuses.has(s as never), `controls include ${s}`);
  }
  assert.ok(FIXTURE_CONTROLS.some((c) => c.verification === "VERIFYING"), "a control is verifying");
  assert.ok(FIXTURE_RUNS.some((r) => r.state === "FAILED"), "a run failed");
  assert.ok(FIXTURE_DRIFT.some((d) => d.resolvedAt), "a drift event was resolved");
  assert.ok(FIXTURE_DRIFT.some((d) => !d.resolvedAt), "a drift event is open");
  assert.equal(FIXTURE_REPORTS.filter((r) => r.state === "READY").length, 1);
  assert.ok(FIXTURE_REPORTS.some((r) => r.state === "GENERATING"));
  assert.ok(FIXTURE_REPORTS.some((r) => r.state === "FAILED"));
  assert.equal(FIXTURE_USERS.length, 5);
  assert.equal(FIXTURE_ALERT_ROUTES.length, 2);
});
