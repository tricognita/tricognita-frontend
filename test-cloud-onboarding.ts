// Cloud-account onboarding: authorization policy, honest findings derivation, and no fabricated deletion/creation.
// Run: node --import tsx test-cloud-onboarding.ts   (env as for test-no-fabricated-success.ts)
import { apiRequiredRoles, roleMayCallApi, isPlatformOnlyApi } from "./lib/api-authz";
import { callUpstream, type UpstreamDeps } from "./lib/bff-upstream";

let failed = 0;
const ok = (c: boolean, m: string) => { if (!c) { failed++; console.error("FAIL:", m); } else console.log("ok:  ", m); };

// --- Authorization: connect/disconnect/test are ADMIN-only; reading trust details is the SECOPS tier; verify matches runVerification ---
for (const m of ["POST", "DELETE"]) {
  ok(JSON.stringify(apiRequiredRoles("/api/credentials", m)) === '["ADMIN"]', `${m} /api/credentials => ADMIN only`);
  ok(JSON.stringify(apiRequiredRoles("/api/credentials/test/abc", m)) === '["ADMIN"]', `${m} /api/credentials/test/{id} => ADMIN only`);
}
ok(!roleMayCallApi("SECOPS", "/api/credentials", "POST"), "SECOPS cannot connect an account");
ok(!roleMayCallApi("AUDITOR", "/api/credentials/aws/external-id", "GET"), "AUDITOR cannot read the trust details");
ok(roleMayCallApi("ADMIN", "/api/credentials/aws/external-id", "GET"), "ADMIN can read the trust details");
ok(roleMayCallApi("SECOPS", "/api/assessments", "POST"), "SECOPS can run a verification");
ok(!roleMayCallApi("AUDITOR", "/api/assessments", "POST"), "AUDITOR cannot run a verification");
ok(!roleMayCallApi("DESIGNER", "/api/assessments", "POST") && !roleMayCallApi("DESIGNER", "/api/credentials", "POST"), "DESIGNER cannot connect or verify");
ok(apiRequiredRoles("/api/assessments", "POST") !== "deny", "/api/assessments is classified (not fail-closed deny)");

// --- Operator-only surfaces are not reachable by a customer's administrator (the edge adds the tenant check) ---
for (const p of ["/api/admin/commercial", "/api/admin/pilot-health", "/api/admin/leads", "/api/admin/platform/tenants", "/api/organizations", "/api/datasets/export"]) {
  ok(isPlatformOnlyApi(p), `${p} is platform-only`);
}
for (const p of ["/api/credentials", "/api/auth/users", "/api/audit/events", "/api/cloud-accounts", "/api/administrators"]) {
  ok(!isPlatformOnlyApi(p), `${p} stays tenant-level`);
}

// --- A deletion or creation is reported only when the backend confirmed it ---
const SESSION = { email: "a@x.com", tenantId: "t1", role: "ADMIN" };
function deps(upstream: () => Promise<Response>): UpstreamDeps {
  return {
    getSession: async () => SESSION,
    secret: () => ({ secret: "s".repeat(40) }),
    mintToken: async () => "tok",
    fetch: (async () => upstream()) as typeof fetch,
    goApi: "http://go.test",
  };
}
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const delValidate = (b: unknown) => (isObj(b) && b.status === "deleted" ? null : "deletion not confirmed");
const createValidate = (b: unknown) => (isObj(b) && typeof b.id === "string" && b.id !== "" ? null : "missing credential id");

(async () => {
  let r = await callUpstream({ path: "/api/credentials/x", method: "DELETE", validate: delValidate }, deps(async () => { throw new Error("down"); }));
  ok(r.status === 502 && (await r.json()).error === "backend_unreachable", "DELETE with the API down => 502, not 'deleted'");
  r = await callUpstream({ path: "/api/credentials/x", method: "DELETE", validate: delValidate }, deps(async () => Response.json({ status: "deleted" })));
  ok(r.status === 200 && (await r.json()).status === "deleted", "DELETE confirmed by the API => relayed");
  r = await callUpstream({ path: "/api/credentials/x", method: "DELETE", validate: delValidate }, deps(async () => Response.json({ error: "credential not found" }, { status: 404 })));
  ok(r.status === 404, "DELETE of an unknown credential => 404 relayed");
  r = await callUpstream({ path: "/api/credentials", method: "POST", body: "{}", validate: createValidate }, deps(async () => Response.json({ status: "created" })));
  ok(r.status === 502, "POST answering 200 without an id => 502, not 'created'");
  r = await callUpstream({ path: "/api/credentials", method: "POST", body: "{}", validate: createValidate }, deps(async () => Response.json({ id: "i-1", status: "created" })));
  ok(r.status === 200 && (await r.json()).id === "i-1", "POST confirmed with an id => relayed");

  // --- Findings are derived from persisted control results, never invented ---
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  const res = (b: unknown, s = 200) => Response.json(b, { status: s });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const u = String(input); calls.push(u);
    if (u === "/api/controls") return res({ controls: [
      { id: "C-FAIL", name: "Failing one", description: "", whyItMatters: "", domain: "IDENTITY", expectedState: "", severity: "HIGH", provider: "AWS", frameworkRefs: [], status: "FAIL", resourcesInScope: 2, resourcesFailing: 1, verification: "VERIFIED", remediationAvailable: false, evidenceRefs: [] },
      { id: "C-PASS", name: "Passing one", description: "", whyItMatters: "", domain: "IDENTITY", expectedState: "", severity: "LOW", provider: "AWS", frameworkRefs: [], status: "PASS", resourcesInScope: 1, resourcesFailing: 0, verification: "VERIFIED", remediationAvailable: false, evidenceRefs: [] },
    ] });
    if (u.endsWith("/results")) return res({ results: [{ id: "r1", controlId: "C-FAIL", resourceId: "res-1", runId: "run-1", status: "FAIL", checkedAt: "2026-10-12T10:00:00Z" }, { id: "r2", controlId: "C-FAIL", resourceId: "res-2", runId: "run-1", status: "PASS", checkedAt: "2026-10-12T10:00:00Z" }], resources: [{ id: "res-1", label: "bucket-a", type: "s3", service: "s3", provider: "AWS", accountId: "acct", regionLabel: "r", identifierMasked: "••" }] });
    if (u.endsWith("/history")) return res({ results: [
      { id: "r1", controlId: "C-FAIL", resourceId: "res-1", runId: "run-1", status: "FAIL", checkedAt: "2026-10-12T10:00:00Z" },
      { id: "h0", controlId: "C-FAIL", resourceId: "res-1", runId: "run-0", status: "FAIL", checkedAt: "2026-10-10T10:00:00Z" },
      { id: "h-1", controlId: "C-FAIL", resourceId: "res-1", runId: "run--1", status: "PASS", checkedAt: "2026-10-01T10:00:00Z" },
    ], resources: [] });
    return res({}, 404);
  }) as typeof fetch;
  try {
    const { fetchFindings } = await import("./lib/api/findings");
    const f = await fetchFindings();
    ok(f.length === 1 && f[0].resourceId === "res-1" && f[0].status === "OPEN", "only the FAIL result becomes a finding (PASS resource and PASS control excluded)");
    ok(f[0].firstSeenAt === "2026-10-10T10:00:00Z", "firstSeenAt is the start of the unbroken FAIL run, not earlier than observed");
    ok(f[0].lastSeenAt === "2026-10-12T10:00:00Z" && f[0].remediationSteps.length === 0, "lastSeenAt from the latest result; no invented remediation steps");
    ok(calls.filter((c) => c.endsWith("/results")).length === 1 && !calls.some((c) => c.includes("C-PASS")), "only failing controls are fetched (bounded fan-out)");
  } finally { globalThis.fetch = realFetch; }

  if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
  console.log("\nall passed");
})();
