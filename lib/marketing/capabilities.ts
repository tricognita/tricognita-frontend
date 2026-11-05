/**
 * The marketing site's single source of truth for what Tricognita offers and
 * in what state.
 *
 * Source: docs/02_Company/Marketing/TRICOGNITA_WEBSITE_REBUILD_PLAN.md
 * Revision B.1 §3.2–§3.4 and §18, and the Gate PR audit of 2026-09-25.
 *
 * Two state systems are kept apart and never merged:
 *  - `implementationStatus` — what engineering has built and validated.
 *    Internal. Never rendered.
 *  - `publicState` — what the website says. The only state pages render.
 *
 * Invariant: a capability can be built and validated (implementation
 * "available") without being publicly Available. A product capability is
 * publicly Available only when Gate PR has passed, every capability gate it
 * names has passed, and the founder has approved and logged the change
 * (docs/02_Company/Marketing/CAPABILITY_STATE_LOG.md, proposed). The guardrail
 * tests in lib/marketing-capabilities.test.ts enforce this.
 *
 * Never hard-code a state, a product name or a price in a page. Read it here.
 */

/* ── Product naming ─────────────────────────────────────────────────────────
 * Founder decision, 2026-09-25: the public product name is ARIA. It names the
 * E1 cloud-control product only (evaluation, approved bounded remediation, fix
 * tracking, verification, scheduled re-checks and drift, signed evidence,
 * closure records). It never refers to the separate internal incident-response
 * engine, which stays unpublished. Pages render the name from here only.
 * Trademark clearance is not recorded as complete. */
export const PRODUCT_DISPLAY_NAME = "ARIA";
export const PRODUCT_NAME_TRADEMARK_CLEARED = false;
/** What the product does, in one line. */
export const PRODUCT_DESCRIPTOR = "Cloud control remediation and verification";
/** The broader category people search for. */
export const PRODUCT_CATEGORY = "Cloud security automation";

/* ── Gates ──────────────────────────────────────────────────────────────── */
export type GateId = "PR" | "G-ENABLE" | "G-AWSFIX" | "G-SCHED" | "G-ALERT" | "G-EXPORT" | "G-ACCESS" | "G-TAMPER" | "G-GCP";

/** Gate PR (product production readiness). Not passed as of 2026-09-25. */
export const GATE_PR_PASSED = false;
/** Capability gates that have passed and been logged. None yet. */
export const GATES_PASSED: readonly GateId[] = [];

/* ── States ─────────────────────────────────────────────────────────────── */
export type PublicState = "available" | "launching" | "planned" | "deferred";
export type ImplementationStatus = "available" | "gated" | "in-development" | "planned" | "not-validated";
export type Engine = "service" | "product";
export type Family = "test" | "fix" | "verify" | "keep" | "readiness" | "build" | "cloud";
export type Tier = "primary" | "secondary" | "specialist";
export type CloudId = "aws" | "azure" | "gcp";

export interface Capability {
  id: string;
  name: string;
  engine: Engine;
  family: Family;
  tier?: Tier;
  /** The only state the website renders. */
  publicState: PublicState;
  /** Internal. Product entries only. Never rendered. */
  implementationStatus?: ImplementationStatus;
  /** Gates that must pass before this can be publicly Available. */
  gates?: readonly GateId[];
  /** Launch work is under way (lets an unbuilt capability show as Launching). */
  launchWorkStarted?: boolean;
  /** "public" by default; "never" keeps an entry off every public surface. */
  visibility?: "public" | "never";
  /** One customer-facing sentence. Must pass the claims guardrails. */
  summary: string;
  /**
   * Clouds this applies to. Product: omitted = not cloud-specific. Service:
   * omitted = not tied to a cloud (e.g. application testing). A service's state
   * on a cloud is never stronger than that cloud's servicesState.
   */
  clouds?: readonly CloudId[];
  /** Exact approved wording where a capability is sold by enablement. */
  enablementWording?: string;
  /** Founder-approved "from" price per region. null until approved. */
  priceFrom?: { india?: string; uae?: string } | null;
}

/** The approved wording for customer-authorised automated fixes. */
export const ENABLEMENT_WORDING =
  "Supported automated fixes are available by enablement for supported controls, subject to customer authorization.";

/* ── Services: what Tricognita's engineers do ───────────────────────────────
 * Summaries are cloud-neutral; which clouds a service covers lives in
 * `clouds`, and its state on a cloud is derived in lib/marketing/clouds.ts.
 *
 * Google Cloud coverage (founder decision, 2026-09-26, locked): only Cloud
 * Security Assessment, Remediation & Hardening and Security Retainer cover
 * Google Cloud. Their state there stays capped by the Google Cloud services
 * state until its capability gate passes. lib/marketing-capabilities.test.ts
 * fails if this set changes. */
export const SERVICES: readonly Capability[] = [
  {
    id: "cloud-security-assessment",
    name: "Cloud Security Assessment",
    engine: "service",
    clouds: ["aws", "azure", "gcp"],
    family: "test",
    tier: "primary",
    publicState: "available",
    summary:
      "A structured review of your cloud environment: what fails, why it matters, and what to fix first.",
    priceFrom: null,
  },
  {
    id: "penetration-testing",
    name: "Penetration Testing (VAPT)",
    engine: "service",
    family: "test",
    tier: "primary",
    publicState: "launching",
    summary: "Web, API, external and cloud penetration testing, with a retest after fixes.",
    priceFrom: null,
  },
  {
    id: "remediation-hardening",
    name: "Remediation & Hardening",
    engine: "service",
    clouds: ["aws", "azure", "gcp"],
    family: "fix",
    tier: "primary",
    publicState: "available",
    summary:
      "We plan every fix and work with your engineers to apply it safely: identity, network, logging, encryption, storage and backups.",
    priceFrom: null,
  },
  {
    id: "security-retainer",
    name: "Security Retainer",
    engine: "service",
    clouds: ["aws", "azure", "gcp"],
    family: "keep",
    tier: "primary",
    publicState: "available",
    summary: "Recurring review, re-checks, drift fixes and periodic testing, so controls stay in place between audits.",
    priceFrom: null,
  },
  {
    id: "devsecops",
    name: "DevSecOps & CI/CD Security",
    engine: "service",
    clouds: ["aws", "azure"],
    family: "fix",
    tier: "secondary",
    publicState: "available",
    summary: "Security built into your pipelines and infrastructure code, not added after release.",
    priceFrom: null,
  },
  {
    id: "certification-readiness",
    name: "Certification Technical Readiness",
    engine: "service",
    clouds: ["aws", "azure"],
    family: "readiness",
    tier: "secondary",
    publicState: "available",
    summary:
      "The technical controls your ISO 27001 or SOC 2 auditor will test, implemented and evidenced alongside your compliance consultant. Certification is issued by independent auditors.",
    priceFrom: null,
  },
  {
    id: "secure-cloud-engineering",
    name: "Secure Cloud Engineering",
    engine: "service",
    clouds: ["aws", "azure"],
    family: "build",
    tier: "secondary",
    publicState: "available",
    summary: "Secure cloud architecture, platforms and applications, designed with security from the start.",
    priceFrom: null,
  },
  {
    id: "resilience",
    name: "Resilience Review",
    engine: "service",
    clouds: ["aws", "azure"],
    family: "fix",
    tier: "specialist",
    publicState: "available",
    summary: "Backups, restore paths and availability-zone versus region design, reviewed and fixed.",
    priceFrom: null,
  },
  {
    id: "cost-security-review",
    name: "Cost & Security Review",
    engine: "service",
    clouds: ["aws", "azure"],
    family: "test",
    tier: "specialist",
    publicState: "available",
    summary: "Cloud cost savings and the most important security findings, in one short review.",
    priceFrom: null,
  },
  {
    id: "kubernetes-security",
    name: "Kubernetes Security",
    engine: "service",
    clouds: ["aws", "azure"],
    family: "fix",
    tier: "specialist",
    publicState: "launching",
    summary: "Managed Kubernetes cluster hardening and review.",
    priceFrom: null,
  },
  {
    id: "ai-llm-security-testing",
    name: "AI / LLM Application Security Testing",
    engine: "service",
    family: "test",
    tier: "specialist",
    publicState: "planned",
    summary: "Security testing for applications built on large language models.",
    priceFrom: null,
  },
  {
    id: "pci-support",
    name: "PCI DSS Technical Support",
    engine: "service",
    family: "readiness",
    tier: "specialist",
    publicState: "planned",
    summary: "Technical PCI DSS controls and remediation, alongside your qualified security assessor.",
    priceFrom: null,
  },
  {
    id: "iso-42001",
    name: "ISO 42001 Technical Security",
    engine: "service",
    family: "readiness",
    tier: "specialist",
    publicState: "planned",
    summary: "Technical security work for AI management systems.",
    priceFrom: null,
  },
];

/* ── Product: what ARIA automates ───────────────────────
 * Gate PR has not passed, so every built product capability is publicly
 * Launching and every unbuilt one is Planned (Revision B.1 §3.4). */
export const PRODUCT_CAPABILITIES: readonly Capability[] = [
  {
    id: "evaluation-aws",
    name: "Control evaluation on AWS",
    engine: "product",
    family: "cloud",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    clouds: ["aws"],
    summary: "Checks your cloud security controls resource by resource, from read-only access.",
  },
  {
    id: "evaluation-azure",
    name: "Control evaluation on Microsoft Azure",
    engine: "product",
    family: "cloud",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    clouds: ["azure"],
    summary: "The same controls, checked the right way on Azure, from Reader access.",
  },
  {
    id: "evaluation-gcp",
    name: "Control evaluation on Google Cloud",
    engine: "product",
    family: "cloud",
    publicState: "launching",
    implementationStatus: "planned",
    // Founder direction, 2026-09-25: Google Cloud is being built rapidly and
    // is part of the advertised footprint. Launching, never Available before G-GCP.
    launchWorkStarted: true,
    gates: ["PR", "G-GCP"],
    clouds: ["gcp"],
    summary: "Google Cloud support is in active development and is being expanded rapidly.",
  },
  {
    // Register P4. The AWS role is to be narrowed under Gate PR.
    id: "read-only-onboarding",
    name: "Read-only onboarding",
    engine: "product",
    family: "cloud",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    clouds: ["aws", "azure"],
    summary: "Connect with an IAM role on AWS or a Reader service principal on Azure. Checking never needs write access.",
  },
  {
    // Register P7.
    id: "approval-model",
    name: "Named, time-limited approvals",
    engine: "product",
    family: "fix",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    summary: "Every change needs a one-time, time-limited approval from a named person in your organisation, and the control is re-checked before the change runs.",
  },
  {
    // Register P5. Individually validated Azure actions only; off by default per organisation.
    id: "fixes-azure",
    name: "Customer-authorised fixes on Azure",
    engine: "product",
    family: "fix",
    publicState: "launching",
    implementationStatus: "gated",
    gates: ["PR", "G-ENABLE"],
    clouds: ["azure"],
    enablementWording: ENABLEMENT_WORDING,
    summary: "A bounded change to the one resource that failed, for individually validated Azure actions, applied only after a named approval.",
  },
  {
    // Register P6. Never executed live; the published role denies writes.
    id: "fixes-aws",
    name: "Customer-authorised fixes on AWS",
    engine: "product",
    family: "fix",
    publicState: "launching",
    implementationStatus: "gated",
    gates: ["PR", "G-ENABLE", "G-AWSFIX"],
    clouds: ["aws"],
    enablementWording: ENABLEMENT_WORDING,
    summary: "The same bounded, approved fix model on AWS, for a narrow set of supported actions.",
  },
  {
    id: "customer-applied-fixes",
    name: "Tracking for fixes your team applies",
    engine: "product",
    family: "fix",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    summary: "Record the proposal, the approval and the change your engineers made, then verify it.",
  },
  {
    id: "verification",
    name: "Same-check verification",
    engine: "product",
    family: "verify",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    summary: "The check that found the problem confirms the fix. Only a passing check counts as fixed.",
  },
  {
    id: "scheduled-rechecks",
    name: "Scheduled re-checks and drift detection",
    engine: "product",
    family: "keep",
    publicState: "launching",
    implementationStatus: "gated",
    gates: ["PR"],
    summary: "Controls are re-checked on a schedule, and a control that passed and now fails is flagged.",
  },
  {
    // Register P11.
    id: "drift-alerts",
    name: "Drift alerts",
    engine: "product",
    family: "keep",
    publicState: "launching",
    implementationStatus: "in-development",
    gates: ["PR", "G-ALERT"],
    summary: "Notice of a drifted control sent to the people and tools your team chooses.",
  },
  {
    id: "signed-records",
    name: "Signed, linked evidence records",
    engine: "product",
    family: "verify",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    summary: "Every check is saved as a signed record linked to the one before, with integrity checked when viewed.",
  },
  {
    id: "closure-record",
    name: "Verified closure record",
    engine: "product",
    family: "verify",
    publicState: "launching",
    implementationStatus: "available",
    gates: ["PR"],
    summary: "What failed, what changed, who approved it, whether the fix worked and whether it stayed fixed.",
  },
  {
    id: "client-access",
    name: "Client access",
    engine: "product",
    family: "keep",
    publicState: "launching",
    implementationStatus: "gated",
    gates: ["PR", "G-ACCESS"],
    summary: "Your team and your auditor see results and records directly, with role-based access.",
  },
  {
    id: "findings-and-reports",
    name: "Findings, drift history and reports",
    engine: "product",
    family: "keep",
    publicState: "planned",
    implementationStatus: "in-development",
    gates: ["PR"],
    summary: "Views and reports built on the same records.",
  },
  {
    id: "assisted-fix-proposals",
    name: "Assisted fix proposals",
    engine: "product",
    family: "fix",
    publicState: "planned",
    implementationStatus: "planned",
    gates: ["PR"],
    summary: "Draft fixes prepared for your engineers, always approved by you before anything changes.",
  },
  {
    // A separate incident-response research engine. Not validated, outside the
    // security-control product, and never shown on any public or customer surface.
    id: "internal-research-engine",
    name: "Internal research engine",
    engine: "product",
    family: "keep",
    publicState: "deferred",
    implementationStatus: "not-validated",
    visibility: "never",
    summary: "Not published.",
  },
];

/* ── Clouds ─────────────────────────────────────────────────────────────── */
export interface CloudEntry {
  id: CloudId;
  /** URL segment of the cloud page: /cloud/<slug>. */
  slug: string;
  name: string;
  /** Services Tricognita's engineers deliver on this cloud. */
  servicesState: PublicState;
  /** The platform capability for this cloud (read its state from the registry). */
  platformCapabilityId: string;
  /** The bounded-fix capability for this cloud, if any. */
  fixCapabilityId?: string;
  access: string;
}

export const CLOUDS: readonly CloudEntry[] = [
  {
    id: "aws",
    slug: "aws",
    name: "AWS",
    servicesState: "available",
    platformCapabilityId: "evaluation-aws",
    fixCapabilityId: "fixes-aws",
    access: "A read-only IAM role you create in your account and can remove at any time.",
  },
  {
    id: "azure",
    slug: "azure",
    name: "Microsoft Azure",
    servicesState: "available",
    platformCapabilityId: "evaluation-azure",
    fixCapabilityId: "fixes-azure",
    access: "A service principal with the built-in Reader role.",
  },
  {
    id: "gcp",
    slug: "google-cloud",
    name: "Google Cloud",
    servicesState: "launching",
    platformCapabilityId: "evaluation-gcp",
    access: "A least-privilege service account. In active development.",
  },
];

/* ── Product pricing (Rev B.1 §8 pricing experiment) ─────────────────────
 * No numbers until the founder approves them. */
export const PRODUCT_PRICING = {
  // Rev B.1 §17: "includes platform access" only once Gate PR and G-ACCESS pass.
  retainer: GATE_PR_PASSED && GATES_PASSED.includes("G-ACCESS")
    ? "Platform access is included with the Security Retainer."
    : "Platform access is included with the Security Retainer as its capabilities launch.",
  standalone: {
    state: "launching" as PublicState,
    label: "Standalone access",
    note: "Talk to us.",
    // Path B pilot happens after Gate PR; there are no pilot customers yet.
    detail: "Standalone packaging and pricing will be set with early pilot customers. No standalone price is published yet.",
  },
} as const;

/* ── Resolution ─────────────────────────────────────────────────────────── */

/** True when every gate the capability names has passed. */
export function gatesMet(c: Capability): boolean {
  return (c.gates ?? []).every((g) => (g === "PR" ? GATE_PR_PASSED : GATES_PASSED.includes(g)));
}

/**
 * The state a page may render. Fail-safe: a product capability declared
 * Available without its gates is rendered as Launching; an unbuilt one without
 * launch work is rendered as Planned. The tests assert the declared state
 * never needs this correction.
 */
export function renderedState(c: Capability): PublicState {
  if (c.visibility === "never") return "deferred";
  if (c.engine !== "product") return c.publicState;
  if (c.publicState === "available" && !gatesMet(c)) return "launching";
  if (c.publicState === "launching" && c.implementationStatus === "planned" && !c.launchWorkStarted) return "planned";
  return c.publicState;
}

/** Capabilities that may appear on public pages. */
export function publicCapabilities(list: readonly Capability[]): Capability[] {
  return list.filter((c) => c.visibility !== "never" && renderedState(c) !== "deferred");
}

export function capabilityById(id: string): Capability | undefined {
  return [...SERVICES, ...PRODUCT_CAPABILITIES].find((c) => c.id === id);
}

export const STATE_LABEL: Record<Exclude<PublicState, "deferred">, string> = {
  available: "Available",
  launching: "Launching",
  planned: "Planned",
};
