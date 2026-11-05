/**
 * Service detail pages (/services/<id>) guardrails — Rev B.1 §17.
 *
 * Exactly nine pages, each a thin wrapper over one shared component that takes
 * names, states, prices, calls to action, cloud coverage and the product name
 * from the registry. Launching services can never be booked; Google Cloud
 * coverage stays locked; boundaries and claims stay within the sources.
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
  SERVICES,
  capabilityById,
  renderedState,
} from "./marketing/capabilities";
import { cloudById, serviceStateOnCloud } from "./marketing/clouds";
import { SERVICE_PAGE_IDS, SERVICE_PAGES, serviceMetadata, servicePageHref } from "./marketing/service-details";
import { SERVICE_DETAILS, serviceCta, servicePriceLabel } from "./marketing/services";
import { HEADER_NAV, INDEXED_ROUTES } from "./marketing/site";

const ROOT = process.cwd();
const MARKETING = join(ROOT, "app", "(marketing)");
const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
const COMPONENT = strip(readFileSync(join(ROOT, "app", "components", "marketing", "ServiceDetailPage.tsx"), "utf8"));
const DATA = strip(readFileSync(join(ROOT, "lib", "marketing", "service-details.ts"), "utf8"));
const routeFile = (id: string) => join(MARKETING, "services", id, "page.tsx");
const NINE = [
  "cloud-security-assessment", "penetration-testing", "remediation-hardening", "security-retainer", "devsecops",
  "certification-readiness", "secure-cloud-engineering", "resilience", "kubernetes-security",
];
const pageText = (id: string) => {
  const s = capabilityById(id)!;
  const d = SERVICE_DETAILS[id];
  const p = SERVICE_PAGES[id as (typeof SERVICE_PAGE_IDS)[number]];
  return [s.name, s.summary, d.audience, d.work, d.ariaNote, ...d.triggers, ...d.scope, ...d.receives, ...p.needs, ...p.boundaries];
};

test("exactly the nine planned service pages exist, each selecting its own registry id", () => {
  assert.deepEqual([...SERVICE_PAGE_IDS], NINE);
  for (const id of NINE) {
    assert.ok(existsSync(routeFile(id)), `/services/${id} has no page`);
    const src = strip(readFileSync(routeFile(id), "utf8"));
    assert.ok(src.includes(`<ServiceDetailPage id="${id}" />`), `/services/${id} renders the wrong service`);
    assert.ok(src.includes(`serviceMetadata("${id}")`), `/services/${id} metadata is not from the registry`);
    assert.ok(src.split("\n").length < 20, `/services/${id} is not a thin wrapper`);
    assert.ok(capabilityById(id), `${id} is not in the registry`);
  }
  for (const excluded of ["cost-security-review", "ai-llm-security-testing", "pci-support", "iso-42001"]) {
    assert.ok(!existsSync(routeFile(excluded)), `/services/${excluded} must not have a page`);
  }
});

test("service pages are canonical, uniquely described and in the sitemap", () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const id of SERVICE_PAGE_IDS) {
    const m = serviceMetadata(id);
    assert.equal(m.alternates?.canonical, `/services/${id}`);
    assert.equal(servicePageHref(id), `/services/${id}`);
    titles.add(String(m.title));
    descriptions.add(String(m.description));
    assert.ok(INDEXED_ROUTES.some((r) => r.path === `/services/${id}`), `/services/${id} is not in the sitemap`);
  }
  assert.equal(titles.size, 9, "titles are not unique");
  assert.equal(descriptions.size, 9, "descriptions are not unique");
});

test("the Services menu exposes each page with its registry group and state", () => {
  const menu = HEADER_NAV.find((n) => n.label === "Services");
  assert.ok(menu && menu.kind === "group");
  for (const id of SERVICE_PAGE_IDS) {
    const item: { href: string; label: string } | undefined = menu.items.find((i) => i.href === `/services/${id}`);
    assert.ok(item, `the Services menu does not link /services/${id}`);
    assert.equal(item.label, capabilityById(id)!.name);
  }
  const site = strip(readFileSync(join(ROOT, "lib", "marketing", "site.ts"), "utf8"));
  assert.ok(site.includes("STATE_LABEL[state]") && !/"(Available|Launching|Planned)"/.test(site), "menu states are not from the registry");
});

test("no state, CTA label or product name is hard-coded in the service pages", () => {
  for (const [name, code] of [["component", COMPONENT], ["data", DATA], ...NINE.map((id) => [id, strip(readFileSync(routeFile(id), "utf8"))])]) {
    assert.ok(!/state=["']/.test(code), `${name} hard-codes a badge state`);
    assert.ok(!/\b(Available|Launching|Planned|Deferred)\b/.test(code), `${name} writes a state label as copy`);
    assert.ok(!/"Book a scoping call"|"Register interest"|intent=(scoping|interest|quote|demo)/.test(code), `${name} hard-codes a CTA`);
    assert.ok(!/\bARIA\b|\bKIRA\b|Tricognita platform/.test(code), `${name} hard-codes a product name`);
  }
  assert.ok(COMPONENT.includes("serviceCta(service)") && COMPONENT.includes("servicePriceLabel(service)"));
  assert.ok((COMPONENT.match(/PRODUCT_DISPLAY_NAME/g) ?? []).length >= 5);
  // The notes must name the product through config, not as a literal in the source.
  const servicesSource = strip(readFileSync(join(ROOT, "lib", "marketing", "services.ts"), "utf8"));
  assert.ok(!/["'`][^"'`\n]*\bARIA\b/.test(servicesSource), "services.ts hard-codes the product name in copy");
});

test("CTAs follow state: Launching services can never be booked", () => {
  for (const id of NINE) {
    const s = capabilityById(id)!;
    const cta = serviceCta(s);
    const state = renderedState(s);
    if (state === "available") assert.match(cta!.href, /intent=scoping/, `${id} is Available but not bookable`);
    else assert.ok(!cta || !/intent=scoping/.test(cta.href), `${id} is ${state} but bookable`);
    if (state === "planned") assert.equal(cta, null);
  }
});

test("Penetration Testing and Kubernetes Security remain Launching", () => {
  for (const id of ["penetration-testing", "kubernetes-security"]) {
    const s = capabilityById(id)!;
    assert.equal(renderedState(s), "launching", `${id} is no longer Launching`);
    assert.equal(serviceCta(s)!.label, "Register interest");
    assert.equal(servicePriceLabel(s), "Priced at launch");
  }
});

test("Google Cloud coverage comes from the registry and stays locked", () => {
  assert.ok(COMPONENT.includes("serviceStateOnCloud(service, cloud)") && COMPONENT.includes("CLOUDS.map"));
  const gcp = cloudById("gcp");
  const onGcp = NINE.filter((id) => serviceStateOnCloud(capabilityById(id)!, gcp) !== null).sort();
  assert.deepEqual(onGcp, ["cloud-security-assessment", "remediation-hardening", "security-retainer"]);
  if (!GATES_PASSED.includes("G-GCP")) {
    for (const id of onGcp) assert.equal(serviceStateOnCloud(capabilityById(id)!, gcp), "launching", `${id} on Google Cloud`);
  }
  // Kubernetes never implies GKE.
  assert.equal(serviceStateOnCloud(capabilityById("kubernetes-security")!, gcp), null);
  for (const c of CLOUDS) assert.ok(c.name.length > 0);
});

test("the internal engine never appears and ARIA support is only where the source says", () => {
  const hidden = new Set(PRODUCT_CAPABILITIES.filter((c) => c.visibility === "never").map((c) => c.id));
  for (const id of NINE) {
    for (const c of SERVICE_DETAILS[id].aria) {
      assert.ok(!hidden.has(c), `${id} cites a hidden capability`);
      assert.ok(capabilityById(c), `${id} cites unknown ${c}`);
    }
  }
  // ARIA takes part only where the service's source relationship says so.
  assert.ok(COMPONENT.includes("ariaSupportsService(id)") && COMPONENT.includes("ariaHere ?"), "ARIA section is forced onto every service");
});

test("service page copy passes the claims guardrails", () => {
  const banned = [
    /autonom|self-heal|\bAI SOC\b|\bAI[- ]agents?\b|agentic|\bAIOps\b|real[- ]time|continuous|guarantee|complete coverage|all (cloud )?controls|fully supported/i,
    /tamper|immutable|independently verif|sovereign|residency|hosted in/i,
    /\bcertified\b|accredited assessor|\bOSCP\b|\bCREST\b|\bCISSP\b|regulatory approval|\bcompliant\b/i,
    /testimonial|case stud|trusted by|clients include|\b\d+\+?\s?(customers|clients|companies|%)|\d+\s?%/i,
    /[₹$€£]\s?\d|\b(AED|INR|USD)\s?\d|\/\s?(mo|month)\b|within \d|\b\d+\s?(hours|days|weeks)\b|24\/7|\bSLA\b|uptime|\bRTO\b|\bRPO\b/i,
    /Request a demo|\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR/i,
  ];
  for (const id of NINE) {
    for (const t of pageText(id)) for (const re of banned) assert.ok(!re.test(t), `${id}: "${t.slice(0, 70)}" matches ${re}`);
  }
  for (const code of [COMPONENT, DATA]) for (const re of banned) assert.ok(!re.test(code), `service page source matches ${re}`);
});

test("every page has the required sections and its boundaries", () => {
  for (const id of ["who", "when", "what", "needs", "receive", "boundaries", "aria", "clouds", "pricing", "related"]) {
    assert.ok(COMPONENT.includes(`id="${id}"`), `service pages are missing #${id}`);
  }
  for (const id of SERVICE_PAGE_IDS) {
    const p = SERVICE_PAGES[id];
    assert.ok(p.needs.length > 0 && p.boundaries.length > 0, `${id} has no needs or boundaries`);
    assert.ok(SERVICE_DETAILS[id].triggers.length > 0 && SERVICE_DETAILS[id].receives.length > 0, `${id} has no triggers or deliverables`);
    for (const r of p.related) assert.ok((SERVICE_PAGE_IDS as readonly string[]).includes(r) && r !== id, `${id} relates to ${r}`);
  }
  const b = (id: (typeof SERVICE_PAGE_IDS)[number]) => SERVICE_PAGES[id].boundaries.join(" ");
  assert.match(b("penetration-testing"), /written scope and rules of engagement/);
  assert.match(b("certification-readiness"), /does not issue certifications or provide accreditation/);
  assert.match(b("certification-readiness"), /independent auditors/);
  assert.ok(!/PCI/.test(pageText("certification-readiness").join(" ")), "Certification Readiness claims PCI support");
  assert.match(b("kubernetes-security"), /EKS and AKS/);
  assert.match(b("kubernetes-security"), /not currently in scope/);
  assert.match(b("security-retainer"), /not an around-the-clock monitoring or incident-response service/);
});

test("service pages link only to real pages and do not duplicate /product", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  for (const h of [...COMPONENT.matchAll(/href=["'](\/[^"']*)["']/g)].map((m) => m[1])) assert.ok(existsSync(pageFor(h)), `${h} → missing`);
  for (const target of ["/services", "/pricing", "/how-we-work", "/product"]) assert.ok(existsSync(pageFor(target)));
  assert.ok(!/CapabilityList|sample-record|VerificationPanel|EvidenceChain|STAGES|LIFECYCLE/.test(COMPONENT), "service pages repeat product content");
  const aria = COMPONENT.slice(COMPONENT.indexOf('id="aria"'), COMPONENT.indexOf('id="coverage"'));
  assert.ok(aria.length > 0 && aria.length < 2600, `the product section is ${aria.length} characters`);
  assert.equal(PRODUCT_DISPLAY_NAME, "ARIA");
  assert.equal(SERVICES.filter((s) => (SERVICE_PAGE_IDS as readonly string[]).includes(s.id)).length, 9);
});
