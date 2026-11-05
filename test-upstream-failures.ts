/**
 * How the BFF reports a failed upstream call: the failure class is logged, a timeout is a 504 that says the work may still
 * complete, and a refused connection is still "unreachable". Standalone (bff-upstream imports server-only code), like its siblings:
 *   node --conditions=react-server --import tsx test-upstream-failures.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { callUpstream, describeFetchError, type UpstreamDeps } from "./lib/bff-upstream";

const session = { email: "a@x.test", tenantId: "t", role: "ADMIN" };
const deps = (f: typeof fetch): UpstreamDeps => ({
  getSession: async () => session,
  secret: () => ({ secret: "s".repeat(40) }),
  mintToken: async () => "token",
  fetch: f,
  goApi: "http://api.test",
});

test("describeFetchError reports the class and network code only", () => {
  const reset = Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET", message: "read ECONNRESET 10.0.0.1:443" } });
  assert.equal(describeFetchError(reset), "TypeError/ECONNRESET");
  assert.equal(describeFetchError(new Error("boom")), "Error");
  assert.equal(describeFetchError("x"), "unknown");
});

test("a request that outlives the BFF limit is a 504 timeout that says the work may still complete, not an unreachable API", async () => {
  const slow = (async (_u: unknown, init?: RequestInit) =>
    new Promise((_r, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)))) as unknown as typeof fetch;
  const keepAlive = setTimeout(() => {}, 1000); // AbortSignal.timeout's timer is unref'd; a real server keeps the loop alive anyway
  const res = await callUpstream({ path: "/api/assessments", method: "POST", timeoutMs: 20 }, deps(slow));
  clearTimeout(keepAlive);
  assert.equal(res.status, 504);
  const b = (await res.json()) as { error: string; message: string };
  assert.equal(b.error, "backend_timeout");
  assert.match(b.message, /may still complete/);
});

test("a refused or reset connection is still the unreachable answer (502)", async () => {
  const refused = (async () => {
    throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
  }) as unknown as typeof fetch;
  const res = await callUpstream({ path: "/api/controls" }, deps(refused));
  assert.equal(res.status, 502);
  assert.equal(((await res.json()) as { error: string }).error, "backend_unreachable");
});
