/**
 * Capability registry and homepage claims guardrails.
 *
 * Source: docs/02_Company/Marketing/TRICOGNITA_WEBSITE_REBUILD_PLAN.md
 * Revision B.1 §3.2–§3.4 and the founder decisions of 2026-09-25.
 *
 * 1. Declared public states never overstate: no product capability is
 *    Available before Gate PR and its own gates pass.
 * 2. Google Cloud is never Available before G-GCP.
 * 3. The research engine is never public; nothing not-validated is public.
 * 4. Service states match the founder-approved list, and no prices are published.
 * 5. The homepage reads states, the product name and founder facts from
 *    lib/marketing/*, links only to real pages, and carries no invented
 *    figures or category language.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  CLOUDS,
  ENABLEMENT_WORDING,
  GATE_PR_PASSED,
  GATES_PASSED,
  PRODUCT_CAPABILITIES,
  PRODUCT_DISPLAY_NAME,
  PRODUCT_NAME_TRADEMARK_CLEARED,
  PRODUCT_PRICING,
  SERVICES,
  capabilityById,
  gatesMet,
  publicCapabilities,
  renderedState,
} from "./marketing/capabilities";
import { COMPANY_VISION, DATA_HANDLING, FOUNDER, MARKETS, PUBLISHED_PROOF } from "./marketing/company";
import { CLOUD_LINKS, DRAFT_ROUTES, FOOTER_COLUMNS, HEADER_CTA, HEADER_NAV, HOW_WE_WORK_HREF, INDEXED_ROUTES, INDUSTRY_LINKS, PLATFORM_HREF, RETIRED_ROUTES, SCOPING_CALL_HREF } from "./marketing/site";
import { CLOUD_COPY, cloudById, productOnCloud, productStateOnCloud, servicesOnCloud, serviceStateOnCloud, summaryFitsCloud, weaker } from "./marketing/clouds";
import { INDUSTRIES, INDUSTRIES_HREF } from "./marketing/industries";
import { ENGAGEMENT_FLOW, PEOPLE_DECIDE, STAGES, START_STEPS } from "./marketing/method";
import { CHOOSER, FIXED_AFTER_SCOPING, SERVICE_DETAILS, serviceCta, serviceGroup, servicePriceLabel } from "./marketing/services";

const MARKETING = join(process.cwd(), "app", "(marketing)");
const HOME = join(MARKETING, "page.tsx");
const homeSource = readFileSync(HOME, "utf8");
const homeCode = homeSource.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");

const ALL = [...SERVICES, ...PRODUCT_CAPABILITIES];

test("capability ids are unique", () => {
  const ids = ALL.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("no declared state needs the gate fail-safe", () => {
  for (const c of ALL) {
    if (c.visibility === "never") continue;
    assert.equal(renderedState(c), c.publicState, `${c.id} declares ${c.publicState} but may only render ${renderedState(c)}`);
  }
});

test("no product capability is Available before Gate PR and its gates pass", () => {
  for (const c of PRODUCT_CAPABILITIES) {
    assert.ok((c.gates ?? []).includes("PR") || c.visibility === "never", `${c.id} must name Gate PR`);
    if (c.publicState === "available") {
      assert.ok(gatesMet(c), `${c.id} is Available with unmet gates`);
      assert.equal(c.implementationStatus, "available", `${c.id} is Available but not built and validated`);
    }
  }
  if (!GATE_PR_PASSED) {
    for (const c of publicCapabilities(PRODUCT_CAPABILITIES)) {
      assert.notEqual(renderedState(c), "available", `${c.id} renders Available before Gate PR`);
    }
  }
});

test("Google Cloud is never Available before G-GCP", () => {
  const gcp = capabilityById("evaluation-gcp");
  assert.ok(gcp, "the Google Cloud capability must stay in the registry (it is advertised)");
  assert.ok(gcp.gates?.includes("G-GCP"));
  if (!GATES_PASSED.includes("G-GCP")) {
    assert.notEqual(renderedState(gcp), "available");
    const cloud = CLOUDS.find((c) => c.id === "gcp");
    assert.ok(cloud);
    assert.notEqual(cloud.servicesState, "available");
    assert.equal(cloud.platformCapabilityId, "evaluation-gcp");
  }
});

test("automated fixes use the exact enablement wording", () => {
  assert.equal(
    ENABLEMENT_WORDING,
    "Supported automated fixes are available by enablement for supported controls, subject to customer authorization.",
  );
  const azure = capabilityById("fixes-azure");
  const aws = capabilityById("fixes-aws");
  assert.ok(azure && aws);
  assert.equal(azure.enablementWording, ENABLEMENT_WORDING);
  assert.equal(aws.enablementWording, ENABLEMENT_WORDING);
  assert.ok(azure.gates?.includes("G-ENABLE"));
  // AWS fixes have never run live: they also wait on G-AWSFIX.
  assert.ok(aws.gates?.includes("G-AWSFIX"));
});

test("the research engine and anything not validated stay off public surfaces", () => {
  for (const c of ALL) {
    if (c.implementationStatus === "not-validated") {
      assert.equal(c.visibility, "never", `${c.id} is not validated but could be shown`);
    }
  }
  const shown = new Set([...publicCapabilities(SERVICES), ...publicCapabilities(PRODUCT_CAPABILITIES)].map((c) => c.id));
  for (const c of ALL.filter((c) => c.visibility === "never")) {
    assert.ok(!shown.has(c.id), `${c.id} is public`);
    assert.ok(!homeSource.includes(c.name), `homepage names ${c.id}`);
  }
});

test("service states match the founder-approved catalogue", () => {
  const expected: Record<string, string> = {
    "cloud-security-assessment": "available",
    "remediation-hardening": "available",
    "security-retainer": "available",
    devsecops: "available",
    "certification-readiness": "available",
    "secure-cloud-engineering": "available",
    resilience: "available",
    "cost-security-review": "available",
    "penetration-testing": "launching",
    "kubernetes-security": "launching",
    "ai-llm-security-testing": "planned",
    "pci-support": "planned",
    "iso-42001": "planned",
  };
  assert.deepEqual(Object.fromEntries(SERVICES.map((s) => [s.id, s.publicState])), expected);
});

test("no prices are published", () => {
  for (const c of ALL) assert.ok(!c.priceFrom, `${c.id} has a price`);
  assert.ok(!/[₹$]\s?\d|\bAED\s?\d|\bINR\s?\d|\bUSD\s?\d/.test(homeCode), "homepage shows a price");
});

// Rendered copy that lives in lib/marketing/* must pass the same rules as pages.
const COPY_FORBIDDEN: [RegExp, string][] = [
  [/\bautonomous\b|self-heal|\bhealing\b|fix(es)? itself|one-click/i, "autonomy"],
  [/immutable|tamper-proof|independently verif/i, "integrity overclaim"],
  [/sovereign|zero cross-border|data residency|data never leaves|India-only|hosted in the UAE/i, "residency claim"],
  [/\bguarantee|\bcompliant\b|audit[- ]ready|multi-?cloud/i, "claims guardrail"],
  [/\bKIRA\b|\bKira\b/, "KIRA (unused candidate name)"],
  [/\bCSPM\b|\bCNAPP\b|\bAI SOC\b|AI[- ]agents?|AI[- ]native|autonomous security/i, "category language"],
];

test("registry and company copy pass the claims guardrails", () => {
  const copy = [
    ...publicCapabilities(SERVICES).map((c) => `${c.name} ${c.summary}`),
    ...publicCapabilities(PRODUCT_CAPABILITIES).map((c) => `${c.name} ${c.summary} ${c.enablementWording ?? ""}`),
    ...CLOUDS.map((c) => `${c.name} ${c.access}`),
    ...MARKETS.map((m) => `${m.name} ${m.body} ${m.rationale}`),
    ...DATA_HANDLING,
    FOUNDER.title,
    ...FOUNDER.focus,
    ...FOUNDER.story,
    COMPANY_VISION,
  ];
  for (const text of copy) {
    for (const [re, label] of COPY_FORBIDDEN) assert.ok(!re.test(text), `"${text}" uses ${label}`);
  }
});

test("founder facts are exactly the approved title and credentials", () => {
  assert.equal(FOUNDER.title, "Founder & Security Engineer — Tricognita");
  assert.equal(FOUNDER.credentials.length, 5);
  for (const c of FOUNDER.credentials) {
    assert.ok(!/OSCP|CREST|CISSP|CISM|CEH/i.test(c), `unapproved credential ${c}`);
  }
});

test("the public product name is ARIA, from config only", () => {
  assert.equal(PRODUCT_DISPLAY_NAME, "ARIA");
  // Clearance is tracked separately from the founder's naming decision.
  assert.equal(typeof PRODUCT_NAME_TRADEMARK_CLEARED, "boolean");
  assert.ok(homeCode.includes("PRODUCT_DISPLAY_NAME"));
  assert.ok(!/\bARIA\b/.test(homeCode), "homepage hard-codes the product name");
  assert.ok(!/Tricognita platform/i.test(homeCode), "homepage still uses the interim product name");
  for (const [re, label] of COPY_FORBIDDEN) assert.ok(!re.test(homeCode), `homepage uses ${label}`);
});

test("homepage renders states from the registry, never literals", () => {
  assert.ok(homeCode.includes('from "@/lib/marketing/capabilities"'));
  assert.ok(!/state=["'{]\s*["']?(available|launching|planned|deferred)/i.test(homeCode), "hard-coded badge state");
  assert.ok(!/publicState\s*[:=]/.test(homeCode), "homepage assigns a state");
});

test("homepage carries no invented figures", () => {
  assert.ok(!/\d+(\.\d+)?\s?(h|hrs?|hours)\b/i.test(homeCode), "hour figures");
  assert.ok(!/\d+(\.\d+)?\s?%/.test(homeCode), "percentages");
  assert.ok(!/\bFTE\b|\d+\s?x (faster|less|more)/i.test(homeCode), "efficiency economics");
  assert.equal(PUBLISHED_PROOF.length, 0, "proof requires written customer approval; update this test when adding it");
});

test("India and the UAE are both represented", () => {
  assert.deepEqual(
    MARKETS.map((m) => m.id),
    ["india", "uae"],
  );
  assert.ok(homeCode.includes("MARKETS.map"));
});

test("Services and Product are both first-class on the homepage", () => {
  // The product appears as one product with its product-level state; its
  // capability list stays on /product.
  for (const id of ['id="services"', 'id="platform"', "publicCapabilities(SERVICES)", "<AriaProductCard"]) {
    assert.ok(homeCode.includes(id), `homepage is missing ${id}`);
  }
});

test("every homepage link resolves", () => {
  const pageFor = (href: string) => {
    const path = href.split(/[?#]/)[0].replace(/\/$/, "");
    return join(MARKETING, path, "page.tsx");
  };
  const literal = [...homeCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1]);
  const cloudPages = CLOUDS.filter((c) => c.id !== "gcp").map((c) => `/cloud/${c.id}`);
  const hrefs = [...literal, ...cloudPages, SCOPING_CALL_HREF, PLATFORM_HREF, "/security"];
  for (const h of new Set(hrefs)) assert.ok(existsSync(pageFor(h)), `${h} → missing ${pageFor(h)}`);
  const anchors = [...homeCode.matchAll(/href=["']#([\w-]+)["']/g)].map((m) => m[1]);
  for (const a of anchors) assert.ok(homeCode.includes(`id="${a}"`), `#${a} has no target`);
});

/* ── /product ──────────────────────────────────────────────────────────── */

const PRODUCT = join(MARKETING, "product", "page.tsx");
const productSource = readFileSync(PRODUCT, "utf8");
const productCode = productSource.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");

test("/product reads states, name and pricing from the registry", () => {
  assert.ok(productCode.includes('from "@/lib/marketing/capabilities"'));
  for (const id of ["PRODUCT_DISPLAY_NAME", "PRODUCT_DESCRIPTOR", "PRODUCT_PRICING", "publicCapabilities(PRODUCT_CAPABILITIES)", "CLOUDS.map"]) {
    assert.ok(productCode.includes(id), `/product does not use ${id}`);
  }
  assert.ok(!/\bARIA\b/.test(productCode), "/product hard-codes the product name");
  assert.ok(!/Tricognita platform/i.test(productCode), "/product still uses the interim product name");
  assert.ok(/title=\{PRODUCT_DISPLAY_NAME\}/.test(productCode), "/product hero is not headed by the product name");
  assert.ok(!/state=["']/.test(productCode), "/product hard-codes a badge state");
  assert.ok(!/publicState\s*[:=]|implementationStatus/.test(productCode), "/product touches internal or declared state");
});

test("/product passes the claims guardrails", () => {
  for (const [re, label] of COPY_FORBIDDEN) assert.ok(!re.test(productCode), `/product uses ${label}`);
  assert.ok(!/continuous|real[- ]time|every day|\bdaily\b|24 ?h/i.test(productCode), "/product claims a re-check frequency");
  assert.ok(!/\d+(\.\d+)?\s?%|\bFTE\b/.test(productCode), "/product has invented figures");
  assert.ok(!/[₹$]\s?\d|\bAED\s?\d|\bINR\s?\d|\bUSD\s?\d/.test(productCode), "/product shows a price");
  assert.ok(!/\d/.test(JSON.stringify(PRODUCT_PRICING)), "pricing carries a number");
  assert.ok(!/AutonomousRemediationView|CloudControlPlane/.test(productCode), "/product uses an excluded visual");
  for (const c of PRODUCT_CAPABILITIES.filter((c) => c.visibility === "never")) {
    assert.ok(!productSource.includes(c.name), `/product names ${c.id}`);
  }
});

test("/product states that fixes are bounded and customer-authorised", () => {
  assert.ok(productCode.includes('id="remediation"'));
  assert.ok(/enablementWording/.test(productCode), "/product omits the approved enablement wording");
  assert.ok(/Not every control has an automated fix/.test(productCode));
  assert.ok(/human-led/.test(productCode));
});

test("/product sample content is labelled as sample", () => {
  const sample = productCode.slice(productCode.indexOf('id="sample-record"'));
  assert.ok(sample.length > 0 && /Sample data/.test(sample) && /not a customer record/.test(sample));
  assert.ok(!/customer[- ]?name|Acme|Contoso/i.test(productCode), "sample names a customer");
});

test("/product has every required section and working links", () => {
  for (const id of [
    "problem", "who", "what", "remediation", "verification", "drift", "evidence",
    "clouds", "capabilities", "human", "services", "pricing", "availability", "sample-record",
  ]) {
    assert.ok(productCode.includes(`id="${id}"`), `/product is missing #${id}`);
  }
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  const hrefs = [...productCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1]);
  for (const h of [...hrefs, "/cloud/aws", "/cloud/azure", SCOPING_CALL_HREF, "/contact"]) {
    assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  }
  for (const [, a] of productCode.matchAll(/href=["']#([\w-]+)["']/g)) {
    assert.ok(productCode.includes(`id="${a}"`), `#${a} has no target`);
  }
  assert.ok(productCode.includes("capability-${c.id}") || productCode.includes("#capability-"));
});

/* ── Product name ──────────────────────────────────────────────────────── */

test("KIRA appears nowhere in marketing source or config", () => {
  const files = [HOME, PRODUCT, ...["capabilities.ts", "company.ts", "site.ts"].map((f) => join(process.cwd(), "lib", "marketing", f))];
  for (const f of files) assert.ok(!/\bKIRA\b/i.test(readFileSync(f, "utf8")), `${f} mentions KIRA`);
});

test("ARIA names only the approval-based control product", () => {
  // The name never attaches to the unpublished engine or to autonomy language.
  for (const c of PRODUCT_CAPABILITIES.filter((c) => c.visibility === "never")) {
    assert.ok(!c.name.includes(PRODUCT_DISPLAY_NAME), `${c.id} carries the product name`);
  }
  for (const code of [homeCode, productCode]) {
    assert.ok(!/autonomous|self-heal|AI[- ]agents?|AI SOC|AIOps|incident[- ]heal/i.test(code));
  }
});

/* ── /about ────────────────────────────────────────────────────────────── */

const ABOUT = join(MARKETING, "about", "page.tsx");
const aboutCode = readFileSync(ABOUT, "utf8").replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");

test("/about reads the product name, founder facts, markets and states from config", () => {
  for (const id of ["PRODUCT_DISPLAY_NAME", "PRODUCT_DESCRIPTOR", "FOUNDER.title", "FOUNDER.credentials", "MARKETS.map", "CLOUDS.map", "renderedState"]) {
    assert.ok(aboutCode.includes(id), `/about does not use ${id}`);
  }
  assert.ok(!/\bARIA\b/.test(aboutCode), "/about hard-codes the product name");
  assert.ok(!/Tricognita platform/i.test(aboutCode), "/about uses the interim product name");
  assert.ok(!/state=["']/.test(aboutCode), "/about hard-codes a badge state");
  assert.ok(aboutCode.includes("SCOPING_CALL_HREF") && aboutCode.includes('"Book a scoping call"'));
});

test("/about carries no stale or unsupported claims", () => {
  for (const [re, label] of COPY_FORBIDDEN) assert.ok(!re.test(aboutCode), `/about uses ${label}`);
  const stale = [
    /sovereign/i, /residency/i, /AI[- ]native/i, /guarantee/i, /Request a demo/i, /Detection Library/i,
    /MITRE|ATT&CK|NIST|PDPL|RBI|SEBI|DPDP/, /Chief Architect|Principal architect/i, /cohort/i,
    /\bOSCP\b|\bCREST\b|\bCISSP\b|\bCISM\b|\bCEH\b/, /pentest team|testing team|our team of/i,
    /\bcertified\b|ISO 27001|SOC 2/i, /customers? (trust|rely)|case stud/i, /\d+\s?(\+|%|customers|clients)/i,
    /lucide-react/,
  ];
  for (const re of stale) assert.ok(!re.test(aboutCode), `/about still contains ${re}`);
});

test("/about shows only the founder as team, with the approved facts", () => {
  assert.ok(!/name:\s*["']/.test(aboutCode), "/about names a person or team member");
  assert.equal(FOUNDER.title, "Founder & Security Engineer — Tricognita");
  assert.ok(FOUNDER.focus.every((f) => !/OSCP|CREST|CISSP|team|certified/i.test(f)));
});

test("/about links resolve", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  const hrefs = [...aboutCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1]);
  for (const h of [...hrefs, SCOPING_CALL_HREF, PLATFORM_HREF, "/product#availability", "/#services"]) {
    assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  }
});

test("/about leads with the founder story, not the homepage hero", () => {
  assert.equal(FOUNDER.name, "Nithish Kumar S");
  assert.ok(FOUNDER.story.length >= 3 && FOUNDER.story.length <= 5);
  for (const id of ["FOUNDER.name", "FOUNDER.story", "COMPANY_VISION", "m.rationale"]) {
    assert.ok(aboutCode.includes(id), `/about does not use ${id}`);
  }
  const at = (id: string) => aboutCode.indexOf(`id="${id}"`);
  assert.ok(at("story") > 0 && at("story") < at("model") && at("story") < at("founder"), "story is not near the top");
  assert.ok(!/We test, fix and verify/i.test(aboutCode), "/about repeats the homepage hero");
  assert.ok(!/title="Cloud Security Engineering"/.test(aboutCode), "/about repeats the homepage eyebrow as its title");
});

test("founder data carries no private details", () => {
  const founder = JSON.stringify(FOUNDER).replace("RH124", "");
  // Comments may state the rule; only values are published.
  const company = readFileSync(join(process.cwd(), "lib", "marketing", "company.ts"), "utf8")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  for (const text of [founder, aboutCode, company]) {
    assert.ok(!/[\w.+-]+@[\w-]+\.\w+/.test(text.replace(/security@tricognita\.com|contact@tricognita\.com/g, "")), "an email address");
    assert.ok(!/\+?\d[\d \-()]{8,}\d/.test(text.replace(/\d{4}-\d{2}-\d{2}/g, "")), "a phone number");
    assert.ok(!/Dindigul|Tamil Nadu|Punjab|Jalandhar|University|Academy|\bage\b|born/i.test(text), "a private or personal detail");
  }
  assert.ok(!/\d/.test(founder.replace(/\d{4}-\d{2}-\d{2}/g, "")), "dates or numbers in founder data");
  assert.deepEqual(Object.keys(FOUNDER).sort(), ["credentials", "focus", "name", "story", "title"]);
});

test("/about keeps ARIA brief and leaves the detail to /product", () => {
  const aria = aboutCode.slice(aboutCode.indexOf('id="aria"'), aboutCode.indexOf('id="markets"'));
  assert.ok(aria.length > 0 && aria.length < 1500, `the ARIA section is ${aria.length} characters`);
  assert.ok(!/CapabilityList|publicCapabilities\(PRODUCT_CAPABILITIES\)\.map/.test(aboutCode), "/about lists product capabilities");
  assert.ok(!/Sample|closure record|drift detection/i.test(aboutCode), "/about repeats /product content");
  assert.ok(aria.includes("PLATFORM_HREF"), "the ARIA section does not link to /product");
});

/* ── /services ─────────────────────────────────────────────────────────── */

const SERVICES_PAGE = join(MARKETING, "services", "page.tsx");
const servicesCode = readFileSync(SERVICES_PAGE, "utf8").replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");

test("every public service has detail, and detail invents no service", () => {
  const ids = publicCapabilities(SERVICES).map((c) => c.id).sort();
  assert.deepEqual(Object.keys(SERVICE_DETAILS).sort(), ids);
});

test("only Available services can be booked", () => {
  for (const c of SERVICES) {
    const cta = serviceCta(c);
    const state = renderedState(c);
    if (state === "available") {
      assert.ok(cta && cta.label === "Book a scoping call" && cta.href.startsWith(SCOPING_CALL_HREF), `${c.id} cannot be booked`);
    }
    if (state === "launching") {
      assert.ok(cta && cta.label === "Register interest" && !cta.href.startsWith(SCOPING_CALL_HREF), `${c.id} is bookable while Launching`);
      assert.ok(!/intent=scoping/.test(cta.href) && /intent=interest/.test(cta.href));
    }
    if (state === "planned" || state === "deferred") assert.equal(cta, null, `${c.id} has a CTA while ${state}`);
  }
  // The page renders service CTAs only through serviceCta.
  assert.ok(!/SCOPING_CTA\s*\}\s*\/>\s*<\/(article|li)>/.test(servicesCode));
  assert.ok(servicesCode.includes("serviceCta(service)"));
});

test("service grouping follows Rev B.1", () => {
  const group = (g: string) => publicCapabilities(SERVICES).filter((c) => serviceGroup(c) === g).map((c) => c.id);
  assert.deepEqual(group("primary"), ["cloud-security-assessment", "penetration-testing", "remediation-hardening", "security-retainer"]);
  for (const id of ["devsecops", "certification-readiness", "secure-cloud-engineering", "resilience", "cost-security-review"]) {
    assert.ok(group("supporting").includes(id), `${id} is not a supporting service`);
  }
  for (const id of ["kubernetes-security", "ai-llm-security-testing", "pci-support", "iso-42001"]) {
    assert.ok(group("specialist").includes(id), `${id} is not a specialist service`);
  }
});

test("ARIA support references real, public product capabilities", () => {
  const product = new Set(publicCapabilities(PRODUCT_CAPABILITIES).map((c) => c.id));
  for (const [id, d] of Object.entries(SERVICE_DETAILS)) {
    for (const cap of d.aria) assert.ok(product.has(cap), `${id} cites ${cap}, which is not a public product capability`);
  }
  for (const c of CHOOSER) assert.ok(capabilityById(c.serviceId), `chooser points at unknown ${c.serviceId}`);
  if (!GATE_PR_PASSED) {
    assert.match(SERVICE_DETAILS["security-retainer"].ariaNote, /as its capabilities launch/, "retainer implies platform access today");
  }
});

test("service content passes the claims guardrails", () => {
  const texts = Object.values(SERVICE_DETAILS).flatMap((d) => [d.audience, d.work, d.ariaNote, ...d.triggers, ...d.scope, ...d.receives]);
  for (const t of [...texts, servicesCode]) {
    for (const [re, label] of COPY_FORBIDDEN) assert.ok(!re.test(t), `"${t.slice(0, 60)}" uses ${label}`);
    assert.ok(!/\bOSCP\b|\bCREST\b|\bCISSP\b|pentest team|testing team|our testers|\bcertified\b|Request a demo|AI[- ]native/i.test(t), `"${t.slice(0, 60)}" makes an unsupported claim`);
    assert.ok(!/\d+(\.\d+)?\s?%|\bFTE\b|[₹$]\s?\d|\bAED\s?\d|\bINR\s?\d/.test(t), `"${t.slice(0, 60)}" has figures or prices`);
  }
});

test("/services reads names, states and the product name from config", () => {
  for (const id of ["publicCapabilities(SERVICES)", "PRODUCT_DISPLAY_NAME", "CLOUDS.map", "MARKETS.map", "SERVICE_DETAILS"]) {
    assert.ok(servicesCode.includes(id), `/services does not use ${id}`);
  }
  assert.ok(!/\bARIA\b/.test(servicesCode), "/services hard-codes the product name");
  assert.ok(!/state=["']/.test(servicesCode), "/services hard-codes a badge state");
  for (const s of SERVICES) assert.ok(!servicesCode.includes(`"${s.name}"`), `/services hard-codes ${s.name}`);
});

test("/services is a real page: no redirect, in the nav, links resolve", () => {
  assert.ok(existsSync(SERVICES_PAGE));
  assert.ok(!RETIRED_ROUTES.some((r) => r.source === "/services"), "/services still redirects");
  const services = HEADER_NAV.find((n) => n.label === "Services");
  assert.ok(services && services.kind === "group" && services.items.some((i) => i.href === "/services"));
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const h of [...servicesCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) {
    assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  }
  for (const [, a] of servicesCode.matchAll(/href=\{?["'`]#([\w-]+)["'`]\}?/g)) {
    assert.ok(servicesCode.includes(`id="${a}"`), `#${a} has no target`);
  }
});

/* ── /pricing ──────────────────────────────────────────────────────────── */

const PRICING_PAGE = join(MARKETING, "pricing", "page.tsx");
const pricingCode = readFileSync(PRICING_PAGE, "utf8").replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");

test("service price wording never invents a number", () => {
  for (const c of SERVICES) {
    const label = servicePriceLabel(c);
    const state = renderedState(c);
    if (state === "available" && !c.priceFrom) assert.equal(label, FIXED_AFTER_SCOPING, `${c.id}`);
    if (state === "launching") assert.ok(label && !/\d/.test(label), `${c.id} shows a price while Launching`);
    if (state === "planned") assert.equal(label, null, `${c.id} shows a price while Planned`);
    if (!c.priceFrom) assert.ok(!label || !/\d/.test(label), `${c.id} shows a number with no approved price`);
  }
  // An approved price, once the founder sets one, is the only number that can appear.
  const approved = { ...capabilityById("cloud-security-assessment")!, priceFrom: { india: "₹X" } };
  assert.equal(servicePriceLabel(approved), "From ₹X (India)");
});

test("ARIA has no standalone price and the retainer claim follows the gates", () => {
  assert.ok(!/\d/.test(JSON.stringify(PRODUCT_PRICING)), "product pricing carries a number");
  assert.equal(PRODUCT_PRICING.standalone.state, "launching");
  if (!GATE_PR_PASSED) assert.match(PRODUCT_PRICING.retainer, /as its capabilities launch/);
});

test("/pricing reads states, prices and the product name from config", () => {
  for (const id of [
    "publicCapabilities(SERVICES)", "servicePriceLabel", "serviceCta", "PRODUCT_PRICING",
    "PRODUCT_DISPLAY_NAME", "PRODUCT_DESCRIPTOR", "MARKETS.map", "CLOUDS.map", 'id="retainer"', 'id="aria"',
  ]) {
    assert.ok(pricingCode.includes(id), `/pricing does not use ${id}`);
  }
  assert.ok(!/\bARIA\b/.test(pricingCode), "/pricing hard-codes the product name");
  assert.ok(!/state=["']/.test(pricingCode), "/pricing hard-codes a badge state");
  for (const s of SERVICES) assert.ok(!pricingCode.includes(`"${s.name}"`), `/pricing hard-codes ${s.name}`);
});

test("/pricing has no invented prices, tiers or old product-led content", () => {
  for (const [re, label] of COPY_FORBIDDEN) assert.ok(!re.test(pricingCode), `/pricing uses ${label}`);
  const banned: [RegExp, string][] = [
    [/[₹$€£]\s?\d|\b(AED|INR|USD)\s?\d|\d+\s?(k|K)\b/, "a price"],
    [/\/\s?(mo|month|yr|year)\b|per (seat|user|month|year|control|resource|account|workload)/i, "a unit price"],
    [/\b(Free|Starter|Pro|Business|Enterprise) (plan|tier)\b|\bplans?\b.*\btiers?\b/i, "SaaS tiers"],
    [/\bsave\b|discount|\bROI\b|\d+\s?%|\bFTE\b/i, "savings or ROI"],
    [/Request a demo|Get a quote|connected (cloud )?accounts|daily re-checks|priced by the number/i, "old /pricing content"],
    [/\bOSCP\b|\bCREST\b|\bCISSP\b|\bcertified\b|AI[- ]native/i, "an unsupported claim"],
  ];
  for (const [re, label] of banned) assert.ok(!re.test(pricingCode), `/pricing contains ${label}`);
});

test("/pricing links resolve", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const h of [...pricingCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) {
    assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  }
  for (const [, a] of pricingCode.matchAll(/href: ?["'`]#([\w-]+)["'`]|href=["'`]#([\w-]+)["'`]/g)) {
    if (a) assert.ok(pricingCode.includes(`id="${a}"`), `#${a} has no target`);
  }
});

/* ── /cloud and the three cloud pages ──────────────────────────────────── */

const CLOUD_DIR = join(MARKETING, "cloud");
const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
const CLOUD_SOURCES: Record<string, string> = {
  "/cloud": join(CLOUD_DIR, "page.tsx"),
  "/cloud/aws": join(CLOUD_DIR, "aws", "page.tsx"),
  "/cloud/azure": join(CLOUD_DIR, "azure", "page.tsx"),
  "/cloud/google-cloud": join(CLOUD_DIR, "google-cloud", "page.tsx"),
  CloudDetail: join(process.cwd(), "app", "components", "marketing", "CloudDetail.tsx"),
  clouds: join(process.cwd(), "lib", "marketing", "clouds.ts"),
};
const cloudCode = Object.fromEntries(Object.entries(CLOUD_SOURCES).map(([k, f]) => [k, strip(readFileSync(f, "utf8"))]));

test("all four cloud routes exist, are indexed and linked", () => {
  for (const route of ["/cloud", "/cloud/aws", "/cloud/azure", "/cloud/google-cloud"]) {
    assert.ok(existsSync(CLOUD_SOURCES[route]), `${route} has no page`);
    assert.ok(INDEXED_ROUTES.some((r) => r.path === route), `${route} is not in the sitemap`);
  }
  for (const c of CLOUDS) {
    assert.ok(existsSync(join(CLOUD_DIR, c.slug, "page.tsx")), `${c.id} has no page at /cloud/${c.slug}`);
    assert.ok(CLOUD_LINKS.some((l) => l.href === `/cloud/${c.slug}`), `the Cloud menu does not link ${c.name}`);
  }
  assert.ok(RETIRED_ROUTES.some((r) => r.source === "/cloud/gcp" && r.destination === "/cloud/google-cloud"));
  assert.ok(!RETIRED_ROUTES.some((r) => r.source.startsWith("/cloud/") && r.source !== "/cloud/gcp"), "a live cloud page redirects");
});

test("each cloud detail page renders its own cloud through the shared component", () => {
  for (const [route, id] of [["/cloud/aws", "aws"], ["/cloud/azure", "azure"], ["/cloud/google-cloud", "gcp"]] as const) {
    assert.ok(cloudCode[route].includes(`<CloudDetail id="${id}" />`), `${route} does not render cloud ${id}`);
  }
});

test("cloud pages take every state from the registry and the name from config", () => {
  for (const [name, code] of Object.entries(cloudCode)) {
    assert.ok(!/state=["']/.test(code), `${name} hard-codes a badge state`);
    assert.ok(!/\b(Available|Launching|Planned|Deferred)\b/.test(code), `${name} writes a state label as copy`);
    assert.ok(!/\bARIA\b/.test(code), `${name} hard-codes the product name`);
    assert.ok(!/Tricognita platform/i.test(code), `${name} uses the interim product name`);
    assert.ok(!/publicState\s*[:=]|implementationStatus|servicesState\s*:/.test(code), `${name} sets or reads internal state`);
  }
  // Services by cloud from the registry; ARIA as one product (its capability
  // states by cloud live on /product#clouds).
  assert.ok(cloudCode["/cloud"].includes("serviceStateOnCloud") && cloudCode["/cloud"].includes("<AriaProductCard"));
  assert.ok(cloudCode.CloudDetail.includes("servicesOnCloud(cloud)") && cloudCode.CloudDetail.includes("<AriaProductCard"));
});

test("a service or capability is never more ready on a cloud than the registry allows", () => {
  for (const cloud of CLOUDS) {
    const evaluation = capabilityById(cloud.platformCapabilityId)!;
    for (const s of SERVICES) {
      const st = serviceStateOnCloud(s, cloud);
      if (!s.clouds?.includes(cloud.id)) assert.equal(st, null, `${s.id} renders on ${cloud.id} without covering it`);
      if (st) {
        assert.equal(weaker(st, renderedState(s)), st, `${s.id} on ${cloud.id} is stronger than the service`);
        assert.equal(weaker(st, cloud.servicesState), st, `${s.id} on ${cloud.id} is stronger than the cloud`);
      }
    }
    for (const { capability, state } of productOnCloud(cloud)) {
      assert.notEqual(capability.visibility, "never");
      if (capability.clouds) assert.ok(capability.clouds.includes(cloud.id), `${capability.id} renders on ${cloud.id}`);
      else assert.equal(weaker(state, renderedState(evaluation)), state, `${capability.id} is stronger on ${cloud.id} than evaluation`);
    }
  }
  const cloudIds = new Set(CLOUDS.map((c) => c.id));
  for (const s of SERVICES) for (const c of s.clouds ?? []) assert.ok(cloudIds.has(c), `${s.id} names unknown cloud ${c}`);
});

test("Google Cloud cannot render Available without G-GCP", () => {
  const gcp = cloudById("gcp");
  if (!GATES_PASSED.includes("G-GCP")) {
    assert.notEqual(gcp.servicesState, "available", "Google Cloud services are Available before G-GCP");
    for (const cap of PRODUCT_CAPABILITIES.filter((c) => c.clouds?.includes("gcp"))) {
      assert.notEqual(cap.publicState, "available", `${cap.id} is declared Available on Google Cloud before G-GCP`);
    }
    for (const { service, state } of servicesOnCloud(gcp)) assert.notEqual(state, "available", `${service.id} is Available on Google Cloud`);
    for (const { capability, state } of productOnCloud(gcp)) assert.notEqual(state, "available", `${capability.id} is Available on Google Cloud`);
    for (const cap of PRODUCT_CAPABILITIES) assert.notEqual(productStateOnCloud(cap, gcp), "available");
  }
  assert.ok(cloudCode.clouds.includes('"Google Cloud support') || CLOUD_COPY.gcp.intro.includes("expanding"), "Google Cloud is not described as expanding");
});

test("no old or unsupported cloud-page claims remain", () => {
  const texts = [
    ...Object.values(cloudCode),
    ...Object.values(CLOUD_COPY).flatMap((c) => [c.title, c.intro, c.servicesLine, c.productLine, ...c.access, ...(c.expansion ?? [])]),
    ...CLOUDS.map((c) => c.access),
  ];
  const banned: [RegExp, string][] = [
    [/Request a demo|DEMO_HREF|intent=demo/, "demo CTA"],
    [/only Tricognita can assume|external ID|explicit deny|confused deputy/i, "old AWS access claim"],
    [/\b\d+ of (Tricognita's )?\d+ controls|\b27\b|\b21\b|\b18\b/, "a control count"],
    [/Supported today|What's next|Coming soon/i, "old state wording"],
    [/multi-?cloud|all (cloud )?controls|complete (cloud )?coverage|fully supported|guarantee|continuous|real[- ]time/i, "a coverage or assurance overclaim"],
    [/\b(Q[1-4]|H[12])\s?20\d\d|\b(January|February|March|April|May|June|July|August|September|October|November|December)\s20\d\d|launch(es|ing)? (on|in|by) \d/i, "a launch date"],
    [/\bOSCP\b|\bCREST\b|\bCISSP\b|pentest team|\bcertified\b|AI[- ]native/i, "an unsupported credential"],
  ];
  for (const t of texts) {
    for (const [re, label] of [...banned, ...COPY_FORBIDDEN]) assert.ok(!re.test(t), `cloud copy has ${label}: "${t.slice(0, 70)}"`);
  }
});

test("cloud page links resolve", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const code of Object.values(cloudCode)) {
    for (const h of [...code.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  }
  for (const c of CLOUDS) assert.ok(existsSync(pageFor(`/cloud/${c.slug}`)));
});

test("a cloud page never shows a service summary written for other clouds", () => {
  const gcp = cloudById("gcp");
  assert.equal(summaryFitsCloud("A structured review of your AWS or Azure environment", gcp), false);
  assert.equal(summaryFitsCloud("A structured review of your AWS or Azure environment", cloudById("aws")), true);
  assert.equal(summaryFitsCloud("Recurring review and re-checks", gcp), true);
  assert.ok(cloudCode.CloudDetail.includes("summaryFitsCloud(service.summary, cloud)"));
});

/* ── Service coverage and registry copy ────────────────────────────────── */

test("Google Cloud service coverage is locked to the three approved services", () => {
  const covering = (cloud: string) => SERVICES.filter((s) => s.clouds?.includes(cloud as "aws")).map((s) => s.id).sort();
  assert.deepEqual(covering("gcp"), ["cloud-security-assessment", "remediation-hardening", "security-retainer"]);
  const awsAzure = [
    "certification-readiness", "cloud-security-assessment", "cost-security-review", "devsecops", "kubernetes-security",
    "remediation-hardening", "resilience", "secure-cloud-engineering", "security-retainer",
  ];
  assert.deepEqual(covering("aws"), awsAzure);
  assert.deepEqual(covering("azure"), awsAzure);
  for (const s of SERVICES.filter((x) => x.clouds?.includes("gcp"))) {
    if (!GATES_PASSED.includes("G-GCP")) assert.notEqual(serviceStateOnCloud(s, cloudById("gcp")), "available", `${s.id} on Google Cloud`);
  }
});

test("service summaries are cloud-neutral", () => {
  for (const s of SERVICES) {
    assert.ok(!/\b(AWS|Azure|EKS|AKS|GKE|GCP)\b|Google Cloud/.test(s.summary), `${s.id} summary names a cloud: "${s.summary}"`);
  }
  assert.ok(!/assessor partner/i.test(capabilityById("pci-support")!.summary), "PCI summary implies a partner that does not exist");
});

test("public pages never show internal gate names", () => {
  const pages = [
    "page.tsx", "product/page.tsx", "about/page.tsx", "services/page.tsx", "pricing/page.tsx", "cloud/page.tsx",
    "industries/saas/page.tsx", "industries/fintech/page.tsx",
  ].map((f) => strip(readFileSync(join(MARKETING, f), "utf8")));
  const shared = ["CloudDetail.tsx", "IndustryPage.tsx", "CapabilityList.tsx", "CapabilityBadge.tsx"].map((f) =>
    strip(readFileSync(join(process.cwd(), "app", "components", "marketing", f), "utf8")),
  );
  const copy = JSON.stringify([INDUSTRIES, CLOUD_COPY, SERVICE_DETAILS, PRODUCT_PRICING, SERVICES.map((c) => c.summary), PRODUCT_CAPABILITIES.map((c) => c.summary)]);
  for (const t of [...pages, ...shared, copy]) {
    assert.ok(!/\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR|implementationStatus/.test(t), "a gate name or internal status is published");
  }
});

/* ── Industries ────────────────────────────────────────────────────────── */

const INDUSTRY_SOURCES = {
  saas: join(MARKETING, "industries", "saas", "page.tsx"),
  fintech: join(MARKETING, "industries", "fintech", "page.tsx"),
  component: join(process.cwd(), "app", "components", "marketing", "IndustryPage.tsx"),
  data: join(process.cwd(), "lib", "marketing", "industries.ts"),
};
const industryCode = Object.fromEntries(
  Object.entries(INDUSTRY_SOURCES).map(([k, f]) => [k, strip(readFileSync(f, "utf8"))]),
) as Record<keyof typeof INDUSTRY_SOURCES, string>;
const industryText = (i: (typeof INDUSTRIES)[keyof typeof INDUSTRIES]) => [
  i.title, i.intro, i.challengesTitle, i.ariaIntro, i.navDescription, ...(i.boundary ? [i.boundary] : []),
  ...i.challenges.flatMap((c) => [c.title, c.body]),
  ...i.responses.flatMap((r) => [r.challenge, r.response]),
  ...i.steps.flatMap((s) => [s.title, s.body]),
  ...i.human,
];

test("industry pages exist, are linked and indexed", () => {
  for (const i of Object.values(INDUSTRIES)) {
    const route = `/industries/${i.slug}`;
    assert.ok(existsSync(join(MARKETING, "industries", i.slug, "page.tsx")), `${route} has no page`);
    assert.ok(INDUSTRY_LINKS.some((l) => l.href === route), `${route} is not in the Industries menu`);
    assert.ok(FOOTER_COLUMNS.some((c) => c.items.some((l) => l.href === route)), `${route} is not in the footer`);
    assert.ok(INDEXED_ROUTES.some((r) => r.path === route), `${route} is not in the sitemap`);
  }
  assert.ok(industryCode.saas.includes('<IndustryPage id="saas" />') && industryCode.fintech.includes('<IndustryPage id="fintech" />'));
});

test("industry pages reference only public registry entries", () => {
  const services = new Set(publicCapabilities(SERVICES).map((c) => c.id));
  const product = new Set(publicCapabilities(PRODUCT_CAPABILITIES).map((c) => c.id));
  for (const i of Object.values(INDUSTRIES)) {
    assert.ok(services.has(i.primaryServiceId), `${i.id} hero service is not public`);
    for (const id of i.serviceIds) assert.ok(services.has(id), `${i.id} lists unknown service ${id}`);
    for (const id of i.capabilityIds) assert.ok(product.has(id), `${i.id} lists unknown ${id}`);
    for (const r of i.responses) {
      for (const id of r.serviceIds) assert.ok(services.has(id), `${i.id} response cites ${id}`);
      for (const id of r.capabilityIds) assert.ok(product.has(id), `${i.id} response cites ${id}`);
    }
    for (const st of i.steps) {
      if (st.serviceId) assert.ok(services.has(st.serviceId));
      if (st.capabilityId) assert.ok(product.has(st.capabilityId));
    }
  }
});

test("industry pages take states, CTAs and the product name from config", () => {
  for (const [name, code] of Object.entries(industryCode)) {
    assert.ok(!/state=["']/.test(code), `${name} hard-codes a badge state`);
    assert.ok(!/\b(Available|Launching|Planned|Deferred)\b/.test(code), `${name} writes a state label as copy`);
    assert.ok(!/\bARIA\b/.test(code), `${name} hard-codes the product name`);
    assert.ok(!/Tricognita platform/i.test(code), `${name} uses the interim product name`);
    for (const s of SERVICES) assert.ok(!code.includes(`"${s.name}"`), `${name} hard-codes ${s.name}`);
  }
  // The hero and closing CTAs come from the lead service's state.
  assert.ok(industryCode.component.includes("serviceCta(primary)"));
  assert.ok(!/SCOPING_CALL_HREF|"Book a scoping call"|intent=(scoping|quote)/.test(industryCode.component), "the industry page hard-codes a booking CTA");
});

test("industry copy passes the claims guardrails", () => {
  const banned: [RegExp, string][] = [
    [/autonom|self-heal|\bAI SOC\b|AI[- ]agents?|agentic|\bAIOps\b|incident[- ]heal/i, "autonomy / AI-agent language"],
    [/continuous (protection|assurance|monitoring)|real[- ]time|guarantee|complete coverage|all (cloud )?controls|fully supported/i, "coverage or assurance overclaim"],
    [/tamper|immutable|independently verif/i, "integrity overclaim"],
    [/\b\d+\s?(controls|customers|clients|companies)\b|\d+\s?%|\b(Q[1-4]|H[12])\s?20\d\d/i, "counts, figures or dates"],
    [/sovereign|residency|zero cross-border|hosted in/i, "residency claim"],
    [/Request a demo|\bOSCP\b|\bCREST\b|\bCISSP\b|pentest team/i, "demo CTA or credential"],
    [/\b(PCI|SOC 2|ISO 27001)[- ]?(compliant|certified)|\bcompliant\b|\bcertified\b|regulatory approval (for|of) (you|your)|guaranteed compliance/i, "compliance claim"],
  ];
  for (const i of Object.values(INDUSTRIES)) {
    for (const t of industryText(i)) {
      for (const [re, label] of [...banned, ...COPY_FORBIDDEN]) assert.ok(!re.test(t), `${i.id} copy has ${label}: "${t.slice(0, 70)}"`);
      if (/accredited|assessor/i.test(t)) assert.match(t, /is not an accredited assessor|does not issue/, `${i.id} implies accreditation`);
    }
  }
  assert.match(INDUSTRIES.fintech.boundary ?? "", /does not issue/, "fintech needs its certification boundary");
});

test("industry page links resolve", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const code of Object.values(industryCode)) {
    for (const h of [...code.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  }
});

/* ── /industries hub ───────────────────────────────────────────────────── */

const HUB = join(MARKETING, "industries", "page.tsx");
const hubCode = strip(readFileSync(HUB, "utf8"));

test("/industries exists, is in the header, footer and sitemap", () => {
  assert.equal(INDUSTRIES_HREF, "/industries");
  assert.ok(existsSync(HUB), "/industries has no page");
  const menu = HEADER_NAV.find((n) => n.label === "Industries");
  assert.ok(menu && menu.kind === "group", "the header has no Industries menu");
  assert.deepEqual(
    menu.items.map((l) => l.href),
    ["/industries", ...Object.values(INDUSTRIES).map((i) => `/industries/${i.slug}`)],
    "the Industries menu should be the hub then each industry, nothing else",
  );
  const footer = FOOTER_COLUMNS.find((c) => c.label === "Industries");
  assert.deepEqual(footer?.items.map((l) => [l.label, l.href]), [
    ["Industries", "/industries"],
    ["SaaS", "/industries/saas"],
    ["Fintech", "/industries/fintech"],
  ]);
  assert.ok(INDEXED_ROUTES.some((r) => r.path === "/industries"), "/industries is not in the sitemap");
  assert.match(hubCode, /canonical: INDUSTRIES_HREF/);
});

test("/industries reads the industry registry instead of redefining industries", () => {
  assert.ok(hubCode.includes("Object.values(INDUSTRIES)") && hubCode.includes("industryHref(i)"));
  for (const i of Object.values(INDUSTRIES)) {
    assert.ok(i.summary.length > 0, `${i.id} has no hub summary`);
    // No industry copy is duplicated into the hub.
    for (const t of [i.summary, i.navDescription, i.intro, i.title, ...i.challenges.map((c) => c.title)]) {
      assert.ok(!hubCode.includes(t), `/industries duplicates ${i.id} copy: "${t.slice(0, 50)}"`);
    }
    assert.ok(existsSync(join(MARKETING, "industries", i.slug, "page.tsx")), `/industries/${i.slug} is missing`);
  }
  assert.ok(!/"\/industries\/(saas|fintech)"/.test(hubCode), "/industries hard-codes an industry link");
});

test("/industries takes states, CTAs and the product name from config", () => {
  assert.ok(!/state=["']/.test(hubCode), "hard-coded badge state");
  assert.ok(!/\b(Available|Launching|Planned|Deferred)\b/.test(hubCode), "state label written as copy");
  assert.ok(!/\bARIA\b/.test(hubCode), "hard-coded product name");
  assert.ok(!/Tricognita platform/i.test(hubCode));
  assert.ok(hubCode.includes("serviceCta(lead)"), "the hub CTA is not state-driven");
  assert.ok(!/SCOPING_CALL_HREF|"Book a scoping call"|intent=(scoping|quote)/.test(hubCode), "the hub hard-codes a booking CTA");
  assert.ok(hubCode.includes("CLOUDS.map") && hubCode.includes("capabilityById(cloud.platformCapabilityId)"));
});

test("/industries passes the claims guardrails and hides gate names", () => {
  const banned = [
    /autonom|self-heal|\bAI SOC\b|AI[- ]agents?|agentic|\bAIOps\b|incident[- ]heal/i,
    /continuous (protection|assurance)|real[- ]time|guarantee|complete coverage|all (cloud )?controls|fully supported/i,
    /tamper|immutable|independently verif/i,
    /\b\d+\s?(controls|customers|clients|companies|teams)\b|\d+\s?%|\b(Q[1-4]|H[12])\s?20\d\d/i,
    /sovereign|residency|hosted in|\bcompliant\b|\bcertified\b|accredited/i,
    /Request a demo|\bOSCP\b|\bCREST\b|\bCISSP\b|\bour engineers|pentest team/i,
    /\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR/,
    /testimonial|case stud|trusted by|logo/i,
  ];
  for (const re of [...banned, ...COPY_FORBIDDEN.map(([r]) => r)]) assert.ok(!re.test(hubCode), `/industries matches ${re}`);
  for (const i of Object.values(INDUSTRIES)) {
    for (const re of [...banned, ...COPY_FORBIDDEN.map(([r]) => r)]) assert.ok(!re.test(i.summary), `${i.id} summary matches ${re}`);
  }
});

test("/industries links resolve", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const h of [...hubCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  for (const i of Object.values(INDUSTRIES)) assert.ok(existsSync(pageFor(`/industries/${i.slug}`)));
  for (const c of CLOUDS) assert.ok(existsSync(pageFor(`/cloud/${c.slug}`)));
});

/* ── Legacy /product/* and /solutions/* retirement ─────────────────────── */

/** Every legacy route found on 2026-09-26, with its canonical destination. */
const LEGACY_ROUTES: Record<string, string> = {
  "/product/controls": "/product#controls",
  "/product/drift-detection": "/product#drift",
  "/product/evidence": "/product#evidence",
  "/product/remediation": "/product#remediation",
  "/product/verification": "/product#verification",
  "/solutions": "/services",
  "/solutions/audit-readiness": "/services/certification-readiness",
  "/solutions/customer-security-reviews": "/services#cloud-security-assessment",
};
const APPROVED_ROUTES = [
  "/", "/product", "/about", "/services", "/pricing", "/cloud", "/cloud/aws", "/cloud/azure", "/cloud/google-cloud",
  "/industries", "/industries/saas", "/industries/fintech",
];
const routeFile = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
const pathOf = (href: string) => href.split(/[?#]/)[0];

test("every legacy /product/* and /solutions/* route redirects permanently to its mapped destination", () => {
  for (const [source, destination] of Object.entries(LEGACY_ROUTES)) {
    const r = RETIRED_ROUTES.find((x) => x.source === source);
    assert.ok(r, `${source} is not redirected`);
    assert.equal(r.destination, destination, `${source} redirects to ${r.destination}`);
    assert.ok(!existsSync(routeFile(source)), `${source} still has a page`);
  }
  // No other page is left under the retired trees.
  assert.ok(!existsSync(join(MARKETING, "solutions")), "a /solutions page remains");
  const productDir = join(MARKETING, "product");
  const leftovers = readdirSync(productDir).filter((n) => statSync(join(productDir, n)).isDirectory());
  assert.deepEqual(leftovers, [], `pages remain under /product: ${leftovers.join(", ")}`);
  // next.config turns every RETIRED_ROUTES entry into a permanent redirect.
  const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
  assert.match(config, /RETIRED_ROUTES\.map\(\(r\) => \(\{ source: r\.source, destination: r\.destination, permanent: true \}\)\)/);
});

test("redirect targets exist, anchors are real, and there are no chains", () => {
  const sources = new Set(RETIRED_ROUTES.map((r) => r.source));
  const serviceIds = new Set(publicCapabilities(SERVICES).map((c) => c.id));
  const productSource = readFileSync(join(MARKETING, "product", "page.tsx"), "utf8");
  for (const r of RETIRED_ROUTES) {
    assert.ok(existsSync(routeFile(r.destination)), `${r.source} → ${r.destination}: no page`);
    assert.ok(!sources.has(pathOf(r.destination)), `${r.source} → ${r.destination} is a redirect chain`);
    assert.notEqual(pathOf(r.destination), r.source, `${r.source} redirects to itself`);
    const anchor = r.destination.split("#")[1];
    if (!anchor) continue;
    if (pathOf(r.destination) === "/product") assert.ok(productSource.includes(`id="${anchor}"`), `/product has no #${anchor}`);
    else if (pathOf(r.destination) === "/services") assert.ok(serviceIds.has(anchor), `/services has no #${anchor}`);
    else if (pathOf(r.destination) !== "/security") assert.fail(`unverified anchor ${r.destination}`);
  }
});

test("retired routes are out of the sitemap and navigation; approved routes stay live", () => {
  const sources = RETIRED_ROUTES.map((r) => r.source);
  for (const s of sources) {
    assert.ok(!INDEXED_ROUTES.some((r) => r.path === s), `${s} is in the sitemap`);
    assert.ok(!DRAFT_ROUTES.includes(s), `${s} is a draft route`);
  }
  const navHrefs = [
    ...HEADER_NAV.flatMap((n) => (n.kind === "group" ? n.items.map((i) => i.href) : [n.href])),
    HEADER_CTA.href,
    ...FOOTER_COLUMNS.flatMap((c) => c.items.map((i) => i.href)),
  ];
  for (const h of navHrefs) assert.ok(!sources.includes(pathOf(h)), `navigation links retired route ${h}`);
  for (const route of APPROVED_ROUTES) {
    assert.ok(existsSync(routeFile(route)), `${route} has no page`);
    assert.ok(!sources.includes(route), `${route} is redirected`);
    assert.ok(INDEXED_ROUTES.some((r) => r.path === route), `${route} is not in the sitemap`);
  }
});

test("no public marketing page or shared block links a retired route or says 'Request a demo'", () => {
  const files = [
    ...tsxFilesIn(MARKETING),
    ...tsxFilesIn(join(process.cwd(), "app", "components", "marketing")),
    ...["capabilities.ts", "company.ts", "site.ts", "services.ts", "clouds.ts", "industries.ts"].map((f) => join(process.cwd(), "lib", "marketing", f)),
  ];
  const legacyLink = /["'`](\/product\/(controls|drift-detection|evidence|remediation|verification)|\/solutions)(\/[\w-]*)?["'`#?]/;
  for (const f of files) {
    const code = strip(readFileSync(f, "utf8"));
    assert.ok(!/Request a demo/i.test(code), `${f.replace(process.cwd(), "")} says "Request a demo"`);
    // site.ts holds the redirect table itself.
    if (!f.endsWith("site.ts")) assert.ok(!legacyLink.test(code), `${f.replace(process.cwd(), "")} links a retired route`);
  }
});

test("no public marketing page publishes gate names or prohibited positioning", () => {
  const banned = [
    /\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR/,
    /\bautonom|self-heal|\bAI SOC\b|\bAI[- ]agents?\b|agentic|\bAIOps\b|real[- ]time protection|continuous protection/i,
    /complete coverage|all (cloud )?controls|fully supported|tamper-proof|immutable|independently verif/i,
    /\bKIRA\b/i,
  ];
  for (const f of [...tsxFilesIn(MARKETING), ...tsxFilesIn(join(process.cwd(), "app", "components", "marketing"))]) {
    const code = strip(readFileSync(f, "utf8"));
    for (const re of banned) assert.ok(!re.test(code), `${f.replace(process.cwd(), "")} matches ${re}`);
  }
  assert.equal(PRODUCT_DISPLAY_NAME, "ARIA");
  if (!GATES_PASSED.includes("G-GCP")) {
    assert.notEqual(cloudById("gcp").servicesState, "available");
    assert.notEqual(renderedState(capabilityById("evaluation-gcp")!), "available");
  }
});

function tsxFilesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return tsxFilesIn(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

/* ── /how-we-work ──────────────────────────────────────────────────────── */

const HOW = join(MARKETING, "how-we-work", "page.tsx");
const howCode = strip(readFileSync(HOW, "utf8"));
const methodCode = strip(readFileSync(join(process.cwd(), "lib", "marketing", "method.ts"), "utf8"));
const methodText = [
  ...STAGES.flatMap((st) => [st.name, st.purpose, st.aria, st.boundary, ...st.people]),
  ...START_STEPS.flatMap((x) => [x.title, x.body]),
  ...PEOPLE_DECIDE,
  ...ENGAGEMENT_FLOW.flatMap((x) => [x.title, x.body]),
];

test("/how-we-work exists and every navigation entry points to it", () => {
  assert.equal(HOW_WE_WORK_HREF, "/how-we-work");
  assert.ok(existsSync(HOW), "/how-we-work has no page");
  const header = HEADER_NAV.find((n) => n.label === "How we work");
  assert.ok(header && header.kind === "link" && header.href === "/how-we-work", "header How we work does not link the page");
  const all = [
    ...HEADER_NAV.flatMap((n) => (n.kind === "group" ? n.items : [n])),
    ...FOOTER_COLUMNS.flatMap((c) => c.items),
  ].filter((l) => l.label === "How we work");
  assert.ok(all.length >= 2, "How we work is missing from the menus");
  for (const l of all) assert.equal(l.href, "/how-we-work", `${l.href} is still a homepage anchor`);
  const site = strip(readFileSync(join(process.cwd(), "lib", "marketing", "site.ts"), "utf8"));
  assert.ok(!/["']\/#how["']/.test(site), "a homepage-only How we work link remains");
  assert.ok(INDEXED_ROUTES.some((r) => r.path === "/how-we-work"), "/how-we-work is not in the sitemap");
  assert.match(howCode, /canonical: HOW_WE_WORK_HREF/);
});

test("/how-we-work uses the shared marketing components and registries", () => {
  for (const id of ["PageHero", "Section", "CtaBand", "CapabilityBadge", "StateBadge", "servicesOnCloud(cloud)", "CLOUDS.map", "ARIA_MODEL", "STAGES.map"]) {
    assert.ok(howCode.includes(id), `/how-we-work does not use ${id}`);
  }
});

test("/how-we-work hard-codes no state, product name or booking CTA", () => {
  for (const [name, code] of [["page", howCode], ["method", methodCode]] as const) {
    assert.ok(!/state=["']/.test(code), `${name} hard-codes a badge state`);
    assert.ok(!/\b(Available|Launching|Planned|Deferred)\b/.test(code), `${name} writes a state label as copy`);
    assert.ok(!/\bARIA\b|\bKIRA\b|\bKira\b/.test(code) && !/Tricognita platform/i.test(code), `${name} hard-codes a product name`);
    assert.ok(!/SCOPING_CALL_HREF|"Book a scoping call"|intent=(scoping|quote|demo)/.test(code), `${name} hard-codes a booking CTA`);
    for (const svc of SERVICES) assert.ok(!code.includes(`"${svc.name}"`), `${name} hard-codes ${svc.name}`);
  }
  // The product name reaches every ARIA-labelled place from config.
  assert.ok((howCode.match(/PRODUCT_DISPLAY_NAME/g) ?? []).length >= 8, "the page names the product without the config");
  for (const st of STAGES) assert.ok(st.aria.startsWith(PRODUCT_DISPLAY_NAME), `${st.id} does not name the product from config`);
  assert.ok(howCode.includes("serviceCta(lead)"), "the primary CTA is not state-driven");
});

test("/how-we-work represents both services and ARIA in every stage", () => {
  assert.deepEqual(STAGES.map((st) => st.id), ["test", "fix", "verify", "keep-secure"]);
  const services = new Set(publicCapabilities(SERVICES).map((c) => c.id));
  const product = new Set(publicCapabilities(PRODUCT_CAPABILITIES).map((c) => c.id));
  for (const st of STAGES) {
    assert.ok(st.people.length > 0 && st.serviceIds.length > 0, `${st.id} has no services side`);
    assert.ok(st.aria.length > 0 && st.capabilityIds.length > 0, `${st.id} has no ${PRODUCT_DISPLAY_NAME} side`);
    for (const id of st.serviceIds) assert.ok(services.has(id), `${st.id} cites unknown service ${id}`);
    for (const id of st.capabilityIds) assert.ok(product.has(id), `${st.id} cites unknown capability ${id}`);
    assert.ok(!st.serviceIds.some((id) => product.has(id)) && !st.capabilityIds.some((id) => services.has(id)), `${st.id} mixes services and product`);
  }
  assert.ok(howCode.includes("Services · what our people do") && howCode.includes("· what the software does"));
  assert.ok(PEOPLE_DECIDE.some((d) => /approv/i.test(d)) && PEOPLE_DECIDE.some((d) => /risk/i.test(d)) && PEOPLE_DECIDE.some((d) => /production/i.test(d)));
});

test("/how-we-work keeps Google Cloud Launching and its coverage locked", () => {
  const gcp = cloudById("gcp");
  assert.deepEqual(servicesOnCloud(gcp).map((x) => x.service.id).sort(), ["cloud-security-assessment", "remediation-hardening", "security-retainer"]);
  if (!GATES_PASSED.includes("G-GCP")) {
    assert.notEqual(gcp.servicesState, "available");
    for (const { state } of servicesOnCloud(gcp)) assert.notEqual(state, "available");
    assert.notEqual(renderedState(capabilityById("evaluation-gcp")!), "available");
  }
});

test("/how-we-work copy passes the claims guardrails", () => {
  const banned = [
    /autonom|self-heal|\bAI SOC\b|\bAI[- ]agents?\b|agentic|\bAIOps\b|incident[- ]heal/i,
    /continuous|real[- ]time|guarantee|complete coverage|all (cloud )?controls|fully supported|every day|\bdaily\b|24\/7/i,
    /tamper|immutable|independently verif/i,
    /\b\d+\s?(%|customers|clients|companies|teams|days|weeks|hours|controls)\b|\b(Q[1-4]|H[12])\s?20\d\d|[₹$€£]\s?\d|\b(AED|INR|USD)\s?\d/i,
    /sovereign|residency|hosted in|\bcertified\b|\bcompliant\b|accredited|regulatory approval/i,
    /Request a demo|testimonial|case stud|trusted by|\bOSCP\b|\bCREST\b|\bCISSP\b/i,
    /\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR/,
  ];
  for (const t of [howCode, ...methodText]) {
    for (const re of [...banned, ...COPY_FORBIDDEN.map(([r]) => r)]) assert.ok(!re.test(t), `/how-we-work matches ${re}: "${t.slice(0, 60)}"`);
  }
});

test("/how-we-work links and anchors resolve", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const h of [...howCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  for (const c of CLOUDS) assert.ok(existsSync(pageFor(`/cloud/${c.slug}`)));
  for (const st of STAGES) assert.ok(howCode.includes("id={stage.id}") && /^[a-z-]+$/.test(st.id), `#${st.id} has no target`);
  for (const id of ["start", "aria", "people", "clouds", "flow"]) assert.ok(howCode.includes(`id="${id}"`), `#${id} missing`);
});

/* ── /how-it-works → /how-we-work ─────────────────────────────────────── */

test("/how-it-works is only a permanent redirect, straight to /how-we-work", () => {
  const matches = RETIRED_ROUTES.filter((r) => r.source === "/how-it-works");
  assert.equal(matches.length, 1, "/how-it-works must have exactly one redirect");
  assert.equal(matches[0].destination, "/how-we-work");
  assert.equal(matches[0].destination, HOW_WE_WORK_HREF);
  assert.ok(!existsSync(join(MARKETING, "how-it-works")), "/how-it-works still has a page");
  // No chain: the destination is a live page and not itself redirected.
  assert.ok(existsSync(join(MARKETING, "how-we-work", "page.tsx")), "/how-we-work has no page");
  assert.ok(!RETIRED_ROUTES.some((r) => r.source === "/how-we-work"), "/how-we-work is redirected (chain)");
  const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
  assert.match(config, /RETIRED_ROUTES\.map\(\(r\) => \(\{ source: r\.source, destination: r\.destination, permanent: true \}\)\)/);
});

test("/how-it-works is out of the sitemap, navigation and every marketing page", () => {
  assert.ok(!INDEXED_ROUTES.some((r) => r.path === "/how-it-works"), "/how-it-works is in the sitemap");
  assert.ok(!DRAFT_ROUTES.includes("/how-it-works"));
  assert.ok(INDEXED_ROUTES.some((r) => r.path === "/how-we-work"), "/how-we-work left the sitemap");
  const nav = [
    ...HEADER_NAV.flatMap((n) => (n.kind === "group" ? n.items.map((i) => i.href) : [n.href])),
    HEADER_CTA.href,
    ...FOOTER_COLUMNS.flatMap((c) => c.items.map((i) => i.href)),
  ];
  for (const h of nav) assert.ok(!h.startsWith("/how-it-works"), `navigation links ${h}`);
  for (const f of [...tsxFilesIn(MARKETING), ...tsxFilesIn(join(process.cwd(), "app", "components", "marketing"))]) {
    assert.ok(!/how-it-works/.test(readFileSync(f, "utf8")), `${f.replace(process.cwd(), "")} links /how-it-works`);
  }
});
