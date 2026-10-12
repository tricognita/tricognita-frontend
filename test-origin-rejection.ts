// A Go 403 `direct_access_denied` is an outage, not a permissions answer; real 403s stay 403.
// Run: SENTINEL_JIT_SECRET=$(printf "x%.0s" {1..40}) SESSION_SECRET=$(printf "y%.0s" {1..40}) BOOTSTRAP_RESET_TOKEN=$(printf "z%.0s" {1..40}) SENTINEL_API_URL=http://localhost:1 DEMO_ADMIN_PASSWORD=synthetic-test-pass node --conditions=react-server --import tsx test-origin-rejection.ts
import { withRequestContext } from "./lib/bff-log";

let failed = 0;
const ok = (c: boolean, m: string) => { if (!c) { failed++; console.error("FAIL:", m); } else console.log("ok:  ", m); };
const run = (upstream: () => Response) =>
  withRequestContext(new Request("https://t.example/api/controls"), async () => upstream());

(async () => {
  const origin = await run(() => Response.json({ error: "direct_access_denied" }, { status: 403 }));
  const originBody = await origin.json();
  ok(origin.status === 502, "direct_access_denied becomes 502");
  ok(originBody.error === "api_origin_rejected" && typeof originBody.request_id === "string", "stable code and request id");
  ok(!JSON.stringify(originBody).includes("Cloudflare") && !JSON.stringify(originBody).includes("secret"), "no infrastructure detail leaked to the browser");

  const real = await run(() => Response.json({ error: "mfa_required" }, { status: 403 }));
  ok(real.status === 403 && (await real.json()).error === "mfa_required", "genuine 403 (mfa_required) is untouched");

  const forbidden = await run(() => Response.json({ error: "insufficient_scope" }, { status: 403 }));
  ok(forbidden.status === 403, "genuine 403 (insufficient_scope) is untouched");

  const nonJson = await run(() => new Response("nope", { status: 403 }));
  ok(nonJson.status === 403, "non-JSON 403 is untouched");

  const unauth = await run(() => Response.json({ error: "x" }, { status: 401 }));
  ok(unauth.status === 401, "401 is untouched");

  const fine = await run(() => Response.json({ controls: [] }));
  ok(fine.status === 200, "200 is untouched");

  if (failed) { console.error(`${failed} assertion(s) failed`); process.exit(1); }
  console.log("PASS: origin-rejection translation assertions passed.");
})();
