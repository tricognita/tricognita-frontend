/**
 * Public company facts used by marketing pages. Every entry here must be true
 * today and verifiable. Do not add team members, company certifications,
 * customers, partners, licences or local infrastructure that do not exist.
 */

import { PRODUCT_DISPLAY_NAME } from "./capabilities";

/**
 * The founder. Name and title approved for public display on 2026-09-26.
 * Never add contact details, address, age, dates or other private details.
 */
export const FOUNDER = {
  name: "Nithish Kumar S",
  title: "Founder & Security Engineer — Tricognita",
  /** Individual credentials held by the founder. Not company certifications. */
  credentials: [
    "AWS Certified Solutions Architect – Professional",
    "AWS Certified Security – Specialty",
    "Quick Heal Digital Forensics & Incident Response (DFIR)",
    "CompTIA Network+",
    "Red Hat System Administration I (RH124)",
  ],
  /**
   * Areas of practice (Website Rebuild Plan Rev A §20 and founder brief,
   * 2026-09-25). Areas only: no employers, dates or private details.
   */
  focus: [
    "Cloud security engineering",
    "AWS and Microsoft Azure security",
    `Designing and building ${PRODUCT_DISPLAY_NAME}`,
    "Security automation",
    "DevSecOps and secure deployment",
    "Full-stack engineering",
    "Linux and security tooling",
  ],
  /**
   * Founder story: founder-approved working narrative (2026-09-26). Grounded,
   * in the founder's voice; no invented moments, customers or figures.
   */
  story: [
    "Building secure SaaS products made one problem clear to me: security work often ends with a findings list. The issues get identified, but fixing them, verifying the result and keeping those controls in place still takes repeated manual effort.",
    "Findings pile up, fixes are not always proven, and controls can quietly break again. I built Tricognita around closing that loop, Test → Fix → Verify → Keep secure, rather than stopping at the report.",
    `That is why Tricognita has two parts. Our services solve real customer security problems and show which workflows and fixes are safe to repeat. ${PRODUCT_DISPLAY_NAME} turns those repeatable parts into software, so there is less repetitive work, while people stay responsible for judgement, sensitive decisions and customer context.`,
    `${PRODUCT_DISPLAY_NAME} was built to turn repeated cloud security work into a repeatable verification and remediation workflow, with the customer approving every change.`,
  ],
} as const;

/** Founder's working 5–10 year vision (2026-09-26). No numerical targets. */
export const COMPANY_VISION =
  "We are building Tricognita into a cloud security engineering company where expert security services and our own security software reinforce each other. Services solve complex security problems, the product automates the repeatable work, and together they let us serve more customers without relying entirely on growing human effort in step.";

export interface Market {
  id: "india" | "uae";
  name: string;
  body: string;
  /** Why this market (founder-approved working rationale). Shown on /about. */
  rationale: string;
}

/** Both markets are served from day one. No local proof is claimed for either. */
export const MARKETS: readonly Market[] = [
  {
    id: "india",
    name: "India",
    body:
      "Cloud security engineering for Indian SaaS, fintech and technology teams preparing for enterprise customer reviews, ISO 27001 or SOC 2 audits and regulator expectations.",
    rationale:
      "Our first commercial base. Tricognita is being built from India, and we work directly with Indian SaaS, technology and security teams.",
  },
  {
    id: "uae",
    name: "United Arab Emirates",
    body:
      "The same engineering, scoping and approval model for UAE companies running on AWS and Microsoft Azure. Engagements are scoped and delivered remotely, with on-site work agreed per engagement.",
    rationale:
      "Part of our target market from the start. Tricognita is built to serve cloud-driven businesses beyond one geography, and the UAE is an important regional market.",
  },
];

/**
 * Tricognita's engineering principles. Shown on /about and /security; one
 * source so the two pages cannot drift apart.
 */
export const ENGINEERING_PRINCIPLES = [
  {
    title: "Authorization before change",
    body: "Nothing in a customer's cloud changes without approval from a named person in their organisation.",
  },
  {
    title: "Bounded remediation",
    body: "Each change is scoped to the resource and the control it fixes, with a plan to roll it back.",
  },
  {
    title: "Verification, not assumption",
    body: "A fix counts only when the check that found the problem passes on the same resource.",
  },
  {
    title: "Evidence and traceability",
    body: "Checks, approvals and changes are recorded, so anyone reviewing the work can follow what happened.",
  },
  {
    title: "Least-privilege access",
    body: "Checking uses read-only access. Changing needs a separate, narrow permission the customer grants and can remove.",
  },
  {
    title: "Cloud-aware engineering",
    body: "AWS, Azure and Google Cloud each work differently. Controls are checked and fixed the way each cloud actually behaves.",
  },
  {
    title: "People decide what matters",
    body: "Judgement on risk, priority and sensitive production changes stays with people, never with software alone.",
  },
] as const;

/** How customer data is handled. Kept deliberately narrow: no residency claims. */
export const DATA_HANDLING = [
  "The platform evaluates cloud configuration and control results.",
  "Access uses read-only roles you create and can revoke at any time.",
  "Where data is stored and processed is set out in writing for each engagement.",
] as const;

/**
 * Published customer proof: case studies, quotes, logos. Empty until a
 * customer has approved publication in writing. Pages hide the proof section
 * while this is empty; never add placeholder or illustrative customers.
 */
export interface ProofItem {
  customer: string;
  market: Market["id"];
  summary: string;
  approvedInWriting: true;
}
export const PUBLISHED_PROOF: readonly ProofItem[] = [];
