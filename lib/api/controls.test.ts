/**
 * verifyControl — "Verify now"'s BFF-calling function.
 *
 * Same rule as lib/api/remediation.test.ts: the browser sends only the
 * control id and the resource's opaque display id, and the response is
 * read exactly as the backend sent it — success, failure and NOT_ASSESSED
 * are all just whatever status string comes back, never guessed locally.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { verifyControl } from "./controls";
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

test("verifyControl POSTs to the control's verify path with the resource as a query param", async () => {
  const calls = mockFetch(200, {
    controlId: "TC-DATA-02",
    resourceId: "res-abc123",
    verificationRunId: "run-1",
    status: "PASS",
  });
  const result = await verifyControl("TC-DATA-02", "res-abc123");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/controls/TC-DATA-02/verify?resource=res-abc123");
  assert.equal(calls[0].init?.method, "POST");
  assert.equal(result.status, "PASS");
  assert.equal(result.verificationRunId, "run-1");
});

test("verifyControl URL-encodes both the control id and the resource id", async () => {
  const calls = mockFetch(200, { controlId: "x", resourceId: "y", verificationRunId: "r", status: "PASS" });
  await verifyControl("weird control/id", "weird resource/id");
  assert.equal(calls[0].path, "/api/controls/weird%20control%2Fid/verify?resource=weird%20resource%2Fid");
});

test("a FAIL/DRIFTED/NOT_ASSESSED result is returned as-is, never upgraded to PASS", async () => {
  for (const status of ["FAIL", "DRIFTED", "NOT_ASSESSED"]) {
    mockFetch(200, { controlId: "TC-DATA-02", resourceId: "res-abc123", verificationRunId: "run-1", status });
    const result = await verifyControl("TC-DATA-02", "res-abc123");
    assert.equal(result.status, status);
  }
});

test("resource_not_assessed (422) surfaces as an error, not a fabricated result", async () => {
  mockFetch(422, { error: "resource_not_assessed" });
  await assert.rejects(
    () => verifyControl("TC-DATA-02", "res-abc123"),
    (e: unknown) => e instanceof ApiError && e.status === 422,
  );
});

test("a forbidden response (role lacks runVerification) surfaces as an ApiError, not a silent no-op", async () => {
  mockFetch(403, { error: "insufficient_scope" });
  await assert.rejects(
    () => verifyControl("TC-DATA-02", "res-abc123"),
    (e: unknown) => e instanceof ApiError && e.status === 403,
  );
});

test("an unreachable backend surfaces as an error, never an empty/optimistic result", async () => {
  (globalThis as { fetch?: typeof fetch }).fetch = (async () => {
    throw new TypeError("network error");
  }) as typeof fetch;
  await assert.rejects(() => verifyControl("TC-DATA-02", "res-abc123"), ApiError);
});
