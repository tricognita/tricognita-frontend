/**
 * /security (Trust & Security) guardrails.
 *
 * Every public security claim must trace to a row of the product truth
 * register (docs/02_Company/Marketing/MARKETING_CLAIMS_GUARDRAILS.md §2): an
 * AVAILABLE row, or a GATED / FORBIDDEN row used only with its approved
 * wording. The page must publish no secrets or infrastructure details, no
 * certification, residency or proof it cannot back, and keep /trust as a
 * single-hop legacy redirect.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { CLOUDS, GATES_PASSED, PRODUCT_DISPLAY_NAME, capabilityById, renderedState } from "./marketing/capabilities";
import { DATA_HANDLING, ENGINEERING_PRINCIPLES, PUBLISHED_PROOF } from "./marketing/company";
import {
  CERTIFICATION_STATEMENT,
  CHANGE_FLOW,
  CUSTOMER_CONTROL,
  EVIDENCE_CLAIMS,
  NOT_CLAIMED,
  PLATFORM_CLAIMS,
  REMEDIATION_RULES,
} from "./marketing/security";
import { FOOTER_COLUMNS, HEADER_CTA, HEADER_NAV, INDEXED_ROUTES, LEGAL_LINKS, RETIRED_ROUTES } from "./marketing/site";

const ROOT = process.cwd();
const MARKETING = join(ROOT, "app", "(marketing)");
const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
const PAGE = join(MARKETING, "security", "page.tsx");
const pageCode = strip(readFileSync(PAGE, "utf8"));
const CLAIMS = [...CUSTOMER_CONTROL, ...REMEDIATION_RULES, ...EVIDENCE_CLAIMS, ...PLATFORM_CLAIMS];
const COPY = [
  ...CLAIMS.map((c) => c.text),
  ...NOT_CLAIMED,
  CERTIFICATION_STATEMENT,
  ...CHANGE_FLOW.flatMap((f) => [f.step, f.body]),
  ...ENGINEERING_PRINCIPLES.flatMap((p) => [p.title, p.body]),
  ...DATA_HANDLING,
];
const ALL_TEXT = [pageCode, ...COPY];

/** Register rows: id → { status, wording }. */
// The claims register is an internal document kept in the monorepo only; the
// standalone frontend repository skips the register trace and the monorepo
// enforces it. Every other check in this file runs in both.
const REGISTER_PATH = join(ROOT, "..", "docs", "02_Company", "Marketing", "MARKETING_CLAIMS_GUARDRAILS.md");
const NO_REGISTER = !existsSync(REGISTER_PATH) && "claims register is not in this repository";
const REGISTER = new Map<string, { status: string; wording: string }>();
for (const line of (NO_REGISTER ? "" : readFileSync(REGISTER_PATH, "utf8")).split("\n")) {
  const m = line.match(/^\| ([A-Z]\d+) \| [^|]* \| ([^|]+) \| ([^|]*) \|/);
  if (m) REGISTER.set(m[1], { status: m[2].trim(), wording: m[3].trim() });
}

test("/security exists, is canonical and in the sitemap", () => {
  assert.ok(existsSync(PAGE));
  assert.match(pageCode, /canonical: "\/security"/);
  assert.match(pageCode, /title: "Trust & Security"/);
  assert.ok(INDEXED_ROUTES.some((r) => r.path === "/security"), "/security is not in the sitemap");
});

test("/trust is a single-hop permanent redirect to /security", () => {
  const r = RETIRED_ROUTES.filter((x) => x.source === "/trust");
  assert.equal(r.length, 1);
  assert.equal(r[0].destination, "/security");
  assert.ok(!existsSync(join(MARKETING, "trust")), "/trust still has a page");
  const sources = new Set(RETIRED_ROUTES.map((x) => x.source));
  for (const x of RETIRED_ROUTES.filter((y) => y.destination.startsWith("/security"))) {
    assert.ok(!sources.has(x.destination.split("#")[0]), `${x.source} → ${x.destination} is a chain`);
  }
  assert.ok(!sources.has("/security"), "/security is redirected");
  assert.match(readFileSync(join(ROOT, "next.config.ts"), "utf8"), /permanent: true/);
});

test("redirects and links into /security land on real sections", () => {
  const targets = [
    ...RETIRED_ROUTES.map((r) => r.destination),
    ...LEGAL_LINKS.map((l) => l.href),
    ...FOOTER_COLUMNS.flatMap((c) => c.items.map((i) => i.href)),
  ].filter((h) => h.startsWith("/security#"));
  assert.ok(targets.length >= 3);
  for (const t of targets) assert.ok(pageCode.includes(`id="${t.split("#")[1]}"`), `${t} has no target`);
});

test("navigation uses /security, never /trust", () => {
  const nav = [
    ...HEADER_NAV.flatMap((n) => (n.kind === "group" ? n.items.map((i) => i.href) : [n.href])),
    HEADER_CTA.href,
    ...FOOTER_COLUMNS.flatMap((c) => c.items.map((i) => i.href)),
    ...LEGAL_LINKS.map((l) => l.href),
  ];
  assert.ok(nav.some((h) => h.startsWith("/security")), "navigation does not link /security");
  assert.ok(!nav.some((h) => h.split(/[?#]/)[0] === "/trust"), "navigation links /trust");
});

test("every security claim traces to the claims register", { skip: NO_REGISTER }, () => {
  assert.ok(REGISTER.size > 40, "could not read the claims register");
  for (const c of CLAIMS) {
    const row = REGISTER.get(c.source);
    assert.ok(row, `${c.source} is not a register row`);
    if (row.status.startsWith("AVAILABLE")) continue;
    // A gated or forbidden row may only be used with its exact approved wording.
    assert.ok(row.wording.includes(c.text), `"${c.text}" uses ${c.source} (${row.status}) without its approved wording`);
  }
  // Rows that must never back a public claim here.
  for (const banned of ["C5", "C8", "R4", "E4", "S4", "S5", "S7"]) {
    assert.ok(!CLAIMS.some((c) => c.source === banned), `a claim cites ${banned}`);
  }
  assert.ok(REGISTER.get("S6")!.wording.includes(CERTIFICATION_STATEMENT), "the certification statement is not the approved S6 wording");
  for (const id of ["CUSTOMER_CONTROL", "REMEDIATION_RULES", "EVIDENCE_CLAIMS", "PLATFORM_CLAIMS", "CERTIFICATION_STATEMENT", "NOT_CLAIMED", "ENGINEERING_PRINCIPLES"]) {
    assert.ok(pageCode.includes(id), `/security does not render ${id}`);
  }
  assert.ok(readFileSync(join(MARKETING, "about", "page.tsx"), "utf8").includes("ENGINEERING_PRINCIPLES"), "/about no longer shares the principles");
});

test("DATA_HANDLING and PUBLISHED_PROOF are respected", () => {
  assert.ok(pageCode.includes("DATA_HANDLING.map"));
  assert.ok(pageCode.includes("PUBLISHED_PROOF.length > 0"), "proof is not conditional on approved proof");
  if (PUBLISHED_PROOF.length === 0) assert.match(pageCode, /no customer case studies, audit reports or penetration test reports to publish yet/);
  for (const t of ALL_TEXT) {
    assert.ok(!/sovereign|in-region|zero cross-border|India-only|UAE-local|hosted in|stored in (India|the UAE)|data never leaves|never see your data|cannot read your data/i.test(t), `data claim: "${t.slice(0, 60)}"`);
    assert.ok(!/retain(ed|s)? for \d|deleted within|within \d+ (days|hours)|encrypted at rest|AES|end-to-end encrypt/i.test(t), `retention or encryption claim: "${t.slice(0, 60)}"`);
  }
  // "Residency" may appear only where it is explicitly not claimed.
  for (const t of [pageCode, ...CLAIMS.map((c) => c.text), ...DATA_HANDLING]) assert.ok(!/residency/i.test(t));
});

test("no certification, accreditation or fake proof claims", () => {
  for (const t of ALL_TEXT) {
    const withoutStatement = t.replace(CERTIFICATION_STATEMENT, "");
    assert.ok(!/SOC 2|ISO 27001|ISO 42001|\bPCI\b/.test(withoutStatement), `certification named outside the approved statement: "${t.slice(0, 60)}"`);
    assert.ok(!/\bcertified\b|accredit|audited|\bOSCP\b|\bCREST\b|\bCISSP\b|regulatory approval|compliant/i.test(t), `credential claim: "${t.slice(0, 60)}"`);
    assert.ok(!/trusted by|testimonial|clients include|our customers include|\b\d+\+?\s?(customers|clients|companies|%)/i.test(t), `proof claim: "${t.slice(0, 60)}"`);
    assert.ok(!/uptime|\bSLA\b|within \d|24\/7|response time|bug bounty|reward/i.test(t), `service-level claim: "${t.slice(0, 60)}"`);
  }
  assert.match(CERTIFICATION_STATEMENT, /does not yet hold/);
});

test("no prohibited positioning, old access claims or demo wording", () => {
  for (const t of ALL_TEXT) {
    assert.ok(!/autonom|self-heal|\bAI SOC\b|\bAI[- ]agents?\b|agentic|\bAIOps\b|real[- ]time|continuous (protection|monitoring)|guarantee/i.test(t), `positioning: "${t.slice(0, 60)}"`);
    assert.ok(!/complete coverage|all (cloud )?controls|fully supported|tamper|immutable|independently verif/i.test(t), `overclaim: "${t.slice(0, 60)}"`);
    assert.ok(!/only Tricognita can assume|external ID|explicit deny|can only be made through|write actions are impossible/i.test(t), `outdated access claim: "${t.slice(0, 60)}"`);
    assert.ok(!/Request a demo|intent=demo/i.test(t));
  }
});

test("no secrets, identifiers or internal infrastructure are published", () => {
  const sensitive = [
    /AKIA[0-9A-Z]{16}|arn:aws|\b\d{12}\b|BEGIN [A-Z ]*PRIVATE KEY|\bsk-[A-Za-z0-9]|Bearer [A-Za-z0-9]/,
    /fly\.(io|dev)|\bneon\b|vercel|upstash|redis|supabase|tricognita-api|api\.tricognita|localhost|\b\d{1,3}(\.\d{1,3}){3}\b/i,
    /DATABASE_URL|SENTINEL_|_KEY\b|\bHMAC\b|\bJIT\b|\bRLS\b|row-level|tenant_?id|\bschema\b|postgres/i,
    /\b(ADMIN|SECOPS|AUDITOR|SOC_LEAD|DEVSECOPS|CISO|DUAL_CONTROL|OPERATOR)\b/,
    /\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR|implementationStatus/,
  ];
  for (const t of ALL_TEXT) for (const re of sensitive) assert.ok(!re.test(t), `sensitive detail (${re}): "${t.slice(0, 60)}"`);
});

test("the product name, states and Google Cloud come from the registry", () => {
  assert.ok((pageCode.match(/PRODUCT_DISPLAY_NAME/g) ?? []).length >= 8, "the page names the product without the config");
  assert.ok(!/\bARIA\b|\bKIRA\b|Tricognita platform/.test(pageCode), "hard-coded product name");
  assert.ok(!/state=["']/.test(pageCode), "hard-coded badge state");
  assert.ok(!/\b(Available|Launching|Planned|Deferred)\b/.test(pageCode), "state label written as copy");
  assert.ok(pageCode.includes("CLOUDS.map") && pageCode.includes("CapabilityBadge"));
  assert.ok(pageCode.includes("serviceCta(lead)"), "the primary CTA is not state-driven");
  assert.ok(!/SCOPING_CALL_HREF|"Book a scoping call"|intent=(scoping|quote)/.test(pageCode), "hard-coded booking CTA");
  const gcp = CLOUDS.find((c) => c.id === "gcp")!;
  if (!GATES_PASSED.includes("G-GCP")) {
    assert.notEqual(gcp.servicesState, "available");
    assert.notEqual(renderedState(capabilityById("evaluation-gcp")!), "available");
  }
  // Azure's enablement wording comes from the registry and is not generalised.
  assert.ok(pageCode.includes("azureFixes.enablementWording"));
  assert.ok(!pageCode.includes("awsFixes.enablementWording"), "the Azure enablement wording is shown for AWS");
});

test("/security points to /product instead of duplicating it", () => {
  assert.ok(!/CapabilityList|sample-record|VerificationPanel|EvidenceChain|PRODUCT_CAPABILITIES/.test(pageCode), "/security repeats product content");
  const aria = pageCode.slice(pageCode.indexOf('id="aria"'), pageCode.indexOf("<CtaBand"));
  assert.ok(aria.length > 0 && aria.length < 1800, `the ${PRODUCT_DISPLAY_NAME} section is ${aria.length} characters`);
  assert.ok(aria.includes("PLATFORM_HREF"));
  assert.ok(aria.includes("title={PRODUCT_DISPLAY_NAME}"), `the ${PRODUCT_DISPLAY_NAME} section heading is not from config`);
  const product = readFileSync(join(MARKETING, "product", "page.tsx"), "utf8");
  for (const heading of ["A findings list is not a fixed cloud", "Built for the people who close findings", "A sample closure record"]) {
    assert.ok(product.includes(heading) && !pageCode.includes(heading), `/security copies "${heading}"`);
  }
});

test("security page links resolve", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const h of [...pageCode.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  for (const [, a] of pageCode.matchAll(/id: "([\w-]+)", label/g)) assert.ok(pageCode.includes(`id="${a}"`), `#${a} has no section`);
});
