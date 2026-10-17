/**
 * Contact and lead-intake guardrails (scoping-call model, 2026-09-26).
 *
 * 1. /contact exists and reads its query parameters through the safe parser.
 * 2. Legacy demo URLs redirect permanently, in one hop, to the scoping flow.
 * 3. The public intake speaks the scoping model, not the demo model.
 * 4. intent, service, cloud and source are parsed against the registries;
 *    anything else is ignored.
 * 5. Service and cloud choices come from the registry; Planned services are
 *    never offered and Launching ones can only register interest.
 * 6. The product name, Google Cloud's state, gate names and the internal
 *    engine follow the same rules as every other marketing surface.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CLOUDS,
  GATES_PASSED,
  PRODUCT_CAPABILITIES,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  renderedState,
  SERVICES,
} from "./marketing/capabilities";
import {
  CONTACT_INTENTS,
  CONTACT_PATH,
  CONTACT_SOURCES,
  CONTACT_TOPICS,
  contactCloudOptions,
  contactHref,
  contactServiceOptions,
  effectiveIntent,
  leadPayload,
  parseContactParams,
  serviceStateFor,
} from "./marketing/contact";
import { cloudById, serviceStateOnCloud } from "./marketing/clouds";
import { ctaForState, serviceCta } from "./marketing/services";
import { FOOTER_COLUMNS, HEADER_CTA, HEADER_NAV, PLATFORM_TALK_HREF, RETIRED_ROUTES, SCOPING_CALL_HREF } from "./marketing/site";

const ROOT = process.cwd();
const MARKETING = join(ROOT, "app", "(marketing)");
const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
const PAGE = join(MARKETING, "contact", "page.tsx");
const FORM = join(ROOT, "app", "components", "marketing", "ContactForm.tsx");
const LIB = join(ROOT, "lib", "marketing", "contact.ts");
const pageCode = strip(readFileSync(PAGE, "utf8"));
const formCode = strip(readFileSync(FORM, "utf8"));
const libCode = strip(readFileSync(LIB, "utf8"));
const params = (href: string) => Object.fromEntries(new URL(href, "https://x.test").searchParams);

const available = contactServiceOptions().find((s) => s.state === "available")!;
const launching = contactServiceOptions().find((s) => s.state === "launching");
const planned = publicCapabilities(SERVICES).find((s) => renderedState(s) === "planned");

test("/contact exists, is canonical and reads its parameters through the safe parser", () => {
  assert.ok(existsSync(PAGE));
  assert.equal(CONTACT_PATH, "/contact");
  assert.match(pageCode, /canonical: CONTACT_PATH/);
  assert.match(pageCode, /parseContactParams\(await searchParams\)/);
  assert.match(pageCode, /Tell us what you need secured\./);
});

test("the canonical scoping intent is the site's booking link", () => {
  assert.equal(SCOPING_CALL_HREF, "/contact?intent=scoping");
  assert.deepEqual(HEADER_CTA, { href: SCOPING_CALL_HREF, label: "Book a scoping call" });
  assert.equal(CONTACT_INTENTS[0].value, "scoping");
  assert.equal(CONTACT_INTENTS[0].label, "Book a scoping call");
});

test("legacy demo URLs redirect permanently, in one hop, to the scoping flow", () => {
  for (const source of ["/request-demo", "/pilot-application"]) {
    const r = RETIRED_ROUTES.find((x) => x.source === source);
    assert.ok(r, `${source} is not redirected`);
    assert.equal(r.destination, SCOPING_CALL_HREF, `${source} → ${r.destination}`);
    assert.ok(!existsSync(join(MARKETING, source.slice(1), "page.tsx")), `${source} still has a page`);
  }
  const sources = new Set(RETIRED_ROUTES.map((r) => r.source));
  assert.ok(!sources.has(CONTACT_PATH), "/contact is itself redirected (chain)");
  const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
  assert.match(config, /permanent: true/);
  // The redirect target parses to the scoping intent, with extra parameters kept.
  assert.equal(parseContactParams(params(SCOPING_CALL_HREF)).intent, "scoping");
  assert.deepEqual(parseContactParams(params(`${SCOPING_CALL_HREF}&service=${available.id}&cloud=aws&source=pricing`)), {
    intent: "scoping",
    topic: "services",
    serviceId: available.id,
    cloud: "aws",
    source: "pricing",
  });
});

test("the public intake speaks the scoping model, not the demo model", () => {
  for (const [name, code] of [["contact page", pageCode], ["contact form", formCode]] as const) {
    assert.ok(!/demo/i.test(code), `${name} still mentions a demo`);
    assert.ok(!/walkthrough|sample organisation/i.test(code), `${name} still describes the demo walkthrough`);
  }
  for (const i of CONTACT_INTENTS) assert.ok(!/demo/i.test(i.label), `intent label "${i.label}"`);
  // The only demo reference left in the intake library is the legacy URL alias.
  const demoRefs = [...libCode.matchAll(/[\w"]*demo[\w"]*/gi)].map((m) => m[0]);
  assert.deepEqual([...new Set(demoRefs)], ["demo"], `unexpected demo references: ${demoRefs}`);
  assert.ok(!libCode.includes("request_demo"), "the intake still produces the legacy request_demo kind");
  for (const h of [
    ...HEADER_NAV.flatMap((n) => (n.kind === "group" ? n.items.map((i) => i.href) : [n.href])),
    ...FOOTER_COLUMNS.flatMap((c) => c.items.map((i) => i.href)),
    PLATFORM_TALK_HREF,
  ]) {
    assert.ok(!/intent=(demo|quote)/.test(h), `${h} uses a legacy intent`);
  }
});

test("intent= is parsed safely, with legacy values mapped to scoping", () => {
  assert.equal(parseContactParams({}).intent, "scoping");
  for (const i of CONTACT_INTENTS) {
    if (i.value !== "interest") assert.equal(parseContactParams({ intent: i.value }).intent, i.value);
  }
  assert.equal(parseContactParams({ intent: "demo" }).intent, "scoping");
  assert.equal(parseContactParams({ intent: "quote" }).intent, "scoping");
  for (const bad of ["admin", "DEMO", "scoping<script>", "../../x", "", "a".repeat(80)]) {
    assert.equal(parseContactParams({ intent: bad }).intent, "scoping", `intent=${bad}`);
  }
  assert.equal(parseContactParams({ intent: ["security", "general"] }).intent, "security");
});

test("service= is parsed against the registry", () => {
  assert.equal(parseContactParams({ service: available.id }).serviceId, available.id);
  assert.equal(parseContactParams({ service: available.id }).intent, "scoping");
  if (launching) {
    const p = parseContactParams({ intent: "scoping", service: launching.id });
    assert.equal(p.serviceId, launching.id);
    assert.equal(p.intent, "interest", "a Launching service became bookable through the URL");
  }
  if (planned) assert.equal(parseContactParams({ service: planned.id }).serviceId, undefined, "a Planned service was prefilled");
  for (const bad of ["cloud-google-cloud", "evaluation-aws", "internal-research-engine", "x", "Cloud Security Assessment"]) {
    assert.equal(parseContactParams({ service: bad }).serviceId, undefined, `service=${bad}`);
  }
});

test("cloud= is parsed against the cloud registry", () => {
  for (const c of CLOUDS) {
    assert.equal(parseContactParams({ cloud: c.id }).cloud, c.id);
    assert.equal(parseContactParams({ cloud: c.slug }).cloud, c.id);
  }
  for (const bad of ["oracle", "AWS", "multi", "gcp-prod"]) assert.equal(parseContactParams({ cloud: bad }).cloud, undefined, `cloud=${bad}`);
});

test("source= is parsed against a closed list", () => {
  for (const s of CONTACT_SOURCES) assert.equal(parseContactParams({ source: s }).source, s);
  assert.equal(parseContactParams({ source: "product" }).topic, "product");
  for (const bad of ["google", "https://evil.test", "product<x>", "PRODUCT"]) {
    assert.equal(parseContactParams({ source: bad }).source, undefined, `source=${bad}`);
  }
});

test("unknown parameters are ignored and never reach the result", () => {
  const p = parseContactParams({ role: "ADMIN", tenant: "t1", redirect: "https://evil.test", gate: "G-GCP", intent: "general" });
  assert.deepEqual(p, { intent: "general", topic: undefined, serviceId: undefined, cloud: undefined, source: undefined });
});

test("service choices come from the registry; Planned services are never offered", () => {
  const expected = publicCapabilities(SERVICES)
    .filter((s) => ["available", "launching"].includes(renderedState(s)))
    .map((s) => [s.id, s.name]);
  assert.deepEqual(contactServiceOptions().map((o) => [o.id, o.name]), expected);
  for (const o of contactServiceOptions()) assert.notEqual(o.state, "planned");
  assert.ok(formCode.includes("contactServiceOptions()") && !/"(Available|Launching|Planned)"/.test(formCode), "form hard-codes service states");
});

test("cloud choices come from the cloud registry", () => {
  const options = contactCloudOptions();
  assert.deepEqual(options.slice(0, CLOUDS.length).map((o) => [o.value, o.label]), CLOUDS.map((c) => [c.id, c.name]));
  assert.deepEqual(options.slice(CLOUDS.length).map((o) => o.value), ["multi", "unknown"]);
  assert.ok(formCode.includes("contactCloudOptions()"));
  // Every value is one the lead API accepts.
  const api = readFileSync(join(ROOT, "app", "api", "leads", "route.ts"), "utf8");
  for (const o of options) assert.ok(api.includes(`"${o.value}"`), `/api/leads does not accept cloud ${o.value}`);
});

test("the product choice uses the configured product name", () => {
  assert.equal(CONTACT_TOPICS.find((t) => t.value === "product")?.label, PRODUCT_DISPLAY_NAME);
  for (const code of [pageCode, formCode, libCode]) assert.ok(!/\bARIA\b|\bKIRA\b/i.test(code.replace(/aria-\w+/g, "")), "hard-coded product name");
});

test("a Planned or Launching service can never produce a booking", () => {
  assert.equal(ctaForState("planned", "x"), null);
  assert.equal(ctaForState("deferred", "x"), null);
  assert.match(ctaForState("launching", "x")!.href, /intent=interest/);
  for (const s of SERVICES) {
    const cta = serviceCta(s);
    if (renderedState(s) !== "available") assert.ok(!cta || !/intent=scoping/.test(cta.href), `${s.id} links to a booking`);
  }
  if (launching) {
    assert.equal(effectiveIntent("scoping", launching.id), "interest");
    const body = leadPayload({ intent: "scoping", serviceId: launching.id, name: "n", email: "e@x.io", organisation: "o", role: "r" });
    assert.equal(body.kind, "contact", "a Launching service was submitted as a booking");
    assert.match(body.use_case, /^Intent: Register interest/);
  }
});

test("the lead payload fits the existing /api/leads contract", () => {
  const body = leadPayload({
    intent: "scoping", topic: "both", serviceId: available.id, cloud: "aws", source: "pricing",
    name: "Ada", email: "ada@example.com", organisation: "Org", role: "Security", message: "SOC 2 in March",
  });
  assert.equal(body.kind, "scoping_call");
  assert.equal(body.context.primary_cloud, "aws");
  assert.match(body.use_case, /^Intent: Book a scoping call/);
  for (const part of [`Service: ${available.name}`, "Cloud: AWS", "Source: pricing", `About: Both services and ${PRODUCT_DISPLAY_NAME}`]) {
    assert.ok(body.use_case.includes(part), `use_case lacks ${part}`);
  }
  assert.equal(leadPayload({ intent: "security", name: "n", email: "e@x.io", organisation: "o", role: "r" }).kind, "contact");
  const leads = readFileSync(join(ROOT, "lib", "leads.ts"), "utf8");
  const kinds = readFileSync(join(ROOT, "lib", "lead-kinds.ts"), "utf8");
  assert.ok(leads.includes('from "./lead-kinds"'), "the lead store does not use the shared kinds");
  for (const kind of ["scoping_call", "contact"]) assert.ok(kinds.includes(`"${kind}"`), `lead store has no kind ${kind}`);
});

test("Google Cloud stays Launching; choosing it claims nothing", () => {
  const gcp = contactCloudOptions().find((o) => o.value === "gcp");
  assert.ok(gcp);
  if (!GATES_PASSED.includes("G-GCP")) assert.notEqual(gcp.servicesState, "available");
  // Choosing Google Cloud alone leaves a scoping call; choosing a service for it
  // can only register interest while its services are not Available there.
  assert.equal(parseContactParams({ cloud: "gcp" }).intent, "scoping");
  if (!GATES_PASSED.includes("G-GCP")) {
    assert.equal(parseContactParams({ cloud: "gcp", service: available.id }).intent, "interest", "a Google Cloud service became bookable");
  }
});

test("contact surfaces publish no gate names, internal engine or stale claims", () => {
  const e2 = PRODUCT_CAPABILITIES.filter((c) => c.visibility === "never");
  for (const code of [pageCode, formCode, libCode]) {
    assert.ok(!/\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR|implementationStatus/.test(code));
    assert.ok(!/\/api\/aria|healing|autonom|AIOps|AI agent/i.test(code));
    assert.ok(!/free (assessment|pentest|penetration)|guarantee|within \d|instant|sovereign|residency|India-only|zero cross-border/i.test(code));
  }
  for (const c of e2) assert.ok(!contactServiceOptions().some((o) => o.id === c.id));
});

test("every CTA that opens the form is built by contactHref", () => {
  assert.equal(contactHref({ intent: "interest", service: "s", cloud: "gcp", source: "cloud" }), "/contact?intent=interest&service=s&cloud=gcp&source=cloud");
  const parsed = parseContactParams(params(PLATFORM_TALK_HREF));
  assert.equal(parsed.source, "product");
  assert.equal(parsed.topic, "product");
  const cloudDetail = readFileSync(join(ROOT, "app", "components", "marketing", "CloudDetail.tsx"), "utf8");
  assert.ok(!cloudDetail.includes("cloud-${cloud.slug}"), "the cloud page still sends a fake service id");
});

test("the intent follows the service's state on the chosen cloud", () => {
  const gcp = cloudById("gcp");
  for (const o of contactServiceOptions()) {
    const service = SERVICES.find((s) => s.id === o.id)!;
    for (const cloud of CLOUDS) {
      const onCloud = service.clouds ? serviceStateOnCloud(service, cloud) : renderedState(service);
      const expected = onCloud === "available" ? "scoping" : "interest";
      assert.equal(parseContactParams({ intent: "scoping", service: o.id, cloud: cloud.id }).intent, expected, `${o.id} on ${cloud.id}`);
      assert.equal(serviceStateFor(o.id, cloud.id), onCloud ?? "launching");
    }
  }
  // The Google Cloud page's own links never open a booking.
  if (!GATES_PASSED.includes("G-GCP")) {
    for (const o of contactServiceOptions()) {
      assert.notEqual(parseContactParams({ intent: "interest", service: o.id, cloud: gcp.id }).intent, "scoping", `${o.id} bookable on Google Cloud`);
      const body = leadPayload({ intent: "scoping", serviceId: o.id, cloud: "gcp", name: "n", email: "e@x.io", organisation: "o", role: "r" });
      assert.equal(body.kind, "contact", `${o.id} on Google Cloud submitted as a booking`);
      assert.ok(!/\(Available\)/.test(body.use_case), `${o.id} on Google Cloud is labelled Available in the inbox`);
    }
  }
  // Without a named cloud (or "more than one"), the service's own state decides.
  assert.equal(parseContactParams({ service: available.id }).intent, "scoping");
  assert.equal(effectiveIntent("scoping", available.id, "multi"), "scoping");
});
