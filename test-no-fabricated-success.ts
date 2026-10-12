// A failed, missing or unconfigured dependency must never produce a successful security result.
// Run: SENTINEL_JIT_SECRET=$(printf "x%.0s" {1..40}) SESSION_SECRET=$(printf "y%.0s" {1..40}) BOOTSTRAP_RESET_TOKEN=$(printf "z%.0s" {1..40}) SENTINEL_API_URL=http://localhost:1 DEMO_ADMIN_PASSWORD=synthetic-test-pass node --conditions=react-server --import tsx test-no-fabricated-success.ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  callUpstream, interpretUpstream, persistClientAuditEvent, notImplemented,
  validateFleetScan, stripScanOutput, validateIacScan, validateK8sAudit, validateThreatIntel,
  type UpstreamDeps, type UpstreamSession,
} from "./lib/bff-upstream";

let failed = 0;
const ok = (c: boolean, m: string) => { if (!c) { failed++; console.error("FAIL:", m); } else console.log("ok:  ", m); };

const ANALYST: UpstreamSession = { email: "a@x.com", tenantId: "t1", role: "ADMIN" };
function deps(o: { session?: UpstreamSession | null; secret?: boolean; upstream?: () => Promise<Response> }) {
  let fetched = 0;
  const d: UpstreamDeps = {
    getSession: async () => (o.session === undefined ? ANALYST : o.session),
    secret: () => (o.secret === false ? Response.json({ error: "jit_not_configured" }, { status: 503 }) : { secret: "s".repeat(40) }),
    mintToken: async () => "tok",
    fetch: (async () => { fetched++; return o.upstream ? o.upstream() : Response.json({ ok: true }); }) as typeof fetch,
    goApi: "http://go.test",
  };
  return { d, fetched: () => fetched };
}

(async () => {
  // --- Unauthenticated: 401 before anything else, with the secret configured or missing ---
  for (const secret of [true, false]) {
    const t = deps({ session: null, secret });
    let side = 0;
    const r = await callUpstream({ path: "/x", method: "POST", onSuccess: () => { side++; }, precheck: () => Response.json({ e: 1 }, { status: 400 }) }, t.d);
    ok(r.status === 401 && (await r.json()).error === "authentication_required", `unauthenticated (secret ${secret ? "set" : "missing"}) => 401, not 400/503/success`);
    ok(t.fetched() === 0 && side === 0, `unauthenticated (secret ${secret ? "set" : "missing"}) => upstream never called, no side effect`);
  }

  // --- Missing JIT secret with a valid session: 503, never success ---
  {
    const t = deps({ secret: false });
    let side = 0;
    const r = await callUpstream({ path: "/x", method: "POST", onSuccess: () => { side++; } }, t.d);
    ok(r.status === 503 && (await r.json()).error === "jit_not_configured", "missing JIT secret => 503 jit_not_configured");
    ok(t.fetched() === 0 && side === 0, "missing JIT secret => no upstream call, no notification");
    ok(!JSON.stringify(await (await callUpstream({ path: "/x" }, deps({ secret: false }).d)).json()).includes("simulated"), "missing secret body has no 'simulated'");
  }

  // --- Authenticated but unauthorized: the Go refusal is relayed, side effects suppressed ---
  for (const status of [401, 403]) {
    let side = 0;
    const r = await callUpstream({ path: "/x", method: "POST", onSuccess: () => { side++; } },
      deps({ upstream: async () => Response.json({ error: "insufficient_scope" }, { status }) }).d);
    ok(r.status === status && (await r.json()).error === "insufficient_scope", `upstream ${status} relayed unchanged`);
    ok(side === 0, `upstream ${status} => no notification/event`);
  }

  // --- Backend unavailable / erroring ---
  {
    let side = 0;
    const r = await callUpstream({ path: "/x", method: "POST", onSuccess: () => { side++; } },
      deps({ upstream: async () => { throw new Error("ECONNREFUSED"); } }).d);
    const b = await r.json();
    ok(r.status === 502 && b.error === "backend_unreachable", "fetch throws => 502 backend_unreachable");
    ok(!("ok" in b) && !("simulated" in b) && !("status" in b) && side === 0, "unreachable => no ok/status/simulated field, no side effect");
  }
  {
    let side = 0;
    const r = await callUpstream({ path: "/x", method: "POST", onSuccess: () => { side++; } },
      deps({ upstream: async () => Response.json({ error: "db_down" }, { status: 500 }) }).d);
    const b5 = await r.json();
    ok(r.status === 500 && b5.error === "backend_error" && side === 0, "upstream 500 => generic backend_error, no side effect");
  }
  {
    const r = await callUpstream({ path: "/x" }, deps({ upstream: async () => new Response("<html>bad gateway</html>", { status: 502 }) }).d);
    const b = await r.json();
    ok(r.status === 502 && b.error === "backend_error" && !JSON.stringify(b).includes("<html>"), "non-JSON upstream error => generic backend_error, body not leaked");
  }
  {
    let side = 0;
    const r = await callUpstream({ path: "/x", onSuccess: () => { side++; } }, deps({ upstream: async () => new Response("OK", { status: 200 }) }).d);
    ok(r.status === 502 && side === 0, "200 with unreadable body => 502 (result unknown), no side effect");
  }
  {
    const r = await callUpstream({ path: "/x", precheck: () => Response.json({ error: "bad" }, { status: 400 }) }, deps({}).d);
    ok(r.status === 400, "authenticated but invalid input => precheck 400");
  }

  // --- Actual success: only then do side effects run, body relayed verbatim ---
  {
    let side: unknown = null;
    const r = await callUpstream({ path: "/x", method: "POST", onSuccess: (s, b) => { side = { s, b }; } },
      deps({ upstream: async () => Response.json({ id: "42", status: "approved", action_type: "S3" }) }).d);
    const b = await r.json();
    ok(r.status === 200 && b.id === "42" && b.status === "approved" && !("simulated" in b), "upstream 200 relayed verbatim, no simulated flag");
    ok(JSON.stringify(side) === JSON.stringify({ s: ANALYST, b }), "side effect ran once with the verified session and upstream body");
  }
  {
    const r = await callUpstream({ path: "/x", onSuccess: () => { throw new Error("slack down"); } }, deps({}).d);
    ok(r.status === 200, "a failing notification never turns a verified success into an error");
  }

  // --- Sensitive output never reaches the browser ---
  {
    const origErr = console.error; const logged: string[] = []; console.error = (...a: unknown[]) => { logged.push(a.join(" ")); };
    const leak = "AWS_SECRET_ACCESS_KEY=AKIAFAKE /opt/scan.sh: line 9: boom";
    const r = await callUpstream({ path: "/api/scan", method: "POST" }, deps({ upstream: async () => Response.json({ error: "scan failed", detail: leak, stack: "goroutine 1" }, { status: 500 }) }).d);
    console.error = origErr;
    const txt = JSON.stringify(await r.json());
    ok(r.status === 500 && !txt.includes("AKIAFAKE") && !txt.includes("goroutine") && !txt.includes("scan.sh") && !txt.includes("scan failed"), "Go 5xx detail/stack never reaches the browser");
    ok(logged.length === 1 && logged[0].includes("upstream 500"), "5xx diagnostics are logged server-side only (one truncated line)");
    const r4 = await callUpstream({ path: "/x" }, deps({ upstream: async () => Response.json({ error: "quota_exceeded", retry_after: 30, detail: leak, script_output: leak }, { status: 429 }) }).d);
    const b4 = await r4.json();
    ok(r4.status === 429 && b4.error === "quota_exceeded" && b4.retry_after === 30 && b4.detail === undefined && b4.script_output === undefined, "4xx keeps its error/fields but loses internal keys");
    const okScan = stripScanOutput({ report: { findings: [] }, script_output: leak }) as Record<string, unknown>;
    ok(okScan.script_output === undefined && okScan.report !== undefined, "successful scan result drops raw scanner output");
  }

  // --- direct_access_denied is an outage, genuine 403s are not ---
  {
    const r = await callUpstream({ path: "/x" }, deps({ upstream: async () => Response.json({ error: "direct_access_denied" }, { status: 403 }) }).d);
    const b = await r.json();
    ok(r.status === 502 && b.error === "api_origin_rejected" && !JSON.stringify(b).toLowerCase().includes("cloudflare"), "direct_access_denied => 502 api_origin_rejected (no infrastructure detail)");
    const real = await callUpstream({ path: "/x" }, deps({ upstream: async () => Response.json({ error: "mfa_required" }, { status: 403 }) }).d);
    ok(real.status === 403 && (await real.json()).error === "mfa_required", "genuine 403 (mfa_required) stays 403");
  }

  // --- 202/204 and empty bodies ---
  {
    let side = 0;
    const r204 = await callUpstream({ path: "/x", method: "POST", onSuccess: () => { side++; } }, deps({ upstream: async () => new Response(null, { status: 204 }) }).d);
    ok(r204.status === 204 && side === 1, "204 is a success with no body; side effect runs once");
    const r200e = await callUpstream({ path: "/x", method: "POST" }, deps({ upstream: async () => new Response("", { status: 200 }) }).d);
    ok(r200e.status === 200, "empty 200 on a route without a required result is relayed as 200");
    const rv = await callUpstream({ path: "/x", validate: validateFleetScan }, deps({ upstream: async () => new Response(null, { status: 204 }) }).d);
    ok(rv.status === 502, "empty 2xx on a route that requires a result => 502");
  }

  // --- Go answers approve/terminate with 202 {status:"enqueued", job_id}: relayed as-is, not rewritten to "approved"/"terminated" ---
  {
    const r = await callUpstream({ path: "/api/aria/actions/1/approve", method: "POST" },
      deps({ upstream: async () => Response.json({ status: "enqueued", job_id: "j1" }, { status: 202 }) }).d);
    const b = await r.json();
    ok(r.status === 202 && b.status === "enqueued" && b.job_id === "j1", "202 enqueued relayed verbatim (never rewritten to approved/terminated)");
  }

  // --- Dashboard handlers must not show success for a failed response ---
  {
    const src = readFileSync("app/dashboard/(legacy)/components/aria/ARIADashboard.tsx", "utf8");
    ok((src.match(/if \(!res\.ok\)/g) ?? []).length >= 3, "ARIADashboard approve/reject/terminate check res.ok before showing a result");
    const page = readFileSync("app/dashboard/(legacy)/page.tsx", "utf8");
    ok(!/simulated/.test(page), "legacy dashboard has no simulated-result branch");
  }

  // --- Scans: missing evidence / incomplete results are not "compliant" ---
  const scanCall = (body: unknown) => callUpstream({ path: "/api/scan", method: "POST", validate: validateFleetScan },
    deps({ upstream: async () => Response.json(body) }).d);
  for (const [name, body] of [["empty object", {}], ["no report", { script_output: "done" }], ["report without findings array", { report: { report_id: "r" } }], ["null findings", { report: { findings: null } }], ["array body", []]] as const) {
    const r = await scanCall(body);
    ok(r.status === 502 && (await r.json()).error === "incomplete_result", `scan 200 with ${name} => 502 incomplete_result, not compliant`);
  }
  ok((await scanCall({ report: { findings: [] } })).status === 200, "scan with a real report and zero findings is still a valid result");
  ok(validateFleetScan({ report: { findings: [{ severity: "HIGH" }] } }) === null, "scan with findings is valid");

  // --- IaC / K8s: counts claiming findings need the findings ---
  ok(validateIacScan({ count: 3 }) !== null && validateIacScan({}) !== null && validateIacScan({ count: 2, findings: [] }) !== null, "iac: missing/lying count rejected");
  ok(validateIacScan({ count: 0, findings: null }) === null && validateIacScan({ count: 1, findings: [{}] }) === null, "iac: genuine empty and non-empty accepted");
  ok(validateK8sAudit({}) !== null && validateK8sAudit({ summary: { total: 4 } }) !== null, "k8s: missing summary or missing findings rejected");
  ok(validateK8sAudit({ summary: { total: 0 }, findings: null }) === null && validateK8sAudit({ summary: { total: 1 }, findings: [{}] }) === null, "k8s: genuine results accepted");

  // --- Threat intel: no score => error, never a guessed verdict ---
  ok(validateThreatIntel({}) !== null && validateThreatIntel({ verdict: "MALICIOUS" }) !== null && validateThreatIntel({ Score: "72" }) !== null, "threatintel: verdict without a numeric score rejected");
  ok(validateThreatIntel({ Score: 0 }) === null && validateThreatIntel({ score: 12 }) === null, "threatintel: numeric score accepted");
  {
    const r = await callUpstream({ path: "/api/threatintel/lookup", validate: validateThreatIntel }, deps({ upstream: async () => Response.json({}) }).d);
    ok(r.status === 502, "threatintel 200 with empty body => 502");
    const down = await callUpstream({ path: "/api/threatintel/lookup", validate: validateThreatIntel }, deps({ upstream: async () => Response.json({ error: "provider_unavailable" }, { status: 503 }) }).d);
    const b = await down.json();
    ok(down.status === 503 && b.verdict === undefined && b.score === undefined, "threatintel provider 503 => 503, no verdict");
  }

  // --- interpretUpstream is the same rule set for /api/scan (own quota/headers) ---
  {
    let side = 0;
    const r = await interpretUpstream(Response.json({ report: {} }), { validate: validateFleetScan, onSuccess: () => { side++; } }, ANALYST);
    ok(r.status === 502 && side === 0, "interpretUpstream: incomplete scan => 502, no usage/notification hook");
  }

  // --- Audit persistence is reported honestly ---
  {
    const good = await persistClientAuditEvent({ a: 1 }, "t", "rid", { fetch: (async () => Response.json({ ok: true })) as typeof fetch, goApi: "http://go.test" });
    ok(good.ok === true, "audit: 2xx => persisted");
    const missing = await persistClientAuditEvent({ a: 1 }, "t", "rid", { fetch: (async () => new Response("not found", { status: 404 })) as typeof fetch, goApi: "http://go.test" });
    ok(missing.ok === false, "audit: Go 404 (endpoint absent) => NOT persisted");
    const down = await persistClientAuditEvent({ a: 1 }, "t", "rid", { fetch: (async () => { throw new Error("down"); }) as typeof fetch, goApi: "http://go.test" });
    ok(down.ok === false, "audit: unreachable => NOT persisted");
    const err = await persistClientAuditEvent({ a: 1 }, "t", "rid", { fetch: (async () => Response.json({}, { status: 500 })) as typeof fetch, goApi: "http://go.test" });
    ok(err.ok === false, "audit: 500 => NOT persisted");
  }

  // --- Unbuilt features say so ---
  {
    const r = notImplemented("JIT access-request approve");
    const b = await r.json();
    ok(r.status === 501 && b.error === "not_implemented" && b.ok === undefined, "unbuilt feature => 501, no ok/status");
  }

  // --- Source guards over every BFF route: no canned data, no simulated success ---
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith("route.ts") ? [p] : []; });
  const routes = walk("app/api");
  const bad: string[] = [];
  for (const f of routes) {
    const src = readFileSync(f, "utf8");
    if (/simulated\s*:\s*true|DEMO_RESULT|demoResult|`sim-\$|"sim-/.test(src)) bad.push(f);
  }
  ok(bad.length === 0, `no BFF route fabricates (simulated:true / demo result / sim- ids)${bad.length ? ": " + bad.join(", ") : ""}`);
  for (const verb of ["approve", "reject"]) {
    const src = readFileSync(`app/api/aria/zero-trust/jit-requests/[id]/${verb}/route.ts`, "utf8");
    ok(src.includes("notImplemented(") && !/recordEvent|notifyJIT|GO_API|fetch\(/.test(src), `jit-requests ${verb}: honest 501, no upstream/dataset/notification`);
  }
  const mutating = ["aria/actions/[id]/approve", "aria/actions/[id]/reject", "aria/finops/[id]/terminate", "cloud/scan", "iac/scan", "k8s/audit", "threatintel/lookup"];
  for (const m of mutating) {
    const src = readFileSync(`app/api/${m}/route.ts`, "utf8");
    ok(src.includes("callUpstream(") && !/catch\s*(\([^)]*\))?\s*\{\s*return Response\.json\(\{\s*ok/.test(src), `${m}: goes through callUpstream, no catch-and-succeed`);
  }

  if (failed) { console.error(`${failed} assertion(s) failed`); process.exit(1); }
  console.log("PASS: no failed or unconfigured dependency produces a successful result.");
})();
