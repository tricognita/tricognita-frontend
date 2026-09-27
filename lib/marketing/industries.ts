/**
 * Industry landing pages (Website Rebuild Plan Rev B.1, Rev A §19 template).
 *
 * Copy only. Services and ARIA capabilities are referenced by registry id;
 * their names, states and calls to action always come from
 * lib/marketing/capabilities.ts and lib/marketing/services.ts. There is no
 * industry-only service catalogue.
 */
import { PRODUCT_DISPLAY_NAME } from "./capabilities";

export type IndustryId = "saas" | "fintech";

export interface IndustryChallenge {
  title: string;
  body: string;
}

/** How Tricognita responds to one challenge, pointing at registry ids. */
export interface IndustryResponse {
  challenge: string;
  response: string;
  serviceIds: string[];
  capabilityIds: string[];
}

export interface IndustryStep {
  title: string;
  body: string;
  /** The registry service that delivers this step. */
  serviceId?: string;
  /** The ARIA capability that supports it. */
  capabilityId?: string;
}

export interface Industry {
  id: IndustryId;
  slug: string;
  name: string;
  /** Header menu description. */
  navDescription: string;
  /** Two-sentence card summary for the /industries hub. */
  summary: string;
  eyebrow: string;
  title: string;
  intro: string;
  /** The service whose state decides the hero's booking CTA. */
  primaryServiceId: string;
  challengesTitle: string;
  challenges: IndustryChallenge[];
  responses: IndustryResponse[];
  /** Relevant services, in display order (registry ids). */
  serviceIds: string[];
  ariaIntro: string;
  /** ARIA capabilities most relevant to this industry (registry ids). */
  capabilityIds: string[];
  steps: IndustryStep[];
  human: string[];
  /** A boundary statement where the industry invites overclaiming. */
  boundary?: string;
}

const HUMAN_DECISIONS = [
  "Scope: what is in and out of each engagement",
  "Risk acceptance: which findings you fix, defer or accept",
  "Change authorization: a named person in your organisation approves every change",
  "Approval of automated fixes, which stay off until you enable them",
  "Final operational decisions about your production systems",
];

export const INDUSTRIES: Record<IndustryId, Industry> = {
  saas: {
    id: "saas",
    slug: "saas",
    name: "SaaS",
    navDescription: "Multi-tenant and customer-facing cloud platforms",
    summary:
      "For SaaS companies running customer-facing, multi-tenant cloud platforms. Close findings, prove fixes and keep controls in place between releases and customer security reviews.",
    eyebrow: "Industries · SaaS",
    title: "Cloud security engineering for SaaS teams",
    intro: `Customer-facing, multi-tenant cloud platforms change every release. We find the cloud controls that fail, fix them with your engineers, verify every fix and help keep them fixed, with ${PRODUCT_DISPLAY_NAME} making the repeatable parts consistent.`,
    primaryServiceId: "cloud-security-assessment",
    challengesTitle: "The security problems SaaS teams actually face",
    challenges: [
      {
        title: "Misconfiguration and control drift",
        body: "Frequent releases and infrastructure changes quietly undo controls that were fixed last quarter.",
      },
      {
        title: "Identity and access sprawl",
        body: "Engineers, services, pipelines and third-party integrations all need access, and permissions accumulate.",
      },
      {
        title: "Findings that stay open",
        body: "Reviews and scanners produce findings faster than a product team can close them.",
      },
      {
        title: "Fixes without proof",
        body: "A change gets made, but nobody re-runs the check that found the problem.",
      },
      {
        title: "Security competing with the roadmap",
        body: "Security work happens in bursts between product priorities, so gaps reopen.",
      },
      {
        title: "Customer security reviews",
        body: "Enterprise customers ask how controls are kept in place, not only whether they exist.",
      },
    ],
    responses: [
      {
        challenge: "Findings that stay open",
        response: "An assessment that prioritises what to fix first, then hands-on remediation with your engineers.",
        serviceIds: ["cloud-security-assessment", "remediation-hardening"],
        capabilityIds: ["customer-applied-fixes"],
      },
      {
        challenge: "Fixes without proof",
        response: "Every fix is re-checked by the same check that found the problem; only a passing check counts.",
        serviceIds: ["remediation-hardening"],
        capabilityIds: ["verification"],
      },
      {
        challenge: "Misconfiguration and control drift",
        response: "Recurring review and scheduled re-checks that flag a control that passed and now fails.",
        serviceIds: ["security-retainer"],
        capabilityIds: ["scheduled-rechecks"],
      },
      {
        challenge: "Security competing with the roadmap",
        response: "Security built into pipelines and infrastructure code, so fewer issues reach production.",
        serviceIds: ["devsecops"],
        capabilityIds: [],
      },
      {
        challenge: "Customer security reviews",
        response: "Technical controls implemented and evidenced, with signed, linked records of checks and fixes.",
        serviceIds: ["certification-readiness"],
        capabilityIds: ["signed-records", "closure-record"],
      },
    ],
    serviceIds: [
      "cloud-security-assessment",
      "remediation-hardening",
      "security-retainer",
      "devsecops",
      "certification-readiness",
      "secure-cloud-engineering",
      "penetration-testing",
      "kubernetes-security",
    ],
    ariaIntro: `${PRODUCT_DISPLAY_NAME} gives a SaaS team one consistent loop for cloud controls: evaluate them, fix what fails with approval, verify the fix, re-check on a schedule and keep the record.`,
    capabilityIds: [
      "evaluation-aws",
      "evaluation-azure",
      "customer-applied-fixes",
      "verification",
      "scheduled-rechecks",
      "signed-records",
      "closure-record",
      "client-access",
    ],
    steps: [
      {
        title: "Assessment",
        body: "Review your cloud controls from read-only access and agree what matters most.",
        serviceId: "cloud-security-assessment",
      },
      {
        title: "Prioritised remediation",
        body: "Fix the highest-risk issues first, with your engineers and your approval.",
        serviceId: "remediation-hardening",
        capabilityId: "customer-applied-fixes",
      },
      {
        title: "Verification",
        body: "Re-run the same check on the same resource to confirm each fix.",
        capabilityId: "verification",
      },
      {
        title: "Ongoing re-checks, where supported",
        body: "A retainer keeps review and re-checks going between releases.",
        serviceId: "security-retainer",
        capabilityId: "scheduled-rechecks",
      },
    ],
    human: HUMAN_DECISIONS,
  },
  fintech: {
    id: "fintech",
    slug: "fintech",
    name: "Fintech",
    navDescription: "Cloud environments running financial workloads",
    summary:
      "For fintech teams running financial workloads in the cloud. Tighten identity and configuration, make every change accountable and keep evidence of what was checked and fixed.",
    eyebrow: "Industries · Fintech",
    title: "Cloud security engineering for fintech",
    intro: `Financial workloads raise the cost of a weak cloud control and the scrutiny on how it was fixed. We assess, fix and verify cloud controls with your engineers, with ${PRODUCT_DISPLAY_NAME} keeping a signed, linked record of what was checked, approved and changed.`,
    primaryServiceId: "cloud-security-assessment",
    challengesTitle: "Where fintech cloud security gets hard",
    challenges: [
      {
        title: "Identity and privileged access",
        body: "Administrator roles, break-glass accounts and service identities need tight, reviewable control.",
      },
      {
        title: "Cloud configuration risk",
        body: "Exposed storage, open network paths, and missing encryption or logging on systems that handle financial data.",
      },
      {
        title: "Control drift in production",
        body: "A control that passed at the last review can fail after the next deployment.",
      },
      {
        title: "Remediation accountability",
        body: "Who approved a change, what exactly changed and whether it worked must be answerable later.",
      },
      {
        title: "Evidence on request",
        body: "Partners, auditors and customers ask for evidence of controls, and rebuilding it by hand is slow.",
      },
      {
        title: "Discipline around production changes",
        body: "Security changes to production systems need planning, a rollback path and explicit approval.",
      },
    ],
    responses: [
      {
        challenge: "Identity and privileged access",
        response: "Identity and access controls assessed and tightened, with each change planned and approved.",
        serviceIds: ["cloud-security-assessment", "remediation-hardening"],
        capabilityIds: [],
      },
      {
        challenge: "Remediation accountability",
        response: "Every change needs a named, time-limited approval, and the request, approval and result are recorded.",
        serviceIds: ["remediation-hardening"],
        capabilityIds: ["approval-model", "closure-record"],
      },
      {
        challenge: "Control drift in production",
        response: "Recurring review and scheduled re-checks that flag drift, then a verified fix.",
        serviceIds: ["security-retainer"],
        capabilityIds: ["scheduled-rechecks", "verification"],
      },
      {
        challenge: "Evidence on request",
        response: "Technical controls implemented and evidenced, backed by signed, linked records.",
        serviceIds: ["certification-readiness"],
        capabilityIds: ["signed-records"],
      },
      {
        challenge: "Discipline around production changes",
        response: "Secure architecture and tested recovery paths, so changes and failures are planned for.",
        serviceIds: ["secure-cloud-engineering", "resilience"],
        capabilityIds: [],
      },
    ],
    serviceIds: [
      "cloud-security-assessment",
      "remediation-hardening",
      "security-retainer",
      "certification-readiness",
      "secure-cloud-engineering",
      "resilience",
      "devsecops",
      "penetration-testing",
      "pci-support",
    ],
    ariaIntro: `${PRODUCT_DISPLAY_NAME} brings approval, verification and a record to every cloud control change: a named person approves each fix, the same check confirms it, and each step is kept as a signed, linked record.`,
    capabilityIds: [
      "evaluation-aws",
      "evaluation-azure",
      "approval-model",
      "fixes-azure",
      "fixes-aws",
      "verification",
      "scheduled-rechecks",
      "signed-records",
      "closure-record",
    ],
    steps: [
      {
        title: "Assessment",
        body: "Review identity, network, logging, storage and encryption controls from read-only access.",
        serviceId: "cloud-security-assessment",
      },
      {
        title: "Prioritised remediation",
        body: "Plan each change with a rollback path, and apply it only with your approval.",
        serviceId: "remediation-hardening",
        capabilityId: "approval-model",
      },
      {
        title: "Verification",
        body: "Re-run the same check to confirm each fix, and keep the record.",
        capabilityId: "verification",
      },
      {
        title: "Ongoing re-checks, where supported",
        body: "A retainer keeps review, re-checks and drift fixes going.",
        serviceId: "security-retainer",
        capabilityId: "scheduled-rechecks",
      },
    ],
    human: HUMAN_DECISIONS,
    boundary:
      "We implement and evidence technical controls. Certifications and regulatory approvals are decided by independent auditors and regulators; Tricognita does not issue them and is not an accredited assessor.",
  },
};

/** The Industries hub. */
export const INDUSTRIES_HREF = "/industries";

export function industryHref(i: Industry): string {
  return `/industries/${i.slug}`;
}
