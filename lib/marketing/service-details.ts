/**
 * Service detail pages: /services/<id> (Website Rebuild Plan Rev B.1 §17;
 * template Rev A §18).
 *
 * Only the fields a detail page needs that lib/marketing/services.ts does not
 * already hold. Names, summaries, states, prices and calls to action come from
 * the registry (capabilities.ts) and services.ts; audience, triggers, scope,
 * work, deliverables and the ARIA relationship come from SERVICE_DETAILS.
 *
 * Content rules: what a customer provides and the boundaries are stated only
 * where the approved sources support them (claims register R2/C7/C9, the
 * registry summaries and SERVICE_DETAILS). No timelines, tools, methodologies,
 * credentials or outcomes are promised.
 */
import type { Metadata } from "next";
import { capabilityById, PRODUCT_DISPLAY_NAME } from "./capabilities";

/** The nine services with detail pages (Rev B.1 §17). The id is the URL slug. */
export const SERVICE_PAGE_IDS = [
  "cloud-security-assessment",
  "penetration-testing",
  "remediation-hardening",
  "security-retainer",
  "devsecops",
  "certification-readiness",
  "secure-cloud-engineering",
  "resilience",
  "kubernetes-security",
] as const;

export type ServicePageId = (typeof SERVICE_PAGE_IDS)[number];

export interface ServicePageContent {
  /** What we need from you. */
  needs: string[];
  /** What the service does not include. */
  boundaries: string[];
  /** Related services (registry ids that also have detail pages). */
  related: ServicePageId[];
}

export const SERVICE_PAGES: Record<ServicePageId, ServicePageContent> = {
  "cloud-security-assessment": {
    needs: [
      "Read-only access to the cloud accounts or subscriptions in scope, in roles you create",
      "Context on your environment and what your customers or auditors are asking for",
      "A contact who can answer questions about the environment",
    ],
    boundaries: [
      "An assessment establishes what fails and what to fix first. Fixing is a separate, scoped step.",
      "Findings describe control results, not a compliance verdict.",
    ],
    related: ["remediation-hardening", "security-retainer", "certification-readiness"],
  },
  "penetration-testing": {
    needs: [
      "Written authorisation for the test",
      "The applications, APIs or external addresses in scope",
      "A contact who can be reached while testing runs",
    ],
    boundaries: [
      "Testing stays inside the written scope and rules of engagement you approve. Nothing outside them is tested.",
      `${PRODUCT_DISPLAY_NAME} does not test applications.`,
    ],
    related: ["cloud-security-assessment", "remediation-hardening"],
  },
  "remediation-hardening": {
    needs: [
      "The findings to work from, from our assessment or another source",
      "A named person in your organisation who approves each change",
      "Permission to make changes, only where agreed and granted by you",
      "Engineers to work with where the change is theirs to make",
    ],
    boundaries: [
      "Nothing changes without approval from a named person in your organisation.",
      "Not every control has an automated fix. Complex and sensitive changes are planned and led by engineers.",
    ],
    related: ["cloud-security-assessment", "security-retainer", "secure-cloud-engineering"],
  },
  "security-retainer": {
    needs: [
      "Ongoing read-only access to the environments in scope",
      "A regular point of contact",
      "Named approvers for any change",
    ],
    boundaries: [
      "Scope and cadence are agreed in writing.",
      "It is not an around-the-clock monitoring or incident-response service.",
    ],
    related: ["remediation-hardening", "cloud-security-assessment"],
  },
  devsecops: {
    needs: [
      "Access to the pipelines and infrastructure code in scope",
      "The engineers who own those pipelines",
    ],
    boundaries: [
      "This is engineering work in your own pipelines and code, not a Tricognita tool.",
      `It is not an ${PRODUCT_DISPLAY_NAME} workflow.`,
    ],
    related: ["secure-cloud-engineering", "remediation-hardening"],
  },
  "certification-readiness": {
    needs: [
      "The scope your compliance consultant or auditor has agreed",
      "Read-only access to the environments in scope",
      "Owners for the controls to be implemented",
    ],
    boundaries: [
      "Tricognita does not issue certifications or provide accreditation. Certification is issued by independent auditors.",
      "This covers technical controls and their evidence. Your compliance programme stays with your compliance consultant.",
    ],
    related: ["cloud-security-assessment", "remediation-hardening"],
  },
  "secure-cloud-engineering": {
    needs: [
      "The environment, platform or change you are planning",
      "The engineers and decision makers for design choices",
    ],
    boundaries: ["Scope is agreed per engagement."],
    related: ["devsecops", "cloud-security-assessment"],
  },
  resilience: {
    needs: [
      "Access to the backup and recovery configuration in scope",
      "A contact who owns backup and recovery",
    ],
    boundaries: [
      "A review and fixes to backup and recovery design. It does not promise specific recovery times or availability.",
    ],
    related: ["cloud-security-assessment", "remediation-hardening"],
  },
  "kubernetes-security": {
    needs: ["Access to the managed clusters in scope", "A contact who owns the clusters"],
    boundaries: [
      "Covers managed clusters on EKS and AKS. Other distributions, and Google Cloud's GKE, are not currently in scope.",
    ],
    related: ["secure-cloud-engineering", "devsecops"],
  },
};

export function servicePageHref(id: ServicePageId): string {
  return `/services/${id}`;
}

export function isServicePage(id: string): id is ServicePageId {
  return (SERVICE_PAGE_IDS as readonly string[]).includes(id);
}

/** Metadata for a service detail page, from the registry. */
export function serviceMetadata(id: ServicePageId): Metadata {
  const s = capabilityById(id);
  if (!s) throw new Error(`service ${id} is missing from the registry`);
  return {
    title: s.name,
    description: `${s.summary} What it covers, what you receive and how to start with Tricognita.`,
    alternates: { canonical: servicePageHref(id) },
  };
}
