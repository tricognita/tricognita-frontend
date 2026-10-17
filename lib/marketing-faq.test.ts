/**
 * /faq guardrails. Every answer is generated in lib/marketing/faq.ts from the
 * registries and the claims-register-backed security copy; these tests pin
 * the known stale claims out, keep Google Cloud and launching services honest,
 * and keep the FAQ from becoming a second state registry.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CLOUDS,
  GATES_PASSED,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  SERVICES,
  publicCapabilities,
  renderedState,
} from "./marketing/capabilities";
import { cloudById, servicesOnCloud } from "./marketing/clouds";
import { buildFaq } from "./marketing/faq";
import { CERTIFICATION_STATEMENT } from "./marketing/security";
import { INDEXED_ROUTES } from "./marketing/site";

const ROOT = process.cwd();
const MARKETING = join(ROOT, "app", "(marketing)");
const strip = (src: string) => src.replace(/\/\/.*$/gm, "").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
const PAGE = join(MARKETING, "faq", "page.tsx");
const pageCode = strip(readFileSync(PAGE, "utf8"));
const dataCode = strip(readFileSync(join(ROOT, "lib", "marketing", "faq.ts"), "utf8"));
const FAQ = buildFaq();
const ENTRIES = FAQ.flatMap((s) => s.items);
const TEXTS = FAQ.flatMap((s) => [s.title, ...s.items.flatMap((i) => [i.q, i.a, ...(i.links ?? []).map((l) => l.label)])]);
const ALL = TEXTS.join("\n");
const gcp = cloudById("gcp");

test("/faq exists, is canonical and in the sitemap", () => {
  assert.ok(existsSync(PAGE));
  assert.match(pageCode, /canonical: "\/faq"/);
  assert.match(pageCode, /title: "Frequently asked questions"/);
  assert.ok(INDEXED_ROUTES.some((r) => r.path === "/faq"));
});

test("categories and questions are generated and rendered", () => {
  assert.deepEqual(
    FAQ.map((s) => s.id),
    ["tricognita", "aria", "clouds", "services", "remediation", "pricing", "security", "certification"],
  );
  for (const s of FAQ) assert.ok(s.items.length > 0, `${s.id} is empty`);
  assert.ok(ENTRIES.length >= 25, `only ${ENTRIES.length} questions`);
  assert.equal(new Set(ENTRIES.map((e) => e.q)).size, ENTRIES.length, "duplicate questions");
  for (const id of ["buildFaq()", "<FaqList groups={groups} />", "sections.map", "faqJsonLd(groups)"]) {
    assert.ok(pageCode.includes(id), `/faq does not use ${id}`);
  }
});

test("the product name and descriptor come from config", () => {
  for (const [name, code] of [["page", pageCode], ["data", dataCode]] as const) {
    assert.ok(!/\bARIA\b/.test(code), `${name} hard-codes the product name`);
  }
  assert.ok(FAQ.some((s) => s.title === PRODUCT_DISPLAY_NAME), "no product category");
  assert.ok(ALL.includes(`${PRODUCT_DISPLAY_NAME} is Tricognita's product for ${PRODUCT_DESCRIPTOR.toLowerCase()}`), "descriptor missing");
  assert.ok(!/Tricognita platform/i.test(ALL + pageCode + dataCode));
  assert.ok(!/\bKIRA\b|\bKira\b/.test(ALL + pageCode + dataCode));
});

test("the known stale claims are gone", () => {
  assert.ok(!/every day|\bdaily\b|24 ?h(ours)?\b|continuous/i.test(ALL), "re-check frequency or continuity claimed");
  assert.ok(!/Control Assurance Record/i.test(ALL + dataCode), "retired record name");
  const product = readFileSync(join(MARKETING, "product", "page.tsx"), "utf8");
  assert.ok(!/Control Assurance Record/.test(product), "the product page would make the old name canonical");
  assert.ok(!/\b(Wiz|Vanta|Drata|Sprinto|Security Hub|Defender for Cloud|Orca|Prisma|Lacework)\b/.test(ALL + pageCode + dataCode), "competitor comparison without approval");
  assert.ok(!/\bCSPM\b|\bCNAPP\b/.test(ALL), "category comparison");
});

test("Google Cloud is Launching, never roadmap and never Available, with its locked scope", () => {
  const gcpTexts = TEXTS.filter((t) => /Google Cloud|\bGCP\b|\bGKE\b/.test(t));
  assert.ok(gcpTexts.length > 0);
  for (const t of gcpTexts) {
    assert.ok(!/roadmap|coming soon/i.test(t), `old Google Cloud wording: "${t.slice(0, 80)}"`);
    if (!GATES_PASSED.includes("G-GCP")) {
      assert.ok(!/Google Cloud[^.]*\bservices available\b|Google Cloud[^.]*is available|available on Google Cloud/i.test(t), `Google Cloud presented as Available: "${t.slice(0, 80)}"`);
    }
  }
  const answer = ENTRIES.find((e) => e.q === `What does Tricognita cover on ${gcp.name}?`);
  assert.ok(answer, "no Google Cloud question");
  const covered = servicesOnCloud(gcp).map((x) => x.service.name);
  assert.deepEqual(covered.sort(), ["Cloud Security Assessment", "Remediation & Hardening", "Security Retainer"].sort());
  for (const n of covered) assert.ok(answer.a.includes(n), `${n} missing from the Google Cloud answer`);
  for (const s of SERVICES.filter((x) => !covered.includes(x.name))) {
    assert.ok(!answer.a.includes(s.name), `${s.name} is presented as covering Google Cloud`);
  }
  if (!GATES_PASSED.includes("G-GCP")) assert.ok(/currently launching there/.test(answer.a), "Google Cloud answer does not say launching");
});

test("states are derived from the registry, and launching services are never bookable", () => {
  for (const [name, code] of [["page", pageCode], ["data", dataCode]] as const) {
    assert.ok(!/state=["']/.test(code), `${name} hard-codes a badge state`);
    assert.ok(!/\b(Available|Launching|Planned|Deferred)\b/.test(code), `${name} writes a state label as copy`);
    assert.ok(!/"Book a scoping call"|"Register interest"|intent=(scoping|interest|quote|demo)/.test(code), `${name} hard-codes a CTA`);
  }
  assert.ok(dataCode.includes("renderedState(") && dataCode.includes("STATE_LABEL"));
  const launching = publicCapabilities(SERVICES).filter((s) => renderedState(s) === "launching");
  const book = ENTRIES.find((e) => e.q === "Can I book a service that is launching?");
  assert.ok(book && book.a.startsWith("Not yet."));
  for (const s of launching) {
    assert.ok(book.a.includes(s.name), `${s.name} missing from the launching answer`);
    for (const e of ENTRIES) {
      for (const sentence of e.a.split(/(?<=\.)\s/)) {
        if (sentence.includes(s.name)) assert.ok(!/book a scoping call|can be booked|book it now/i.test(sentence), `${s.name} presented as bookable`);
      }
    }
  }
  for (const e of ENTRIES) for (const l of e.links ?? []) assert.ok(!/intent=scoping/.test(l.href), `${e.q} links a booking`);
  assert.ok(pageCode.includes("serviceCta(lead)"), "the CTA is not state-driven");
});

test("Azure's enablement wording stays on Azure", () => {
  const fixes = ENTRIES.find((e) => e.q === "What can be fixed automatically?")!;
  const wording = "Supported automated fixes are available by enablement for supported controls, subject to customer authorization.";
  assert.equal(fixes.a.split(wording).length - 1, 1, "Azure wording missing or repeated");
  const awsPart = fixes.a.slice(fixes.a.indexOf("on AWS ("));
  assert.ok(awsPart.length > 0 && !awsPart.includes(wording), "Azure wording applied to AWS");
});

test("no certification, residency, positioning, proof or gate-name claims", () => {
  const certText = ALL.replace("Tricognita does not issue certifications or provide accreditation.", "").replace(CERTIFICATION_STATEMENT, "");
  assert.ok(!/\bcertified\b|accredit|regulatory approval|\bcompliant\b|audit-ready/i.test(certText), "certification claim");
  for (const e of ENTRIES) {
    if (/ISO 27001|SOC 2/.test(e.a)) assert.ok(/^No\.|does not/.test(e.a), `"${e.q}" names a framework outside the certification boundary`);
  }
  const banned = [
    /sovereign|residency|in-region|hosted in|stored in (India|the UAE)|zero cross-border|data never leaves/i,
    /autonom|self-heal|\bAI SOC\b|\bAI[- ]agents?\b|agentic|\bAIOps\b|real[- ]time|guarantee|complete coverage|all (cloud )?controls|fully supported/i,
    /tamper|immutable|independently verif/i,
    /testimonial|case stud|trusted by|clients include|\b\d+\+?\s?(customers|clients|companies|%)|\d+\s?%/i,
    /within \d|\b\d+\s?(hours|days|weeks)\b|24\/7|\bSLA\b|uptime|free (trial|assessment|pentest)/i,
    /industry-leading|best-in-class|revolutionary|next-generation|unmatched|military-grade|bank-grade/i,
    /Request a demo|\bG-(GCP|PR|ENABLE|AWSFIX|SCHED|ALERT|EXPORT|ACCESS|TAMPER)\b|Gate PR|implementationStatus/i,
    /[₹$€£]\s?\d|\b(AED|INR|USD)\s?\d/,
  ];
  for (const re of banned) assert.ok(!re.test(ALL) && !re.test(pageCode), `FAQ matches ${re}`);
});

test("every FAQ link and anchor resolves to a canonical page", () => {
  const pageFor = (href: string) => join(MARKETING, href.split(/[?#]/)[0].replace(/\/$/, ""), "page.tsx");
  const retired = /^\/(product\/|solutions|how-it-works|trust|for-cloud-teams|request-demo|pilot-application)/;
  for (const e of ENTRIES) {
    for (const l of e.links ?? []) {
      assert.ok(!retired.test(l.href), `${e.q} links retired ${l.href}`);
      assert.ok(existsSync(pageFor(l.href)), `${l.href} → missing`);
      const anchor = l.href.split("#")[1];
      if (anchor) {
        const src = readFileSync(pageFor(l.href), "utf8");
        assert.ok(src.includes(`id="${anchor}"`) || src.includes(`id: "${anchor}"`), `${l.href} has no #${anchor}`);
      }
    }
  }
  for (const s of FAQ) assert.ok(/^[a-z-]+$/.test(s.id), `bad category id ${s.id}`);
});

test("each FAQ question's tap target is at least 24px tall", () => {
  // The whole row must be clickable: padding on <details> is not part of the
  // <summary> hit area, so the vertical padding (or a min-height) belongs on <summary>.
  const faq = strip(readFileSync(join(ROOT, "app", "components", "marketing", "Faq.tsx"), "utf8"));
  const cls = (tag: string) => {
    const m = faq.match(new RegExp(`<${tag}\\b[^>]*className="([^"]*)"`));
    assert.ok(m, `no <${tag} className>`);
    return m[1].split(/\s+/);
  };
  const px = (c: string, re: RegExp) => Number(c.match(re)?.[1] ?? 0) * 4;
  const details = cls("details");
  assert.ok(!details.some((c) => /^(p|py|pt|pb)-\d/.test(c)), `<details> carries vertical padding (${details.join(" ")})`);
  const summary = cls("summary");
  const padY = Math.max(0, ...summary.map((c) => px(c, /^py-(\d+(?:\.\d+)?)$/) * 2 || px(c, /^p-(\d+(?:\.\d+)?)$/) * 2));
  const minH = Math.max(0, ...summary.map((c) => px(c, /^min-h-(\d+(?:\.\d+)?)$/)));
  assert.ok(padY >= 24 || minH >= 24, `<summary> tap target can be under 24px (padding ${padY}px, min-height ${minH}px)`);
});

test("/faq answers without duplicating /product", () => {
  assert.ok(!/CapabilityList|sample-record|VerificationPanel|EvidenceChain|ARIA_MODEL\.map\(\(m, i\)/.test(pageCode));
  const longest = Math.max(...ENTRIES.map((e) => e.a.length));
  assert.ok(longest < 700, `an answer is ${longest} characters`);
  const product = readFileSync(join(MARKETING, "product", "page.tsx"), "utf8");
  for (const heading of ["A findings list is not a fixed cloud", "Built for the people who close findings", "A sample closure record"]) {
    assert.ok(product.includes(heading) && !ALL.includes(heading));
  }
  assert.equal(CLOUDS.length, 3);
});
