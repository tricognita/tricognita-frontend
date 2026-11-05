import test from "node:test";
import assert from "node:assert/strict";

import {
  remediationUpstreamTimeoutMs,
  EXECUTE_UPSTREAM_TIMEOUT_MS,
  DEFAULT_UPSTREAM_TIMEOUT_MS,
} from "./remediation-timeout";

// The backend's post-remediation verification budget is 2 minutes, plus a
// 30-second write-back (api/remediation/service.go). A proxy that gives up
// sooner reports a 502 for a fix that then succeeds.
const BACKEND_EXECUTE_BUDGET_MS = 120_000 + 30_000;

test("execute waits longer than the backend's own verification budget", () => {
  assert.equal(remediationUpstreamTimeoutMs("execute"), EXECUTE_UPSTREAM_TIMEOUT_MS);
  assert.ok(EXECUTE_UPSTREAM_TIMEOUT_MS > BACKEND_EXECUTE_BUDGET_MS);
});

test("approve and reject keep the short default", () => {
  for (const verb of ["approve", "reject"]) {
    assert.equal(remediationUpstreamTimeoutMs(verb), DEFAULT_UPSTREAM_TIMEOUT_MS);
  }
});

test("an unknown verb never gets the long budget", () => {
  assert.equal(remediationUpstreamTimeoutMs("EXECUTE"), DEFAULT_UPSTREAM_TIMEOUT_MS);
  assert.equal(remediationUpstreamTimeoutMs(""), DEFAULT_UPSTREAM_TIMEOUT_MS);
});
