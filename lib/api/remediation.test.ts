/**
 * Remediation BFF-calling functions.
 *
 * The rule under test throughout: the browser only ever sends what the
 * bounded remediation contract needs (controlId, resourceUrn, action,
 * optional params; or just a remediation id), and it never sends or expects
 * back anything credential-, token- or ARN-shaped.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  approveRemediation,
  executeRemediation,
  fetchRemediationOffers,
  fetchRemediations,
  rejectRemediation,
  requestRemediation,
} from "./remediation";
import { ApiError } from "./client";

interface Call {
  path: string;
  init?: RequestInit;
}

function mockFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  (globalThis as { fetch?: typeof fetch }).fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    calls.push({ path: String(input), init });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  }) as typeof fetch;
  return calls;
}

function parsedBody(call: Call): unknown {
  return call.init?.body ? JSON.parse(String(call.init.body)) : undefined;
}

// No key anywhere in this vocabulary — the shape the request/response layer
// is allowed to move between the browser and the BFF.
const FORBIDDEN_KEY = /token|secret|credential|password|arn|apikey/i;

function assertNoForbiddenKeys(value: unknown, where: string) {
  if (value === null || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value)) {
    assert.ok(!FORBIDDEN_KEY.test(k), `${where}: field ${JSON.stringify(k)} looks credential-shaped`);
    assertNoForbiddenKeys(v, where);
  }
}

test("requestRemediation sends exactly controlId, resourceUrn, action, params", async () => {
  const calls = mockFetch(200, { id: "r1" });
  await requestRemediation({
    controlId: "TC-DATA-02",
    resourceUrn: "arn:aws:s3:::my-bucket",
    action: "aws.s3.block_public_access",
    params: { region: "us-east-1" },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/remediation");
  assert.equal(calls[0].init?.method, "POST");
  const body = parsedBody(calls[0]) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), ["action", "controlId", "params", "resourceUrn"]);
  assertNoForbiddenKeys(body, "requestRemediation body");
});

test("requestRemediation never invents fields beyond what the caller supplied", async () => {
  const calls = mockFetch(200, { id: "r1" });
  await requestRemediation({
    controlId: "TC-DATA-02",
    resourceUrn: "my-bucket",
    action: "aws.s3.block_public_access",
  });
  const body = parsedBody(calls[0]) as Record<string, unknown>;
  // No params supplied — the field must not silently appear as {} or null,
  // since the backend distinguishes "no params" from "empty params object".
  assert.equal("params" in body, false);
});

test("approveRemediation posts to the id-scoped verb with no body fields beyond what's needed", async () => {
  const calls = mockFetch(200, { id: "r1", state: "APPROVED" });
  await approveRemediation("r1");
  assert.equal(calls[0].path, "/api/remediation/r1/approve");
  assert.equal(calls[0].init?.method, "POST");
  assertNoForbiddenKeys(parsedBody(calls[0]), "approveRemediation body");
});

test("approveRemediation URL-encodes the id", async () => {
  const calls = mockFetch(200, { id: "r/1", state: "APPROVED" });
  await approveRemediation("weird id/with space");
  assert.equal(calls[0].path, "/api/remediation/weird%20id%2Fwith%20space/approve");
});

test("rejectRemediation sends only a reason", async () => {
  const calls = mockFetch(200, { id: "r1", state: "REJECTED" });
  await rejectRemediation("r1", "Declined by approver");
  assert.equal(calls[0].path, "/api/remediation/r1/reject");
  const body = parsedBody(calls[0]) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body), ["reason"]);
  assert.equal(body.reason, "Declined by approver");
});

test("executeRemediation posts to /execute and maps the response through the real adapter", async () => {
  const calls = mockFetch(200, {
    id: "r1",
    controlId: "TC-DATA-02",
    action: "aws.s3.block_public_access",
    summary: "Enable Block Public Access",
    state: "SUCCEEDED",
    outcome: "REMEDIATED",
    requestedBy: "a@b.c",
    requestedAt: "2026-09-20T00:00:00Z",
  });
  const result = await executeRemediation("r1");
  assert.equal(calls[0].path, "/api/remediation/r1/execute");
  assert.equal(result.state, "APPLIED");
  assert.equal(result.verdict, "REMEDIATED");
});

test("fetchRemediations and fetchRemediationOffers are GETs, offers scoped to one control", async () => {
  let calls = mockFetch(200, { remediations: [] });
  await fetchRemediations();
  assert.equal(calls[0].path, "/api/remediation");
  assert.notEqual(calls[0].init?.method, "POST");

  calls = mockFetch(200, { actions: [] });
  await fetchRemediationOffers("TC-DATA-02");
  assert.equal(calls[0].path, "/api/remediation/actions?control=TC-DATA-02");
});

test("a rejected/forbidden response surfaces as an error, never a false success", async () => {
  mockFetch(403, { error: "forbidden" });
  await assert.rejects(
    () =>
      requestRemediation({
        controlId: "TC-DATA-02",
        resourceUrn: "my-bucket",
        action: "aws.s3.block_public_access",
      }),
    (e: unknown) => e instanceof ApiError && e.status === 403,
  );
});

test("an unreachable backend surfaces as an error, not an empty/optimistic result", async () => {
  (globalThis as { fetch?: typeof fetch }).fetch = (async () => {
    throw new TypeError("network error");
  }) as typeof fetch;
  await assert.rejects(() => approveRemediation("r1"), ApiError);
});
