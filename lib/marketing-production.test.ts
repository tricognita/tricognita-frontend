/**
 * Production-readiness freeze (26 September 2026). Pins the approved route
 * set, the legacy redirect map, draft-page indexing, and the site-wide
 * metadata every page inherits (root layout, Open Graph card, manifest).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PRODUCT_DESCRIPTOR, PRODUCT_DISPLAY_NAME } from "./marketing/capabilities";
import {
  DRAFT_ROUTES,
  HEADER_CTA,
  INDEXED_ROUTES,
  RETIRED_ROUTES,
  SCOPING_CALL_HREF,
  SITE_DESCRIPTION,
  SITE_METHOD,
  SITE_TAGLINE,
  SITE_TITLE,
} from "./marketing/site";

const ROOT = process.cwd();
const MARKETING = join(ROOT, "app", "(marketing)");
const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), "utf8");
const pathOf = (href: string) => href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
const pageExists = (href: string) => existsSync(join(MARKETING, pathOf(href), "page.tsx"));

/** The frozen public route set. */
const CANONICAL = [
  "/", "/product", "/about", "/services", "/pricing", "/cloud", "/cloud/aws", "/cloud/azure", "/cloud/google-cloud",
  "/industries", "/industries/saas", "/industries/fintech", "/contact", "/how-we-work", "/security", "/faq", "/sample-report",
  ...["cloud-security-assessment", "penetration-testing", "remediation-hardening", "security-retainer", "devsecops",
    "certification-readiness", "secure-cloud-engineering", "resilience", "kubernetes-security"].map((id) => `/services/${id}`),
];

/** Every legacy route and its approved permanent destination. */
const REDIRECTS: Record<string, string> = {
  "/architecture": "/security#architecture",
  "/dpa": "/legal/dpa",
  "/cloud/gcp": "/cloud/google-cloud",
  "/for-cloud-teams": "/how-we-work",
  "/for-mssps": "/about",
  "/how-it-works": "/how-we-work",
  "/pilot-application": "/contact?intent=scoping",
  "/privacy": "/legal/privacy",
  "/request-demo": "/contact?intent=scoping",
  "/product/controls": "/product#controls",
  "/product/drift-detection": "/product#drift",
  "/product/evidence": "/product#evidence",
  "/product/remediation": "/product#remediation",
  "/product/verification": "/product#verification",
  "/solutions": "/services",
  "/solutions/audit-readiness": "/services/certification-readiness",
  "/solutions/customer-security-reviews": "/services#cloud-security-assessment",
  "/status": "/security#service",
  "/terms": "/legal/terms",
  "/trust": "/security",
  "/waitlist": "/contact?intent=general",
};

const BANNED = /autonom|self-heal|predictive risk|zero-trust|\bAI SOC\b|\bAI[- ]agents?\b|agentic|\bAIOps\b|complete coverage|fully supported|tamper[- ]proof|immutable|independently verif|enterprise teams|request a demo|guarantee|real[- ]time|\bKIRA\b|Tricognita platform/i;

test("the sitemap is exactly the frozen canonical route set, and every route has a page", () => {
  assert.deepEqual(INDEXED_ROUTES.map((r) => r.path).sort(), [...CANONICAL].sort());
  for (const p of CANONICAL) assert.ok(pageExists(p), `${p} has no page`);
  for (const d of DRAFT_ROUTES) assert.ok(!INDEXED_ROUTES.some((r) => r.path === d), `${d} is in the sitemap`);
  for (const r of RETIRED_ROUTES) assert.ok(!INDEXED_ROUTES.some((x) => x.path === r.source), `${r.source} is in the sitemap`);
});

test("every legacy route redirects permanently, straight to a live page", () => {
  assert.deepEqual(Object.fromEntries(RETIRED_ROUTES.map((r) => [r.source, r.destination])), REDIRECTS);
  const sources = new Set(RETIRED_ROUTES.map((r) => r.source));
  for (const r of RETIRED_ROUTES) {
    assert.ok(!sources.has(pathOf(r.destination)), `${r.source} → ${r.destination} is a redirect chain`);
    assert.ok(pageExists(r.destination), `${r.source} → ${r.destination}: no page`);
    assert.ok(!pageExists(r.source), `${r.source} still has a page`);
  }
  assert.match(read("next.config.ts"), /RETIRED_ROUTES\.map\(\(r\) => \(\{ source: r\.source, destination: r\.destination, permanent: true \}\)\)/);
});

test("draft pages stay out of search with single-brand titles", () => {
  for (const d of DRAFT_ROUTES) {
    const src = readFileSync(join(MARKETING, d, "page.tsx"), "utf8");
    assert.ok(/robots: (LEGAL_DRAFT_ROBOTS|\{ index: false)/.test(src), `${d} is indexable`);
    assert.ok(!/title: "[^"]*— Tricognita"/.test(src), `${d} repeats the brand the title template adds`);
  }
  assert.match(read("app", "components", "marketing", "LegalPage.tsx"), /LEGAL_DRAFT_ROBOTS = \{ index: false, follow: true \}/);
  assert.ok(!/How Tricognita works/.test(read("app", "(marketing)", "resources", "page.tsx")), "/resources calls the product 'Tricognita'");
});

test("site-wide metadata, link previews and the manifest carry approved wording only", () => {
  for (const f of [["app", "layout.tsx"], ["app", "manifest.ts"], ["app", "opengraph-image.tsx"]]) {
    const code = strip(read(...f));
    assert.ok(!BANNED.test(code), `${f.join("/")}: ${code.match(BANNED)?.[0]}`);
  }
  for (const t of [SITE_TITLE, SITE_DESCRIPTION, SITE_TAGLINE, SITE_METHOD]) assert.ok(!BANNED.test(t), t);
  assert.ok(SITE_DESCRIPTION.includes(`${PRODUCT_DISPLAY_NAME}, for ${PRODUCT_DESCRIPTOR.toLowerCase()}`));
  const layout = strip(read("app", "layout.tsx"));
  for (const k of ["default: SITE_TITLE", "description: SITE_DESCRIPTION"]) assert.ok(layout.includes(k), `root layout does not use ${k}`);
  assert.ok(!/openGraph: \{[^}]*\burl:/.test(layout), "a fixed og:url would point every page's preview at one URL");
  const og = strip(read("app", "opengraph-image.tsx"));
  assert.ok(og.includes("alt = SITE_TITLE") && og.includes("{SITE_TAGLINE}") && og.includes("{SITE_METHOD}"));
  const manifest = strip(read("app", "manifest.ts"));
  assert.ok(manifest.includes("name: SITE_TITLE") && manifest.includes("description: SITE_DESCRIPTION"));
});

test("robots and internal routes: private areas stay out of search", () => {
  const robots = read("app", "robots.ts");
  for (const p of ["/api/", "/dashboard/", "/login", "/register", "/onboarding/"]) assert.ok(robots.includes(`"${p}"`), `robots does not disallow ${p}`);
  const mw = read("middleware.ts");
  assert.match(mw, /if \(pathname\.startsWith\("\/dev"\)\) \{\s*if \(process\.env\.NODE_ENV === "production"\) \{\s*return sec\(new NextResponse\(null, \{ status: 404 \}\)\);/);
  assert.ok(mw.includes('"/dev/:path*"'), "middleware does not run on /dev");
});

test("the public call to action is a scoping call", () => {
  assert.deepEqual(HEADER_CTA, { href: SCOPING_CALL_HREF, label: "Book a scoping call" });
  assert.equal(SCOPING_CALL_HREF, "/contact?intent=scoping");
});
