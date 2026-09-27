/**
 * ARIA presentation outside /product. Services show their commercial state;
 * ARIA shows one product-level state. Per-capability ARIA states belong on
 * /product only. Presentation only: these tests also pin the registry so the
 * cleanup can never be done by changing a state.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import HomePage from "../app/(marketing)/page";
import ServicesPage from "../app/(marketing)/services/page";
import HowWeWorkPage from "../app/(marketing)/how-we-work/page";
import SecurityPage from "../app/(marketing)/security/page";
import CloudPage from "../app/(marketing)/cloud/page";
import IndustriesPage from "../app/(marketing)/industries/page";
import FaqPage from "../app/(marketing)/faq/page";
import ProductPage from "../app/(marketing)/product/page";
import { CloudDetail } from "../app/components/marketing/CloudDetail";
import { IndustryPage } from "../app/components/marketing/IndustryPage";
import { ServiceDetailPage } from "../app/components/marketing/ServiceDetailPage";
import { ARIA_DEVELOPMENT_LABEL, ARIA_NOT_IN_WORKFLOW, ariaProductState, ariaStatusNote, ariaSupportsService, ariaWorkflowLine } from "./marketing/aria";
import {
  CLOUDS,
  GATE_PR_PASSED,
  GATES_PASSED,
  PRODUCT_CAPABILITIES,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  renderedState,
  capabilityById,
} from "./marketing/capabilities";
import { SERVICE_PAGE_IDS, type ServicePageId } from "./marketing/service-details";
import { serviceCta } from "./marketing/services";

const ROOT = process.cwd();
const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
const render = (C: ComponentType, props: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(C, props));
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;| /g, " ");
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const section = (html: string, id: string) => {
  const start = html.indexOf(`id="${id}"`);
  assert.ok(start >= 0, `no #${id}`);
  const next = html.indexOf("<section", start + 1);
  return html.slice(start, next < 0 ? undefined : next);
};
const badgeIds = (html: string) => [...html.matchAll(/data-capability="([\w-]+)"/g)].map((m) => m[1]);
const PRODUCT_IDS = new Set(PRODUCT_CAPABILITIES.map((c) => c.id));
const productBadges = (html: string) => badgeIds(html).filter((id) => PRODUCT_IDS.has(id));
const EVALUATION_IDS = CLOUDS.map((c) => c.platformCapabilityId);

const SERVICE_HTML = Object.fromEntries(SERVICE_PAGE_IDS.map((id) => [id, render(ServiceDetailPage as ComponentType, { id })])) as Record<ServicePageId, string>;
/** Pages audited for repeated ARIA capability states, rendered. */
const PAGES: Record<string, string> = {
  "/": render(HomePage),
  "/services": render(ServicesPage),
  "/how-we-work": render(HowWeWorkPage),
  "/security": render(SecurityPage),
  "/cloud": render(CloudPage),
  "/industries": render(IndustriesPage),
  "/faq": render(FaqPage),
  ...Object.fromEntries(CLOUDS.map((c) => [`/cloud/${c.slug}`, render(CloudDetail as ComponentType, { id: c.id })])),
  "/industries/saas": render(IndustryPage as ComponentType, { id: "saas" }),
  "/industries/fintech": render(IndustryPage as ComponentType, { id: "fintech" }),
  ...Object.fromEntries(SERVICE_PAGE_IDS.map((id) => [`/services/${id}`, SERVICE_HTML[id]])),
};

/* The commercial states and the registry as they stand. A change to either is
 * a decision, not a presentation change, so it must fail here first. */
const SERVICE_STATES: Record<ServicePageId, "available" | "launching"> = {
  "cloud-security-assessment": "available",
  "penetration-testing": "launching",
  "remediation-hardening": "available",
  "security-retainer": "available",
  devsecops: "available",
  "certification-readiness": "available",
  "secure-cloud-engineering": "available",
  resilience: "available",
  "kubernetes-security": "launching",
};

const REGISTRY: Record<string, [string, string | undefined, string]> = {
  "evaluation-aws": ["launching", "available", "PR"],
  "evaluation-azure": ["launching", "available", "PR"],
  "evaluation-gcp": ["launching", "planned", "PR G-GCP"],
  "read-only-onboarding": ["launching", "available", "PR"],
  "approval-model": ["launching", "available", "PR"],
  "fixes-azure": ["launching", "gated", "PR G-ENABLE"],
  "fixes-aws": ["launching", "gated", "PR G-ENABLE G-AWSFIX"],
  "customer-applied-fixes": ["launching", "available", "PR"],
  verification: ["launching", "available", "PR"],
  "scheduled-rechecks": ["launching", "gated", "PR"],
  "drift-alerts": ["launching", "in-development", "PR G-ALERT"],
  "signed-records": ["launching", "available", "PR"],
  "closure-record": ["launching", "available", "PR"],
  "client-access": ["launching", "gated", "PR G-ACCESS"],
  "findings-and-reports": ["planned", "in-development", "PR"],
  "assisted-fix-proposals": ["planned", "planned", "PR"],
  "internal-research-engine": ["deferred", "not-validated", ""],
};

test("1–3. service states and calls to action are unchanged and still shown", () => {
  for (const id of SERVICE_PAGE_IDS) {
    const s = capabilityById(id)!;
    assert.equal(renderedState(s), SERVICE_STATES[id], `${id} changed state`);
    const hero = SERVICE_HTML[id].slice(0, SERVICE_HTML[id].indexOf('id="fit"'));
    assert.match(hero, new RegExp(`data-state="${SERVICE_STATES[id]}" data-capability="${id}"`), `${id} hero does not show its state`);
    const cta = serviceCta(s)!;
    assert.equal(cta.label, SERVICE_STATES[id] === "available" ? "Book a scoping call" : "Register interest");
    assert.ok(hero.includes(`href="${cta.href.replace(/&/g, "&amp;")}"`) && textOf(hero).includes(cta.label), `${id} hero CTA changed`);
  }
});

test("4–6. the ARIA registry and gates are untouched; nothing is Available", () => {
  const actual = Object.fromEntries(
    PRODUCT_CAPABILITIES.map((c) => [c.id, [c.publicState, c.implementationStatus, (c.gates ?? []).join(" ")]]),
  );
  assert.deepEqual(actual, REGISTRY, "an ARIA capability's state, status or gates changed");
  assert.equal(GATE_PR_PASSED, false);
  assert.deepEqual([...GATES_PASSED], []);
  for (const c of PRODUCT_CAPABILITIES) {
    assert.notEqual(c.publicState, "available", `${c.id} declared Available`);
    assert.notEqual(renderedState(c), "available", `${c.id} renders Available`);
  }
  assert.equal(ariaProductState(), "launching");
  const gcp = CLOUDS.find((c) => c.id === "gcp")!;
  assert.equal(gcp.servicesState, "launching");
  assert.deepEqual(capabilityById("evaluation-gcp")!.gates, ["PR", "G-GCP"]);
  assert.equal(capabilityById("evaluation-gcp")!.launchWorkStarted, true);
});

test("7. service pages show no ARIA capability states", () => {
  for (const id of SERVICE_PAGE_IDS) {
    assert.deepEqual(productBadges(SERVICE_HTML[id]), [], `${id} renders ARIA capability badges`);
    const aria = section(SERVICE_HTML[id], "aria");
    assert.ok((aria.match(/data-state=/g) ?? []).length <= 1, `${id}: more than one state in the ARIA section`);
    const text = textOf(aria);
    for (const c of publicCapabilities(PRODUCT_CAPABILITIES)) {
      assert.ok(!text.includes(c.name), `${id} lists the capability "${c.name}"`);
    }
  }
  const services = PAGES["/services"];
  assert.deepEqual(productBadges(section(services, "primary")), [], "/services cards render ARIA capability badges");
});

test("8, 11. ARIA is identified where it supports the service, and not forced elsewhere", () => {
  const notPart = SERVICE_PAGE_IDS.filter((id) => !ariaSupportsService(id));
  assert.deepEqual(notPart, ["devsecops", "kubernetes-security"], "ARIA relationship changed");
  for (const id of SERVICE_PAGE_IDS) {
    const aria = section(SERVICE_HTML[id], "aria");
    const text = textOf(aria);
    if (ariaSupportsService(id)) {
      assert.ok(aria.includes("data-aria-card"), `${id} has no ARIA product card`);
      assert.equal((aria.match(/data-aria-status/g) ?? []).length, 1, `${id} does not show one product-level status`);
      assert.match(aria, new RegExp(`data-state="${ariaProductState()}"`));
      assert.ok(text.includes(`${PRODUCT_DISPLAY_NAME} ${PRODUCT_DESCRIPTOR}`), `${id} product identity missing`);
      assert.ok(text.includes(ARIA_DEVELOPMENT_LABEL), `${id} does not say ${PRODUCT_DISPLAY_NAME} is in development`);
      assert.ok(text.includes(ariaStatusNote()) && text.includes(ariaWorkflowLine()), `${id} status note or workflow line missing`);
      assert.ok(aria.includes('href="/product"'), `${id} does not link /product`);
    } else {
      assert.ok(!aria.includes("data-aria-card") && !aria.includes("data-aria-status"), `${id} is given an ARIA workflow`);
      assert.ok(text.includes(ARIA_NOT_IN_WORKFLOW), `${id} does not say it is engineering-led`);
      assert.ok(!text.includes(ariaWorkflowLine()));
    }
  }
});

test("other marketing pages show ARIA as one product; only per-cloud states remain", () => {
  for (const [path, html] of Object.entries(PAGES)) {
    const cloud = CLOUDS.find((c) => path === `/cloud/${c.slug}`);
    const allowed = new Set([...EVALUATION_IDS, ...(cloud?.fixCapabilityId ? [cloud.fixCapabilityId] : [])]);
    for (const id of productBadges(html)) assert.ok(allowed.has(id), `${path} renders the ARIA capability badge ${id}`);
  }
  for (const path of ["/", "/how-we-work", "/security", "/industries/saas", "/industries/fintech", "/cloud", ...CLOUDS.map((c) => `/cloud/${c.slug}`)]) {
    assert.ok(PAGES[path].includes("data-aria-status"), `${path} lost ARIA's product-level status`);
  }
  // No ARIA capability-by-cloud matrix outside /product.
  assert.ok(!/<th[^>]*>\s*Capability\s*<\/th>/.test(PAGES["/cloud"]), "/cloud still has the capability matrix");
});

test("9. the product name comes from config", () => {
  const files = [
    "app/(marketing)/page.tsx",
    "lib/marketing/aria.ts",
    "app/components/marketing/AriaStatus.tsx",
    "app/components/marketing/ServiceDetailPage.tsx",
    "app/components/marketing/IndustryPage.tsx",
    "app/components/marketing/CloudDetail.tsx",
    "app/(marketing)/services/page.tsx",
    "app/(marketing)/how-we-work/page.tsx",
    "app/(marketing)/security/page.tsx",
    "app/(marketing)/cloud/page.tsx",
  ];
  for (const f of files) {
    const code = strip(readFileSync(join(ROOT, f), "utf8"));
    assert.ok(!/\bARIA\b/.test(code), `${f} hard-codes the product name`);
    assert.ok(!/state=["']/.test(code), `${f} hard-codes a badge state`);
  }
  // The new presentation layer never writes a state word itself.
  for (const f of ["lib/marketing/aria.ts", "app/components/marketing/AriaStatus.tsx"]) {
    assert.ok(!/\b(Available|Launching|Planned)\b/.test(strip(readFileSync(join(ROOT, f), "utf8"))), `${f} writes a state label`);
  }
});

test("10. /product remains the detailed ARIA capability surface", () => {
  const html = render(ProductPage);
  const shown = new Set(productBadges(html));
  for (const c of publicCapabilities(PRODUCT_CAPABILITIES)) assert.ok(shown.has(c.id), `/product no longer shows ${c.id}`);
  const code = strip(readFileSync(join(ROOT, "app", "(marketing)", "product", "page.tsx"), "utf8"));
  assert.ok(code.includes("<CapabilityList items={capabilities}"), "/product capability list removed");
});

test("12–14. no prohibited claims, no 'Request a demo', no internal gate names", () => {
  const banned = [
    /autonom|self-heal|\bAI[- ]agents?\b|agentic|\bAI SOC\b|\bAIOps\b/i,
    /continuous protection|real[- ]time protection|guarantee|complete coverage|\ball (cloud )?controls\b|fully supported/i,
    /Request a demo/i,
    /\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR|implementationStatus/,
  ];
  for (const [path, html] of Object.entries(PAGES)) {
    const text = textOf(html);
    for (const re of banned) assert.ok(!re.test(text), `${path} matches ${re}: ${text.match(re)?.[0]}`);
  }
  for (const t of [ariaStatusNote(), ariaWorkflowLine(), ARIA_NOT_IN_WORKFLOW]) for (const re of banned) assert.ok(!re.test(t));
});

test("the homepage shows ARIA as one product with one status, not its capability list", () => {
  const home = PAGES["/"];
  const platform = section(home, "platform");
  const text = textOf(platform);
  assert.ok(platform.includes("data-aria-card"), "homepage has no ARIA product card");
  assert.equal((platform.match(/data-aria-status/g) ?? []).length, 1, "homepage ARIA section does not show exactly one status");
  assert.equal((platform.match(/data-state=/g) ?? []).length, 1, "homepage ARIA section shows more than one state");
  assert.match(platform, new RegExp(`data-state="${ariaProductState()}"`));
  assert.deepEqual(productBadges(platform), [], "homepage renders ARIA capability badges");
  for (const c of publicCapabilities(PRODUCT_CAPABILITIES)) assert.ok(!text.includes(c.name), `homepage lists the capability "${c.name}"`);
  assert.ok(text.includes(`${PRODUCT_DISPLAY_NAME} ${PRODUCT_DESCRIPTOR}`) && text.includes(ARIA_DEVELOPMENT_LABEL) && text.includes(ariaStatusNote()));
  assert.ok(!/Capabilities marked/i.test(text), "copy still points at a capability list");
  assert.equal((platform.match(/href="\/product"/g) ?? []).length, 1, "the ARIA section should link /product once");
  // Across the whole homepage: only the per-cloud ARIA state remains.
  for (const id of productBadges(home)) assert.ok(EVALUATION_IDS.includes(id), `homepage renders the ARIA capability badge ${id}`);
  // Services on the homepage keep their own states.
  const serviceBadges = [...home.matchAll(/data-state="(\w+)" data-capability="([\w-]+)"/g)].filter((m) => !PRODUCT_IDS.has(m[2]));
  assert.ok(serviceBadges.length >= SERVICE_PAGE_IDS.length);
  for (const [, state, id] of serviceBadges) assert.equal(state, renderedState(capabilityById(id)!), `${id} shows the wrong state on the homepage`);
});
