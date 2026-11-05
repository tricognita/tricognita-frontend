import { test } from "node:test";
import assert from "node:assert/strict";
import { apiKeyStatus } from "./admin";

const NOW = Date.parse("2026-10-14T12:00:00Z");

test("a key without an expiry is active; one with a distant expiry is active", () => {
  assert.equal(apiKeyStatus({ expiresAt: null }, NOW), "active");
  assert.equal(apiKeyStatus({ expiresAt: "2027-01-01T00:00:00Z" }, NOW), "active");
});

test("a key within seven days of expiry says so; past expiry it is expired, at the instant included", () => {
  assert.equal(apiKeyStatus({ expiresAt: "2026-10-20T00:00:00Z" }, NOW), "expiring");
  assert.equal(apiKeyStatus({ expiresAt: "2026-10-14T12:00:00Z" }, NOW), "expired");
  assert.equal(apiKeyStatus({ expiresAt: "2026-10-01T00:00:00Z" }, NOW), "expired");
});
