/**
 * Control Assurance Record adapter. The rule under test throughout: the screen
 * may say less than the backend knows, never more — no Fixed without a passing
 * verification, no PASS from an unknown status, no sound evidence from an
 * unknown integrity word, and no Tricognita execution from a customer's
 * statement.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { toAssuranceRecord } from "./assurance-record";
import type { AssuranceRecordDTO, RecordRemediationDTO } from "../dto/assurance-record";

function remediation(over: Partial<RecordRemediationDTO> = {}): RecordRemediationDTO {
  return {
    id: "cr-1",
    kind: "CUSTOMER_APPLIED",
    state: "APPLIED",
    proposal: {
      change: "Turn on Block Public Access.",
      scope: "One resource: customer-bucket, region ap-south-1, account •••• 9012",
      expectedResult: "Public access is blocked.",
      rollback: "Turn it off.",
      proposedBy: "engineer@example.com",
      proposedAt: "2026-09-01T11:00:00Z",
    },
    approval: { approvedBy: "cto@example.com", approvedAt: "2026-09-01T12:00:00Z" },
    execution: {
      basis: "CUSTOMER_STATED",
      executor: "ops engineer",
      method: "CONSOLE",
      recordedBy: "cto@example.com",
      recordedAt: "2026-09-01T13:00:00Z",
    },
    verification: {
      status: "PASS",
      verifiedAt: "2026-09-01T14:00:00Z",
      evidence: { ref: "EV-BBBB2222", integrity: "VERIFIED" },
    },
    outcome: "FIXED",
    ...over,
  };
}

function record(rem: RecordRemediationDTO = remediation()): AssuranceRecordDTO {
  return {
    schema: "tricognita.control-assurance-record/v1",
    disclaimer: "This is a factual record of checks and changes … It is not an audit opinion …",
    organisation: "Example Org",
    generatedAt: "2026-09-05T00:00:00Z",
    generatedBy: "auditor@example.com",
    period: { from: "", to: "2026-09-05T00:00:00Z" },
    scope: {
      accounts: [{ cloud: "AWS", label: "production", idMasked: "•••• 9012", regions: ["ap-south-1"] }],
      regions: ["ap-south-1"],
      environment: { declared: false, label: "Not declared by the customer" },
    },
    integrity: {
      status: "VERIFIED",
      recordsReferenced: 2,
      recordsVerified: 2,
      recordsFailed: 0,
      recordsUnchecked: 0,
      recordsMissing: 0,
      chainLinksBroken: 0,
      statement: "Every evidence record referenced here matched.",
    },
    counts: { entries: 1, byLatestStatus: { PASS: 1 } },
    controlsNotAssessed: [{ controlId: "TC-IAM-01", controlName: "MFA", reason: "NEVER_RUN" }],
    entries: [
      {
        controlId: "TC-DATA-02",
        controlName: "No storage bucket is public",
        expectedState: "Public access is blocked.",
        resource: { id: "res-abc", label: "customer-bucket", type: "s3_bucket", identifierMasked: "••••bucket" },
        cloud: "AWS",
        account: { label: "production", idMasked: "•••• 9012" },
        region: "ap-south-1",
        environment: { declared: false, label: "Not declared by the customer" },
        original: {
          status: "FAIL",
          observedAt: "2026-09-01T10:00:00Z",
          evidence: { ref: "EV-AAAA1111", integrity: "VERIFIED" },
        },
        latest: {
          status: "PASS",
          observedAt: "2026-09-01T14:00:00Z",
          evidence: { ref: "EV-BBBB2222", integrity: "VERIFIED" },
        },
        checks: [
          { status: "FAIL", observedAt: "2026-09-01T10:00:00Z", evidence: { ref: "EV-AAAA1111", integrity: "VERIFIED" } },
          { status: "PASS", previousStatus: "FAIL", observedAt: "2026-09-01T14:00:00Z", evidence: { ref: "EV-BBBB2222", integrity: "VERIFIED" } },
        ],
        subsequentChecks: 1,
        driftEvents: [],
        remediations: [rem],
      },
    ],
    truncated: false,
  };
}

test("Case A: the original FAIL and a verified FIXED map across intact", () => {
  const r = toAssuranceRecord(record());
  const e = r.entries[0];
  assert.equal(e.original.status, "FAIL");
  assert.equal(e.latest.status, "PASS");
  assert.equal(e.remediations[0].outcome, "FIXED");
  assert.equal(e.remediations[0].verification?.evidence?.ref, "EV-BBBB2222");
  assert.equal(r.integrity.status, "VERIFIED");
  assert.match(r.disclaimer, /not an audit opinion/);
});

test("Case B: a customer statement stays a customer statement", () => {
  const exec = toAssuranceRecord(record()).entries[0].remediations[0].execution;
  assert.equal(exec?.basis, "CUSTOMER_STATED");
  assert.equal(exec?.executor, "ops engineer");
  // A customer-applied change can never be relabelled as Tricognita's, even
  // if the payload claims it.
  const forged = toAssuranceRecord(
    record(remediation({ execution: { basis: "RECORDED_BY_TRICOGNITA", executor: "x", method: "CONSOLE" } })),
  );
  assert.equal(forged.entries[0].remediations[0].execution?.basis, "CUSTOMER_STATED");
});

test("Case C: FIXED without a passing verification is not Fixed", () => {
  for (const status of ["FAIL", "DRIFTED", "NOT_ASSESSED"]) {
    const r = toAssuranceRecord(
      record(remediation({ verification: { status, verifiedAt: "2026-09-01T14:00:00Z", evidence: null } })),
    );
    assert.notEqual(r.entries[0].remediations[0].outcome, "FIXED", `verification ${status}`);
  }
});

test("Case D: no verification at all is never Fixed", () => {
  const r = toAssuranceRecord(record(remediation({ verification: null })));
  assert.equal(r.entries[0].remediations[0].outcome, "NOT_VERIFIED");
  assert.equal(r.entries[0].remediations[0].verification, null);
});

test("an unknown status is NOT_ASSESSED with a reason, never PASS", () => {
  const dto = record();
  dto.entries[0].latest = { status: "LOOKS_GOOD", observedAt: "2026-09-02T00:00:00Z", evidence: null };
  const e = toAssuranceRecord(dto).entries[0];
  assert.equal(e.latest.status, "NOT_ASSESSED");
  assert.equal(e.latest.notAssessedReason, "NOT_RECORDED");
});

test("unknown integrity words are UNCHECKED, never VERIFIED", () => {
  const dto = record();
  dto.integrity.status = "PROBABLY_FINE";
  dto.entries[0].original.evidence = { ref: "EV-1", integrity: "SURE" };
  const r = toAssuranceRecord(dto);
  assert.equal(r.integrity.status, "UNCHECKED");
  assert.equal(r.entries[0].original.evidence?.integrity, "UNCHECKED");
});

test("tampered or missing evidence is carried through, not softened", () => {
  const dto = record();
  dto.integrity.status = "FAILED";
  dto.entries[0].original.evidence = { ref: "", integrity: "MISSING" };
  dto.entries[0].latest.evidence = { ref: "EV-BBBB2222", integrity: "FAILED" };
  const r = toAssuranceRecord(dto);
  assert.equal(r.integrity.status, "FAILED");
  assert.equal(r.entries[0].original.evidence?.integrity, "MISSING");
  assert.equal(r.entries[0].latest.evidence?.integrity, "FAILED");
});

test("export: the document is the server's record, byte for byte in content", () => {
  const dto = record();
  const r = toAssuranceRecord(dto);
  assert.deepEqual(JSON.parse(r.exportDocument), dto);
  const exported = JSON.parse(r.exportDocument) as AssuranceRecordDTO;
  assert.equal(exported.disclaimer, r.disclaimer);
  assert.equal(exported.entries.length, r.entries.length);
});

test("the domain record has no score, compliant or audit-ready field", () => {
  const keys = JSON.stringify(toAssuranceRecord(record())).toLowerCase();
  for (const bad of ['"score"', '"compliant"', '"auditready"', '"percent']) {
    assert.ok(!keys.includes(bad), `found ${bad}`);
  }
});
