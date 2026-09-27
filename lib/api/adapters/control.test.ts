/**
 * Adapter behaviour. These are the rules that keep a backend answer from
 * becoming a claim the product cannot support.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  toCloudAccount,
  toControl,
  toControlResult,
  toResource,
  toVerificationRun,
} from "./control";
import type { ControlDTO, ControlResultDTO } from "../dto/control";

function controlDTO(over: Partial<ControlDTO> = {}): ControlDTO {
  return {
    id: "TC-DATA-02", name: "No storage bucket is public",
    description: "d", whyItMatters: "w", domain: "STORAGE",
    expectedState: "Block Public Access enabled on every bucket",
    severity: "CRITICAL", provider: "AWS",
    frameworkRefs: [{ framework: "CIS_AWS", ref: "2.1.5" }],
    status: "PASS", resourcesInScope: 3, resourcesFailing: 0,
    lastVerifiedAt: "2026-09-19T09:00:00Z", verification: "VERIFIED",
    remediationAvailable: true, evidenceRefs: [],
    ...over,
  };
}

test("a control maps across with its wording and counts intact", () => {
  const c = toControl(controlDTO());
  assert.equal(c.id, "TC-DATA-02");
  assert.equal(c.domain, "STORAGE");
  assert.equal(c.severity, "CRITICAL");
  assert.equal(c.status, "PASS");
  assert.equal(c.resourcesInScope, 3);
  assert.equal(c.remediationAvailable, true);
  assert.deepEqual(c.frameworkRefs, [{ framework: "CIS_AWS", ref: "2.1.5" }]);
});

// The rule the whole layer exists for: a word the product does not understand
// is never read as good news.
test("an unrecognised status becomes NOT_ASSESSED, never PASS", () => {
  for (const unknown of ["OK", "GREEN", "COMPLIANT", "", "pass"]) {
    const c = toControl(controlDTO({ status: unknown }));
    assert.equal(c.status, "NOT_ASSESSED", `${unknown} must not be trusted`);
  }
});

test("a not-assessed reason only survives alongside NOT_ASSESSED", () => {
  const assessed = toControl(controlDTO({ status: "PASS", notAssessedReason: "NO_PERMISSION" }));
  assert.equal(assessed.notAssessedReason, undefined,
    "a passing control must not carry a reason it was not assessed");

  const notAssessed = toControl(controlDTO({ status: "NOT_ASSESSED", notAssessedReason: "NO_PERMISSION" }));
  assert.equal(notAssessed.notAssessedReason, "NO_PERMISSION");

  const unknownReason = toControl(controlDTO({ status: "NOT_ASSESSED", notAssessedReason: "BECAUSE" }));
  assert.equal(unknownReason.notAssessedReason, "PROVIDER_ERROR",
    "an unrecognised reason still has to be one of the four");
});

test("an unknown domain, severity or provider falls back rather than crashing", () => {
  const c = toControl(controlDTO({ domain: "QUANTUM", severity: "APOCALYPTIC", provider: "IBM" }));
  assert.equal(c.domain, "ACCOUNT");
  assert.equal(c.severity, "MEDIUM");
  assert.equal(c.provider, "AWS");
});

test("missing counts default to zero, not to undefined", () => {
  const c = toControl(controlDTO({ resourcesInScope: undefined, resourcesFailing: undefined }));
  assert.equal(c.resourcesInScope, 0);
  assert.equal(c.resourcesFailing, 0);
  assert.deepEqual(c.evidenceRefs, []);
});

test("a per-resource result narrows to the three an observation can be", () => {
  const base: ControlResultDTO = {
    id: "r1", controlId: "TC-DATA-02", resourceId: "res-abc", runId: "run-1",
    status: "PASS", checkedAt: "2026-09-19T09:00:00Z",
  };
  assert.equal(toControlResult(base).status, "PASS");
  assert.equal(toControlResult({ ...base, status: "FAIL" }).status, "FAIL");
  // A control-level transition observed per resource is, for that resource,
  // simply a failure.
  assert.equal(toControlResult({ ...base, status: "DRIFTED" }).status, "FAIL");
  assert.equal(toControlResult({ ...base, status: "WHATEVER" }).status, "NOT_ASSESSED");
});

test("a result carries no identifier the product may not show", () => {
  const r = toControlResult({
    id: "r1", controlId: "TC-DATA-02", resourceId: "res-9f2c11", status: "FAIL",
    checkedAt: "2026-09-19T09:00:00Z",
  });
  assert.ok(!/arn:aws/i.test(JSON.stringify(r)), "an ARN must never reach the domain");
  assert.match(r.resourceId, /^res-/, "resources are referenced opaquely");
});

test("a resource keeps its masked identifier and nothing more", () => {
  const r = toResource({
    id: "res-9f2c11", label: "customer-exports", type: "s3_bucket", service: "S3",
    provider: "AWS", accountId: "•••• 4821", regionLabel: "ap-south-1",
    identifierMasked: "••••xports",
  });
  assert.equal(r.label, "customer-exports");
  assert.equal(r.identifierMasked, "••••xports");
  assert.ok(!/\d{12}/.test(JSON.stringify(r)), "no full account number");
});

test("a verification run keeps its counts and its failure", () => {
  const run = toVerificationRun({
    id: "run-1", trigger: "MANUAL", state: "VERIFIED",
    startedAt: "2026-09-19T09:00:00Z", finishedAt: "2026-09-19T09:01:00Z",
    counts: { evaluated: 10, passed: 8, failed: 1, notAssessed: 1 },
  });
  assert.equal(run.counts.evaluated, 10);
  assert.equal(run.state, "VERIFIED");

  const failed = toVerificationRun({
    id: "run-2", trigger: "SCHEDULED", state: "FAILED", startedAt: "2026-09-19T08:00:00Z",
    error: { code: "RUN_FAILED", message: "the connected role could not read this account" },
  });
  assert.equal(failed.state, "FAILED");
  assert.equal(failed.error?.message, "the connected role could not read this account");
  assert.equal(failed.counts.evaluated, 0, "a failed run claims nothing");
});

test("an unknown trigger or state falls back to the safe reading", () => {
  const run = toVerificationRun({ id: "r", trigger: "COSMIC", state: "FINE", startedAt: "2026-09-19T09:00:00Z" });
  assert.equal(run.trigger, "SCHEDULED");
  assert.equal(run.state, "PENDING", "an unrecognised state is not 'verified'");
});

test("a cloud account is never given a plausible-looking account number", () => {
  const a = toCloudAccount({
    id: "acct-1", alias: "Production", provider: "aws", connection: "CONNECTED",
    regions: ["ap-south-1"],
  });
  assert.equal(a.provider, "AWS");
  assert.equal(a.connection, "CONNECTED");
  assert.equal(a.accountIdMasked, "••••", "with nothing sent, nothing is fabricated");
  assert.deepEqual(a.regions, ["ap-south-1"]);

  const unknown = toCloudAccount({ id: "a", alias: "x", provider: "aws", connection: "WEIRD" });
  assert.equal(unknown.connection, "CONNECTING", "an unknown connection is not reported as connected");
});
