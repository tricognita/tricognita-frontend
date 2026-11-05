/**
 * Service content for /services (Website Rebuild Plan Rev B.1 §17, Rev A §18).
 *
 * Names and states live in lib/marketing/capabilities.ts (SERVICES). This file
 * adds what a buyer needs to choose a service, keyed by the same ids, and
 * which ARIA capabilities support each one (their states also come from the
 * registry). Never restate a state here.
 */
import { PRODUCT_DISPLAY_NAME, renderedState, type Capability, type CloudId, type PublicState } from "./capabilities";
import { contactHref } from "./contact";

export type ServiceGroup = "primary" | "supporting" | "specialist";

export interface ServiceDetail {
  /** Who the service is for. */
  audience: string;
  /** Common reasons a team gets in touch. */
  triggers: string[];
  /** What is in scope. */
  scope: string[];
  /** What we do. */
  work: string;
  /** What the customer receives. */
  receives: string[];
  /** Product capability ids from the registry that support this service. */
  aria: string[];
  /** How ARIA helps, or why it does not. */
  ariaNote: string;
}

/**
 * Detail for every service with a public state. Primary services get the full
 * treatment; supporting and specialist services use the shorter fields.
 */
export const SERVICE_DETAILS: Record<string, ServiceDetail> = {
  "cloud-security-assessment": {
    audience: "Engineering and security leads at companies running on AWS or Microsoft Azure.",
    triggers: [
      "You want an independent review of your cloud security",
      "An architecture change or incident raised concerns",
      "A customer security review or questionnaire is coming",
      "You are preparing for an ISO 27001 or SOC 2 audit",
      "You need a security baseline to plan against",
    ],
    scope: [
      "Identity and access management",
      "Network controls",
      "Logging and monitoring",
      "Storage",
      "Encryption",
      "Account configuration",
      "Resilience-related controls",
    ],
    work: "We review your environment from read-only access, confirm what fails and why it matters, and agree the order in which to fix it.",
    receives: [
      "Findings with the affected resources",
      "Prioritised remediation guidance",
      "How each fix will be verified",
      "Signed records of the checks where the product is used",
    ],
    aria: ["evaluation-aws", "evaluation-azure", "signed-records"],
    ariaNote: "Control evaluation checks each control on each resource, so findings are consistent and can be re-checked later.",
  },
  "penetration-testing": {
    audience: "Teams that need their web applications, APIs or external attack surface tested.",
    triggers: [
      "A customer or partner asks for a penetration test report",
      "A major release or new API is going live",
      "You want to know what an attacker could reach from outside",
    ],
    scope: ["Web applications", "APIs", "External attack surface", "Cloud-related testing where applicable"],
    work: "Scoped, authorised testing with written rules of engagement, followed by a retest once fixes are in.",
    receives: ["Findings with reproduction steps and severity", "Remediation guidance", "A retest of fixed findings"],
    aria: ["customer-applied-fixes", "verification"],
    ariaNote:
      `${PRODUCT_DISPLAY_NAME} does not test applications. Cloud-configuration findings from a test can be tracked and verified in ${PRODUCT_DISPLAY_NAME}.`,
  },
  "remediation-hardening": {
    audience: "Teams with findings from an assessment, a test or an audit, and not enough hands to close them safely.",
    triggers: [
      "You already have a findings list",
      "An audit or customer review found gaps",
      "You need to harden an environment before a launch",
    ],
    scope: [
      "Identity and access management",
      "Network",
      "Logging",
      "Encryption",
      "Storage",
      "Backup and resilience",
      "Cloud configuration",
    ],
    work: "We plan each fix with your engineers, apply it with your approval and a rollback plan, and re-check it. Complex and sensitive changes stay engineering-led.",
    receives: [
      "A remediation plan in priority order",
      "Engineering changes where scoped and approved",
      "Verification of each fix",
      "A closure record of what changed and whether it held",
    ],
    aria: ["fixes-azure", "fixes-aws", "customer-applied-fixes", "verification", "closure-record"],
    ariaNote:
      `Where the relevant capability is available, ${PRODUCT_DISPLAY_NAME} applies bounded, approved fixes for supported controls and verifies each one. Everything else is tracked and verified the same way.`,
  },
  "security-retainer": {
    audience: "Teams that want security engineering on hand, month after month, without a full-time hire.",
    triggers: [
      "Controls keep drifting after they are fixed",
      "You need regular re-checks for customers or auditors",
      "You want a security engineer to call on",
    ],
    scope: [
      "Recurring review of your cloud controls",
      "Re-checks and drift awareness",
      "Remediation support",
      "Verification of changes",
      "Security engineering access for questions and reviews",
    ],
    work: "A recurring cadence of review, re-checking and fixes, agreed in the retainer scope.",
    receives: [
      "Recurring findings and re-check results",
      "Help closing new issues",
      "Verification and records of what changed",
      "Recommendations and next steps each cycle",
    ],
    aria: ["scheduled-rechecks", "drift-alerts", "verification", "client-access"],
    ariaNote: `${PRODUCT_DISPLAY_NAME} access will be included with the retainer as its capabilities launch.`,
  },
  devsecops: {
    audience: "Teams shipping through CI/CD who want security built in rather than added later.",
    triggers: ["Pipelines deploy to production without security checks", "Infrastructure code is growing"],
    scope: ["CI/CD pipelines", "Infrastructure as code", "Secrets handling", "Secure deployment"],
    work: "We add security checks and safer defaults to your pipelines and infrastructure code.",
    receives: ["Pipeline and infrastructure-code changes", "Guidance for your engineers"],
    aria: [],
    ariaNote: `Engineering-led work; not an ${PRODUCT_DISPLAY_NAME} workflow.`,
  },
  "certification-readiness": {
    audience: "Teams preparing for ISO 27001 or SOC 2 who need the technical controls done.",
    triggers: ["An audit date is set", "A customer requires a certification"],
    scope: ["Technical controls your auditor will test", "Evidence of those controls"],
    work: "We implement and evidence the technical controls alongside your compliance consultant. Certification is issued by independent auditors.",
    receives: ["Implemented technical controls", "Evidence for your auditor"],
    aria: ["signed-records", "closure-record", "client-access"],
    ariaNote: "Signed records and closure records help show what was checked and fixed. They are records, not audit opinions.",
  },
  "secure-cloud-engineering": {
    audience: "Teams building or changing their AWS or Azure environment.",
    triggers: ["A new environment, platform or migration", "A redesign of an existing environment"],
    scope: ["Architecture", "Landing zones and platforms", "Applications on AWS and Azure"],
    work: "We design and build with security from the start.",
    receives: ["Architecture and engineering work", "A security baseline to check against"],
    aria: ["evaluation-aws", "evaluation-azure"],
    ariaNote: "Control evaluation can check the new environment against the same baseline.",
  },
  resilience: {
    audience: "Teams that need to know their backups and recovery actually work.",
    triggers: ["Backups have never been restored", "Availability design is unclear"],
    scope: ["Backups and restore paths", "Availability-zone and region design"],
    work: "We review recovery design and fix the gaps.",
    receives: ["Findings and fixes", "A tested restore path where scoped"],
    aria: ["evaluation-aws", "evaluation-azure"],
    ariaNote: "Resilience-related controls are part of the evaluated catalogue.",
  },
  "cost-security-review": {
    audience: "Teams that want to cut cloud cost and see their most important security issues in one pass.",
    triggers: ["Cloud spend is rising", "You want a quick first view before a larger engagement"],
    scope: ["Cloud cost", "Top security findings"],
    work: "A short, combined review of cost and security.",
    receives: ["Cost-saving recommendations", "The most important security findings"],
    aria: ["evaluation-aws", "evaluation-azure"],
    ariaNote: "Control evaluation supplies the security findings.",
  },
  "kubernetes-security": {
    audience: "Teams running EKS or AKS.",
    triggers: ["Clusters grew without a security review"],
    scope: ["EKS and AKS cluster configuration"],
    work: "Cluster hardening and review.",
    receives: ["Findings and hardening changes"],
    aria: [],
    ariaNote: `Engineering-led work; not an ${PRODUCT_DISPLAY_NAME} workflow.`,
  },
  "ai-llm-security-testing": {
    audience: "Teams building applications on large language models.",
    triggers: [],
    scope: [],
    work: "Security testing for LLM applications.",
    receives: [],
    aria: [],
    ariaNote: "",
  },
  "pci-support": {
    audience: "Teams handling card data.",
    triggers: [],
    scope: [],
    work: "Technical PCI DSS controls and remediation.",
    receives: [],
    aria: [],
    ariaNote: "",
  },
  "iso-42001": {
    audience: "Teams running AI management systems.",
    triggers: [],
    scope: [],
    work: "Technical security work for ISO 42001.",
    receives: [],
    aria: [],
    ariaNote: "",
  },
};

/** Service pricing wording where no founder-approved price exists (Rev B.1 §8). */
export const FIXED_AFTER_SCOPING = "Fixed price after scoping";

/**
 * The price line a service may show, from its rendered state and any
 * founder-approved "from" price in the registry. Never a made-up number.
 */
export function servicePriceLabel(c: Capability): string | null {
  const state = renderedState(c);
  if (state === "available") {
    const from = [c.priceFrom?.india && `From ${c.priceFrom.india} (India)`, c.priceFrom?.uae && `From ${c.priceFrom.uae} (UAE)`]
      .filter(Boolean)
      .join(" · ");
    return from || FIXED_AFTER_SCOPING;
  }
  if (state === "launching") return "Priced at launch";
  return null;
}

/** Where "Register interest" leads for a Launching service. */
export function interestHref(serviceId: string, cloud?: CloudId): string {
  return contactHref({ intent: "interest", service: serviceId, cloud });
}

/**
 * The call to action a service may show, from its rendered state:
 * Available → book a scoping call; Launching → register interest; Planned → none.
 */
export function serviceCta(c: Capability): { href: string; label: string } | null {
  return ctaForState(renderedState(c), c.id);
}

/**
 * The same rule for a state computed elsewhere (e.g. a service, or a whole
 * cloud, on one cloud page). The link prefills the contact form.
 */
export function ctaForState(
  state: PublicState,
  serviceId?: string,
  ctx: { cloud?: CloudId } = {},
): { href: string; label: string } | null {
  if (state === "available") {
    return { href: contactHref({ intent: "scoping", service: serviceId, cloud: ctx.cloud }), label: "Book a scoping call" };
  }
  if (state === "launching") return { href: contactHref({ intent: "interest", service: serviceId, cloud: ctx.cloud }), label: "Register interest" };
  return null;
}

/**
 * Page grouping (Rev B.1): the registry tier decides primary; secondary and
 * available specialist services are "supporting"; the rest are "specialist".
 */
export function serviceGroup(c: Capability): ServiceGroup {
  if (c.tier === "primary") return "primary";
  if (c.tier === "secondary" || (c.tier === "specialist" && renderedState(c) === "available")) return "supporting";
  return "specialist";
}

/** "How to choose": a trigger that points at one service, not a ranking. */
export const CHOOSER: { need: string; serviceId: string }[] = [
  { need: "I have a security question about my cloud", serviceId: "cloud-security-assessment" },
  { need: "I need a penetration test", serviceId: "penetration-testing" },
  { need: "I already have findings", serviceId: "remediation-hardening" },
  { need: "I need ongoing support", serviceId: "security-retainer" },
  { need: "I'm preparing for ISO 27001 or SOC 2", serviceId: "certification-readiness" },
  { need: "I'm building or changing my cloud", serviceId: "secure-cloud-engineering" },
  { need: "I'm worried about backups and recovery", serviceId: "resilience" },
  { need: "I need Kubernetes security", serviceId: "kubernetes-security" },
];

/* ── Pricing (Rev B.1 §8, §29) ─────────────────────────────────────────────
 * No numbers unless the founder has approved a "from" price in the registry. */

export const SERVICE_PRICE_WORDING = "Fixed price after scoping";

/** The price line a service may show, from its approved price and state. */
export function servicePrice(c: Capability): string | null {
  const state = renderedState(c);
  if (state === "planned" || state === "deferred") return null;
  if (state === "launching") return "Priced at launch";
  const from = c.priceFrom?.india ?? c.priceFrom?.uae;
  return from ? `From ${from}` : SERVICE_PRICE_WORDING;
}

/** What a scoping call settles, and so what a price depends on. */
export const PRICING_FACTORS: { title: string; body: string }[] = [
  { title: "Scope and objective", body: "What the work must achieve, and for whom: your team, a customer or an auditor." },
  { title: "Cloud environment", body: "Which clouds, and how accounts, subscriptions and projects are organised." },
  { title: "Number and size of environments", body: "How many environments are in scope, and how large they are." },
  { title: "Assessment or testing depth", body: "Which controls, applications or attack surfaces are covered." },
  { title: "Remediation complexity", body: "How many fixes, how risky they are, and who applies them." },
  { title: "Timeline", body: "When the work needs to be finished." },
  { title: "Engineering involvement", body: "How much hands-on engineering your team wants from us." },
];

/** Buying path: a need that points at a service (or at ARIA), not a ranking. */
export const BUYING_PATH: { need: string; target: string | "aria" }[] = [
  { need: "I need a security assessment", target: "cloud-security-assessment" },
  { need: "I have findings that need fixing", target: "remediation-hardening" },
  { need: "I need ongoing support", target: "security-retainer" },
  { need: "I need DevSecOps or security engineering", target: "devsecops" },
  { need: "I need secure cloud architecture", target: "secure-cloud-engineering" },
  { need: "I need a penetration test", target: "penetration-testing" },
  { need: "I want to discuss the product", target: "aria" },
];

/** What happens after a scoping call is booked. No timelines are promised. */
export const ENGAGEMENT_STEPS: { title: string; body: string }[] = [
  { title: "Scoping call", body: "A conversation about your cloud and what you need." },
  { title: "Understand the environment", body: "We learn how your environment is set up and what the objective is." },
  { title: "Define the scope", body: "We agree what is in and out of scope." },
  { title: "Confirm deliverables", body: "We agree what you will receive." },
  { title: "Commercial proposal", body: "You receive a written proposal with the price." },
  { title: "Begin the engagement", body: "Work starts once you accept the proposal." },
];
