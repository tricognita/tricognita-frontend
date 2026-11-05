/**
 * Marketing site guardrails.
 *
 * 1. Every link the header, footer and sitemap publish resolves to a page.
 * 2. Retired routes have no page left behind (they redirect instead).
 * 3. No marketing page uses language the claims guardrails forbid
 *    (docs/02_Company/Marketing/MARKETING_CLAIMS_GUARDRAILS.md), including the
 *    corrected "27 controls on AWS" claim — AWS evaluates a subset of the
 *    catalogue (api/controls/evaluator/aws.go).
 * 4. The catalogue the Controls page renders matches the product's own
 *    catalogue (api/controls/catalogue.go).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  DRAFT_ROUTES,
  FOOTER_COLUMNS,
  HEADER_CTA,
  HEADER_NAV,
  INDEXED_ROUTES,
  LEGAL_LINKS,
  RETIRED_ROUTES,
} from "./marketing/site";
import { CONTROL_SEEDS } from "./fixtures/controls";

const MARKETING = join(process.cwd(), "app", "(marketing)");

function pageFor(href: string): string {
  const path = href.split(/[?#]/)[0].replace(/\/$/, "");
  return join(MARKETING, path === "" ? "" : path, "page.tsx");
}

test("every published marketing link resolves to a page", () => {
  const hrefs = [
    ...HEADER_NAV.flatMap((n) => (n.kind === "group" ? n.items.map((i) => i.href) : [n.href])),
    HEADER_CTA.href,
    ...FOOTER_COLUMNS.flatMap((c) => c.items.map((i) => i.href)),
    ...LEGAL_LINKS.map((l) => l.href),
    ...INDEXED_ROUTES.map((r) => r.path),
    ...DRAFT_ROUTES,
    "/contact",
  ];
  for (const h of new Set(hrefs)) {
    assert.ok(existsSync(pageFor(h)), `${h} → missing ${pageFor(h)}`);
    const anchor = h.split("#")[1];
    if (anchor) {
      const src = readFileSync(pageFor(h), "utf8");
      assert.ok(src.includes(`id="${anchor}"`), `${h} → no #${anchor} on the page`);
    }
  }
});

test("the shared shell follows the Rev B.1 navigation and has no demo language", () => {
  assert.deepEqual(
    HEADER_NAV.map((n) => n.label),
    ["Services", "Product", "Industries", "Cloud", "How we work", "Pricing", "About"],
  );
  assert.deepEqual(HEADER_CTA, { href: "/contact?intent=scoping", label: "Book a scoping call" });
  const links = [
    ...HEADER_NAV.flatMap((n) => (n.kind === "group" ? n.items : [n])),
    ...FOOTER_COLUMNS.flatMap((c) => c.items),
  ];
  for (const l of links) {
    assert.ok(!/intent=demo/.test(l.href), `${l.label} links to the demo intent`);
    assert.ok(!/demo/i.test(l.label), `${l.label} uses demo language`);
    // /services still redirects to /product; linking it would loop visitors back.
    if (RETIRED_ROUTES.some((r) => r.source === l.href.split(/[?#]/)[0])) assert.fail(`${l.href} is a retired route`);
  }
  for (const f of ["MarketingHeader.tsx", "MarketingFooter.tsx"]) {
    const src = readFileSync(join(process.cwd(), "app", "components", "marketing", f), "utf8");
    assert.ok(!/Request a demo|DEMO_HREF/.test(src), `${f} still uses the demo call to action`);
  }
});

test("retired routes have no page and each redirects to a live page", () => {
  for (const r of RETIRED_ROUTES) {
    assert.ok(!existsSync(pageFor(r.source)), `${r.source} still has a page`);
    assert.ok(existsSync(pageFor(r.destination)), `${r.source} redirects to missing ${r.destination}`);
  }
});

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return tsxFiles(p);
    return p.endsWith(".tsx") ? [p] : [];
  });
}

// Pages excluded from the language check while they await a rewrite. /about
// was rebuilt on 2026-09-26 and is now checked like every other page.
const DEFERRED: string[] = [];

const FORBIDDEN: [RegExp, string][] = [
  [/\bautonomous\b/i, "autonomous"],
  [/self-healing/i, "self-healing"],
  [/AI[- ]powered/i, "AI-powered"],
  [/\bguarantee/i, "guarantee"],
  [/\bcompliant\b/i, "compliant"],
  [/\bcertified\b/i, "certified"],
  [/multi-?cloud/i, "multi-cloud"],
  [/sovereign/i, "sovereign"],
  [/audit[- ]ready/i, "audit ready"],
  [/security score/i, "security score"],
  [/revolutionary|unmatched|best-in-class/i, "superlative"],
  [/27 controls on AWS|All 27 controls|AWS\W{1,4}27 controls/i, "27 controls on AWS"],
  [/continuous assurance/i, "continuous assurance"],
  // Website Rebuild Plan Rev B.1 and founder decisions of 2026-09-25.
  [/\bKIRA\b/i, "KIRA (unused candidate name)"],
  [/\bAI[- ]agents?\b|\bAI SOC\b|AI[- ]native|\bAIOps\b/i, "AI-agent category language"],
  [/self-heal|\bhealing\b|fix(es)? itself|one-click/i, "self-healing / one-click"],
  [/immutable|tamper-proof|independently verif/i, "immutable / independently verifiable"],
  [/zero cross-border|data residency|data never leaves/i, "data residency claim"],
  [/\bFTE\b/, "FTE economics"],
];

test("marketing pages avoid forbidden language", () => {
  const files = [...tsxFiles(MARKETING), ...tsxFiles(join(process.cwd(), "app", "components", "marketing"))].filter(
    (f) => !DEFERRED.includes(f),
  );
  assert.ok(files.length > 20, `expected the marketing pages, found ${files.length}`);
  for (const f of files) {
    // Code comments may quote the rules; only rendered text matters.
    const text = readFileSync(f, "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [re, label] of FORBIDDEN) {
      assert.ok(!re.test(text), `${f.replace(process.cwd(), "")} uses "${label}"`);
    }
  }
});

// Monorepo-only: the standalone frontend repository has no Go catalogue.
const GO_CATALOGUE = join(process.cwd(), "..", "api", "controls", "catalogue.go");
test("the Controls page catalogue matches the product catalogue", { skip: !existsSync(GO_CATALOGUE) && "Go API source is not in this repository" }, () => {
  const go = readFileSync(GO_CATALOGUE, "utf8");
  const goControls = [...go.matchAll(/ID:\s*"(TC-[A-Z]+-\d+)",\s*Name:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]);
  assert.equal(goControls.length, 27);
  assert.deepEqual(
    CONTROL_SEEDS.map((c) => [c.id, c.name]),
    goControls,
    "lib/fixtures/controls.ts has drifted from api/controls/catalogue.go",
  );
});
