/**
 * Lead model guardrails (scoping_call cleanup, 2026-09-26).
 *
 * - A bookable scoping request is stored as `scoping_call`; registrations of
 *   interest, Launching or Planned services and non-bookable Google Cloud
 *   combinations are stored as `contact`. Nothing we ship sends `request_demo`.
 * - Historical `request_demo` records stay readable and are labelled legacy.
 * - The admin inbox shows "Scoping Call", never "Demo", for new scoping leads.
 * - /api/leads accepts the kinds, rejects unknown ones and makes no
 *   response-time promise. The success path runs against a stubbed Redis on
 *   an .invalid host, so no real lead can be written.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { KIND_LABELS, LEAD_CONFIRMATION, LEAD_KINDS, LEGACY_LEAD_KINDS, kindLabel } from "./lead-kinds";
import { CLOUDS, SERVICES, renderedState } from "./marketing/capabilities";
import { cloudById, serviceStateOnCloud } from "./marketing/clouds";
import { contactServiceOptions, leadPayload } from "./marketing/contact";

const ROOT = process.cwd();
const person = { name: "Test", email: "test@example.com", organisation: "Org", role: "Security" };
const available = contactServiceOptions().find((o) => o.state === "available")!;
const launching = contactServiceOptions().find((o) => o.state === "launching");

test("a scoping request is stored as scoping_call", () => {
  assert.equal(leadPayload({ intent: "scoping", ...person }).kind, "scoping_call");
});

test("a bookable service on AWS or Azure is a scoping_call", () => {
  for (const cloud of ["aws", "azure"] as const) {
    const service = SERVICES.find((s) => s.id === available.id)!;
    assert.equal(serviceStateOnCloud(service, cloudById(cloud)), "available", `${available.id} is not bookable on ${cloud}`);
    assert.equal(leadPayload({ intent: "scoping", serviceId: available.id, cloud, ...person }).kind, "scoping_call", cloud);
  }
});

test("a Launching service, or any non-bookable Google Cloud combination, is contact", () => {
  if (launching) {
    assert.equal(leadPayload({ intent: "scoping", serviceId: launching.id, ...person }).kind, "contact");
    assert.equal(leadPayload({ intent: "scoping", serviceId: launching.id, cloud: "aws", ...person }).kind, "contact");
  }
  const gcp = cloudById("gcp");
  for (const o of contactServiceOptions()) {
    const service = SERVICES.find((s) => s.id === o.id)!;
    const onGcp = service.clouds ? serviceStateOnCloud(service, gcp) : renderedState(service);
    if (onGcp !== "available") {
      assert.equal(leadPayload({ intent: "scoping", serviceId: o.id, cloud: "gcp", ...person }).kind, "contact", `${o.id} on Google Cloud`);
    }
  }
  // Every service on every cloud: only an Available combination is a scoping_call.
  for (const o of contactServiceOptions()) {
    const service = SERVICES.find((s) => s.id === o.id)!;
    for (const c of CLOUDS) {
      const state = service.clouds ? serviceStateOnCloud(service, c) : renderedState(service);
      const kind = leadPayload({ intent: "scoping", serviceId: o.id, cloud: c.id, ...person }).kind;
      assert.equal(kind, state === "available" ? "scoping_call" : "contact", `${o.id} on ${c.id}`);
    }
  }
});

test("Planned services can never become a scoping_call", () => {
  for (const s of SERVICES.filter((x) => renderedState(x) === "planned")) {
    for (const cloud of [undefined, ...CLOUDS.map((c) => c.id)]) {
      assert.notEqual(leadPayload({ intent: "scoping", serviceId: s.id, cloud, ...person }).kind === "scoping_call" &&
        leadPayload({ intent: "scoping", serviceId: s.id, cloud, ...person }).use_case.includes(s.name), true, `${s.id}`);
    }
    assert.ok(!contactServiceOptions().some((o) => o.id === s.id), `${s.id} is offered`);
  }
});

test("security and general questions are contact", () => {
  for (const intent of ["security", "general", "interest"] as const) assert.equal(leadPayload({ intent, ...person }).kind, "contact");
});

test("existing kinds are unchanged; scoping_call is added; request_demo is legacy", () => {
  assert.deepEqual([...LEAD_KINDS].sort(), ["contact", "pilot_application", "request_demo", "scoping_call", "waitlist"]);
  assert.deepEqual([...LEGACY_LEAD_KINDS], ["request_demo"]);
  assert.equal(KIND_LABELS.pilot_application, "Pilot");
  assert.equal(KIND_LABELS.waitlist, "Waitlist");
  assert.equal(KIND_LABELS.contact, "Contact");
});

test("the admin inbox labels scoping calls 'Scoping Call' and keeps legacy demo requests readable", () => {
  assert.equal(kindLabel("scoping_call"), "Scoping Call");
  assert.ok(!/demo/i.test(kindLabel("scoping_call")));
  assert.equal(kindLabel("request_demo"), "Demo request (legacy)");
  assert.equal(kindLabel("something_new"), "Unknown (something_new)", "an unknown stored kind must still render");
  const page = readFileSync(join(ROOT, "app", "dashboard", "(legacy)", "admin", "leads", "page.tsx"), "utf8");
  assert.ok(page.includes('from "@/lib/lead-kinds"'), "the inbox keeps its own copy of the kinds");
  assert.ok(!/type LeadKind\s*=/.test(page) && !/const KIND_LABELS/.test(page), "the inbox redefines kinds or labels");
  assert.ok(!/KIND_LABELS\[(e|selected)\.kind\]/.test(page), "the inbox indexes labels without a fallback");
  assert.ok(page.includes("kindLabel(e.kind)") && page.includes("kindLabel(selected.kind)"));
  // The filter lists every kind, current first, so legacy records can still be filtered.
  assert.deepEqual(Object.keys(KIND_LABELS)[0], "scoping_call");
  assert.ok(page.includes("Object.keys(KIND_LABELS)"));
});

test("stored legacy records are read back unchanged (no rewrite on read)", () => {
  const leads = readFileSync(join(ROOT, "lib", "leads.ts"), "utf8");
  const read = leads.slice(leads.indexOf("export async function readLeads"), leads.indexOf("export async function updateLeadStatus"));
  assert.ok(read.length > 0);
  assert.ok(!/kind\s*=|\.kind\s*=|request_demo|scoping_call/.test(read), "readLeads rewrites or filters kinds");
  const update = leads.slice(leads.indexOf("export async function updateLeadStatus"));
  assert.ok(!/\.kind\s*=/.test(update), "updating a lead's status changes its kind");
});

/* ── /api/leads ──────────────────────────────────────────────────────────── */

type Cmd = unknown[];
async function callApi(body: unknown, opts: { dedup?: boolean } = {}) {
  process.env.UPSTASH_REDIS_REST_URL = "https://stub-redis.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "stub";
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  const commands: Cmd[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    assert.ok(url.startsWith("https://stub-redis.invalid"), `unexpected network call to ${url}`);
    // The Upstash client may send one command, or a batch to /pipeline.
    const parsed = JSON.parse(String(init?.body ?? "[]")) as Cmd | Cmd[];
    const batch = url.endsWith("/pipeline") ? (parsed as Cmd[]) : [parsed as Cmd];
    const results = batch.map((cmd) => {
      commands.push(cmd);
      const name = String(cmd[0]).toLowerCase();
      const isDedup = name === "set" && cmd.map(String).some((a) => a.toLowerCase() === "nx");
      return { result: isDedup ? (opts.dedup ? null : "OK") : name === "lpush" ? 1 : "OK" };
    });
    const payload = url.endsWith("/pipeline") ? results : results[0];
    return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const { POST } = await import(join(ROOT, "app", "api", "leads", "route.ts"));
    const res: Response = await POST(
      new Request("http://localhost/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    );
    return { status: res.status, json: await res.json(), commands };
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("/api/leads stores a scoping_call and confirms without a response-time promise", async () => {
  const { status, json, commands } = await callApi({ kind: "scoping_call", name: "Test", email: "test@example.com", use_case: "Intent: Book a scoping call" });
  assert.equal(status, 201);
  assert.equal(json.message, LEAD_CONFIRMATION.stored);
  assert.equal(json.message, "Thanks. We'll review your request and follow up with next steps.");
  assert.ok(!/business day|within \d|hours?|24\/7|guarantee/i.test(json.message));
  const stored = commands.find((c) => String(c[0]).toLowerCase() === "set" && String(c[1]).startsWith("tricognita:leads:entry:"));
  assert.ok(stored, "no entry was written to the stub");
  assert.equal(JSON.parse(String(stored[2])).kind, "scoping_call");
  assert.ok(commands.some((c) => String(c[1]).startsWith("tricognita:leads:dedup:scoping_call:")), "dedup key does not use scoping_call");
});

test("/api/leads deduped confirmation makes no response-time promise either", async () => {
  const { status, json } = await callApi({ kind: "scoping_call", name: "Test", email: "test@example.com" }, { dedup: true });
  assert.equal(status, 201);
  assert.equal(json.status, "deduped");
  assert.equal(json.message, LEAD_CONFIRMATION.deduped);
  assert.ok(!/business day|within \d/i.test(json.message));
});

test("/api/leads accepts every kind, keeps legacy request_demo as submitted, and rejects unknown kinds", async () => {
  for (const kind of LEAD_KINDS) {
    const { status, commands } = await callApi({ kind, name: "Test", email: "test@example.com" });
    assert.equal(status, 201, kind);
    const stored = commands.find((c) => String(c[1]).startsWith("tricognita:leads:entry:"));
    assert.equal(JSON.parse(String(stored![2])).kind, kind, `${kind} was rewritten on submit`);
  }
  for (const kind of ["demo", "scoping", "request-demo", "", "admin"]) {
    const { status, json } = await callApi({ kind, name: "Test", email: "test@example.com" });
    assert.equal(status, 400, `kind "${kind}" was accepted`);
    assert.equal(json.error, "invalid_kind");
  }
  const route = readFileSync(join(ROOT, "app", "api", "leads", "route.ts"), "utf8");
  assert.ok(!/business days/.test(route), "the route still promises a response time");
});
