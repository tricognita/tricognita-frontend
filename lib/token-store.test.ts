import { test } from "node:test";
import assert from "node:assert/strict";

// No Redis configured: revocation must still work in-process rather than being silently off.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

test("a revoked token is rejected, an untouched one is not (no Redis configured)", async () => {
  const { revokeJti, isJtiRevoked, _resetLocalRevocations } = await import("./token-store");
  _resetLocalRevocations();
  assert.equal(await isJtiRevoked("jti-a"), false);
  await revokeJti("jti-a", 60);
  assert.equal(await isJtiRevoked("jti-a"), true);
  assert.equal(await isJtiRevoked("jti-b"), false);
});

test("a revocation lapses with the token's own lifetime", async () => {
  const { revokeJti, isJtiRevoked, _resetLocalRevocations } = await import("./token-store");
  _resetLocalRevocations();
  await revokeJti("jti-short", 1);
  assert.equal(await isJtiRevoked("jti-short"), true);
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal(await isJtiRevoked("jti-short"), false);
});
