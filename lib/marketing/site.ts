/**
 * The public marketing site's structure — one source for the header, the
 * footer, sitemap.xml and the route tests.
 *
 * Source of truth: docs/02_Company/Marketing/MARKETING_SITEMAP.md §2–§4.
 * Copy lives in each page; claims are governed by
 * docs/02_Company/Marketing/MARKETING_CLAIMS_GUARDRAILS.md.
 */

import {
  capabilityById,
  PRODUCT_CAPABILITIES,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  renderedState,
  STATE_LABEL,
} from "./capabilities";
import { contactHref } from "./contact";
import { INDUSTRIES, INDUSTRIES_HREF, industryHref } from "./industries";
import { SERVICE_PAGE_IDS, servicePageHref } from "./service-details";
import { serviceGroup } from "./services";

export interface NavLink {
  href: string;
  label: string;
  /** One line shown under the label in the desktop dropdown. */
  description?: string;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

/** Primary commercial call to action: a scoping call (the canonical contact intent). */
export const SCOPING_CALL_HREF = contactHref({ intent: "scoping" });
/** Where "See ARIA" leads. */
export const PLATFORM_HREF = "/product";
/**
 * "Talk to us about ARIA" (Rev B.1 §22). While no ARIA capability is
 * Available, the conversation is a registration of interest, not a booking.
 */
export const PLATFORM_TALK_HREF = contactHref({
  intent: publicCapabilities(PRODUCT_CAPABILITIES).some((c) => renderedState(c) === "available") ? "scoping" : "interest",
  source: "product",
});

export const SERVICES_HREF = "/services";
/** The operating-method page (Rev B.1 §27–§28). */
export const HOW_WE_WORK_HREF = "/how-we-work";
/** The labelled synthetic sample closure record (Marketing Strategy §18). */
export const SAMPLE_REPORT_HREF = "/sample-report";

/** The single /product page, by section (Rev B.1 §22, single page with anchors). */
export const PRODUCT_LINKS: NavLink[] = [
  { href: "/product", label: PRODUCT_DISPLAY_NAME },
  { href: "/product#remediation", label: "Remediation" },
  { href: "/product#verification", label: "Verification" },
  { href: "/product#drift", label: "Drift" },
  { href: "/product#evidence", label: "Evidence" },
  { href: "/product#availability", label: "What's available" },
  { href: SAMPLE_REPORT_HREF, label: "Sample report" },
];

export const SERVICE_LINKS: NavLink[] = [
  { href: SERVICES_HREF, label: "All services", description: "Assessment, testing, remediation and retainers" },
  { href: HOW_WE_WORK_HREF, label: "How we work", description: "Test → Fix → Verify → Keep secure" },
  { href: SCOPING_CALL_HREF, label: "Book a scoping call", description: "A written scope before any work starts" },
];

const SERVICE_GROUP_LABEL = { primary: "Core service", supporting: "Supporting service", specialist: "Specialist service" } as const;

/**
 * Header Services menu: the hub, then each service detail page, described by
 * its group and its current state from the registry (Rev B.1 §27).
 */
export const SERVICE_MENU_LINKS: NavLink[] = [
  { href: SERVICES_HREF, label: "All services", description: "Assessment, testing, remediation and retainers" },
  ...SERVICE_PAGE_IDS.flatMap((id) => {
    const s = capabilityById(id);
    if (!s) return [];
    const state = renderedState(s);
    if (state === "deferred") return [];
    return [{ href: servicePageHref(id), label: s.name, description: `${SERVICE_GROUP_LABEL[serviceGroup(s)]} · ${STATE_LABEL[state]}` }];
  }),
];

/** Industry pages, from lib/marketing/industries.ts. */
const INDUSTRY_PAGES: NavLink[] = Object.values(INDUSTRIES).map((i) => ({
  href: industryHref(i),
  label: i.name,
  description: i.navDescription,
}));

/** Header Industries menu: the hub, then each industry. */
export const INDUSTRY_LINKS: NavLink[] = [
  { href: INDUSTRIES_HREF, label: "All industries", description: "How we work with each industry" },
  ...INDUSTRY_PAGES,
];

export const CLOUD_LINKS: NavLink[] = [
  { href: "/cloud/aws", label: "AWS", description: "Read-only IAM role" },
  { href: "/cloud/azure", label: "Microsoft Azure", description: "Service principal with the Reader role" },
  { href: "/cloud/google-cloud", label: "Google Cloud", description: "Being expanded — see its current state" },
  { href: "/cloud", label: "All clouds", description: "What is supported and what is next" },
];

export type HeaderItem = ({ kind: "group" } & NavGroup) | ({ kind: "link" } & NavLink);

/** Header, in order (Rev B.1 §27). */
export const HEADER_NAV: HeaderItem[] = [
  { kind: "group", label: "Services", items: SERVICE_MENU_LINKS },
  { kind: "link", href: "/product", label: "Product" },
  { kind: "group", label: "Industries", items: INDUSTRY_LINKS },
  { kind: "group", label: "Cloud", items: CLOUD_LINKS },
  { kind: "link", href: HOW_WE_WORK_HREF, label: "How we work" },
  { kind: "link", href: "/pricing", label: "Pricing" },
  { kind: "link", href: "/about", label: "About" },
];

export const HEADER_CTA: NavLink = { href: SCOPING_CALL_HREF, label: "Book a scoping call" };

export const LEGAL_LINKS: NavLink[] = [
  { href: "/legal/privacy", label: "Privacy policy" },
  { href: "/legal/terms", label: "Terms of service" },
  { href: "/legal/dpa", label: "Data processing agreement" },
  { href: "/legal/subprocessors", label: "Subprocessors" },
  { href: "/security#disclosure", label: "Responsible disclosure" },
];

export const FOOTER_COLUMNS: NavGroup[] = [
  { label: "Services", items: SERVICE_LINKS },
  { label: "Product", items: PRODUCT_LINKS },
  { label: "Industries", items: [{ href: INDUSTRIES_HREF, label: "Industries" }, ...INDUSTRY_PAGES] },
  { label: "Cloud", items: CLOUD_LINKS },
  {
    label: "Company",
    items: [
      { href: "/about", label: "About" },
      { href: "/security", label: "Trust & security" },
      { href: "/pricing", label: "Pricing" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
  { label: "Legal", items: LEGAL_LINKS },
];

/**
 * Every indexable marketing route, with its sitemap weight. /resources and
 * the draft legal pages are listed separately in DRAFT_ROUTES.
 */
export const INDEXED_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/services", priority: 0.9 },
  ...SERVICE_PAGE_IDS.map((id) => ({ path: servicePageHref(id), priority: 0.7 })),
  { path: "/product", priority: 0.9 },
  { path: "/how-we-work", priority: 0.8 },
  { path: "/industries", priority: 0.8 },
  { path: "/industries/saas", priority: 0.8 },
  { path: "/industries/fintech", priority: 0.8 },
  { path: "/cloud", priority: 0.7 },
  { path: "/cloud/aws", priority: 0.8 },
  { path: "/cloud/azure", priority: 0.8 },
  { path: "/cloud/google-cloud", priority: 0.8 },
  { path: "/security", priority: 0.7 },
  { path: "/pricing", priority: 0.7 },
  { path: "/faq", priority: 0.6 },
  { path: SAMPLE_REPORT_HREF, priority: 0.5 },
  { path: "/about", priority: 0.5 },
  { path: "/contact", priority: 0.7 },
];

/**
 * Legal routes exist and are linked from the footer, but stay out of the
 * sitemap (and carry robots noindex) until counsel supplies their text.
 */
export const DRAFT_ROUTES: string[] = ["/legal/privacy", "/legal/terms", "/legal/dpa", "/legal/subprocessors", "/resources"];

/**
 * Retired and moved routes (Sitemap §4). Served as permanent redirects from
 * next.config.ts so old links and search results keep working.
 */
export const RETIRED_ROUTES: { source: string; destination: string }[] = [
  { source: "/architecture", destination: "/security#architecture" },
  { source: "/dpa", destination: "/legal/dpa" },
  { source: "/cloud/gcp", destination: "/cloud/google-cloud" },
  // Its audience (cloud teams wanting the method) is now served by /how-we-work.
  { source: "/for-cloud-teams", destination: HOW_WE_WORK_HREF },
  { source: "/for-mssps", destination: "/about" },
  // Rev B.1 §28: the old method page now lives at /how-we-work.
  { source: "/how-it-works", destination: HOW_WE_WORK_HREF },
  // Legacy demo-model URLs: kept working, landing on the scoping flow.
  { source: "/pilot-application", destination: SCOPING_CALL_HREF },
  { source: "/privacy", destination: "/legal/privacy" },
  { source: "/request-demo", destination: SCOPING_CALL_HREF },
  // Legacy draft-build routes retired on 2026-09-26 (Rev B.1 §28): the single
  // /product page with anchors replaces the product sub-pages, and the
  // solution pages map to the services that now carry their intent.
  { source: "/product/controls", destination: "/product#controls" },
  { source: "/product/drift-detection", destination: "/product#drift" },
  { source: "/product/evidence", destination: "/product#evidence" },
  { source: "/product/remediation", destination: "/product#remediation" },
  { source: "/product/verification", destination: "/product#verification" },
  { source: "/solutions", destination: "/services" },
  { source: "/solutions/audit-readiness", destination: servicePageHref("certification-readiness") },
  { source: "/solutions/customer-security-reviews", destination: "/services#cloud-security-assessment" },
  { source: "/status", destination: "/security#service" },
  { source: "/terms", destination: "/legal/terms" },
  { source: "/trust", destination: "/security" },
  { source: "/waitlist", destination: "/contact?intent=general" },
];

export const SITE_URL = "https://tricognita.com";

/**
 * Site-wide defaults for the root layout, the Open Graph card and the web
 * manifest: what a page shows when it sets none of its own, and what link
 * previews show. Worded from approved copy only (the homepage eyebrow and
 * description, and the Test → Fix → Verify → Keep secure method).
 */
export const SITE_NAME = "Tricognita";
export const SITE_TAGLINE = "Cloud Security Engineering";
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION = `Tricognita tests, fixes and verifies cloud security for companies in India and the UAE: security engineering services on AWS and Microsoft Azure, plus ${PRODUCT_DISPLAY_NAME}, for ${PRODUCT_DESCRIPTOR.toLowerCase()}.`;
export const SITE_METHOD = "Test → Fix → Verify → Keep secure";

export const SCOPE_LINE = "AWS and Microsoft Azure · Google Cloud launching · India and the UAE";
