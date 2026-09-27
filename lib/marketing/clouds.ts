/**
 * Cloud pages: /cloud and /cloud/<slug> (Website Rebuild Plan Rev B.1 §19 and
 * Rev A §22.4). States are never written here: a service's state on a cloud
 * and an ARIA capability's state on a cloud are derived from the registry in
 * lib/marketing/capabilities.ts, so a cloud can never look more ready than
 * the registry allows.
 */
import {
  capabilityById,
  CLOUDS,
  PRODUCT_CAPABILITIES,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  renderedState,
  SERVICES,
  type Capability,
  type CloudEntry,
  type CloudId,
  type PublicState,
} from "./capabilities";

const RANK: Record<PublicState, number> = { deferred: 0, planned: 1, launching: 2, available: 3 };

/** The less ready of two states. */
export function weaker(a: PublicState, b: PublicState): PublicState {
  return RANK[a] <= RANK[b] ? a : b;
}

export function cloudById(id: CloudId): CloudEntry {
  const c = CLOUDS.find((x) => x.id === id);
  if (!c) throw new Error(`cloud ${id} is missing from the registry`);
  return c;
}

export function cloudHref(cloud: CloudEntry): string {
  return `/cloud/${cloud.slug}`;
}

/**
 * A service's state on one cloud: null if the service does not cover that
 * cloud, otherwise the weaker of the service's state and the cloud's.
 */
export function serviceStateOnCloud(service: Capability, cloud: CloudEntry): PublicState | null {
  if (!service.clouds?.includes(cloud.id)) return null;
  const state = weaker(renderedState(service), cloud.servicesState);
  return state === "deferred" ? null : state;
}

/** Public services that cover a cloud, with their state there. */
export function servicesOnCloud(cloud: CloudEntry): { service: Capability; state: PublicState }[] {
  return publicCapabilities(SERVICES).flatMap((service) => {
    const state = serviceStateOnCloud(service, cloud);
    return state ? [{ service, state }] : [];
  });
}

const CLOUD_WORDS: Record<CloudId, RegExp> = { aws: /\bAWS\b|\bEKS\b/, azure: /\bAzure\b|\bAKS\b/, gcp: /Google Cloud|\bGCP\b|\bGKE\b/ };

/**
 * Whether a summary written in the registry reads correctly on a cloud's page:
 * one that names other clouds but not this one ("your AWS or Azure
 * environment" on the Google Cloud page) is not shown there.
 */
export function summaryFitsCloud(text: string, cloud: CloudEntry): boolean {
  const named = (Object.keys(CLOUD_WORDS) as CloudId[]).filter((id) => CLOUD_WORDS[id].test(text));
  return named.length === 0 || named.includes(cloud.id);
}

/** Public services not tied to any cloud (e.g. application testing). */
export function cloudIndependentServices(): Capability[] {
  return publicCapabilities(SERVICES).filter((s) => !s.clouds);
}

/**
 * An ARIA capability's state on one cloud. Cloud-specific capabilities apply
 * only to their clouds. Cloud-agnostic ones (verification, records…) can
 * never be more ready on a cloud than ARIA's evaluation there.
 */
export function productStateOnCloud(cap: Capability, cloud: CloudEntry): PublicState | null {
  if (cap.visibility === "never") return null;
  if (cap.clouds) return cap.clouds.includes(cloud.id) ? renderedState(cap) : null;
  const evaluation = capabilityById(cloud.platformCapabilityId);
  if (!evaluation) return null;
  const state = weaker(renderedState(cap), renderedState(evaluation));
  return state === "deferred" ? null : state;
}

/** Public ARIA capabilities that apply to a cloud, with their state there. */
export function productOnCloud(cloud: CloudEntry): { capability: Capability; state: PublicState }[] {
  return publicCapabilities(PRODUCT_CAPABILITIES).flatMap((capability) => {
    const state = productStateOnCloud(capability, cloud);
    return state ? [{ capability, state }] : [];
  });
}

/** Per-cloud page copy. Everything here must hold whatever the states are. */
export interface CloudCopy {
  eyebrow: string;
  title: string;
  intro: string;
  /** One line for the /cloud overview card. */
  servicesLine: string;
  productLine: string;
  /** Access model, stated without claims the onboarding cannot back. */
  access: string[];
  /** What is being expanded (clouds still launching). */
  expansion?: string[];
}

export const CLOUD_COPY: Record<CloudId, CloudCopy> = {
  aws: {
    eyebrow: "Cloud · AWS",
    title: "AWS Cloud Security",
    intro:
      `Security engineering for AWS accounts: we assess your controls, fix what fails with your team and verify every fix, with ${PRODUCT_DISPLAY_NAME} making the repeatable parts consistent.`,
    servicesLine: "Assessment, remediation, retainers and engineering for AWS accounts.",
    productLine: "Control evaluation, approved bounded fixes where supported, verification and records.",
    access: [
      "Assessment uses a read-only IAM role you create in your own account and can remove at any time.",
      "We work toward the narrowest permissions each task needs.",
      "Changes need a separate, narrow permission that you grant explicitly.",
      "A named person in your organisation authorizes every change.",
    ],
  },
  azure: {
    eyebrow: "Cloud · Microsoft Azure",
    title: "Microsoft Azure Security",
    intro:
      `Security engineering for Azure subscriptions: we assess your controls, fix what fails with your team and verify every fix, with ${PRODUCT_DISPLAY_NAME} making the repeatable parts consistent.`,
    servicesLine: "Assessment, remediation, retainers and engineering for Azure subscriptions.",
    productLine: "Control evaluation, bounded fixes for individually validated actions, verification and records.",
    access: [
      "Assessment uses a service principal with the built-in Reader role, on the subscriptions you choose.",
      "Write access is needed only for automated fixes, and only where you enable them and grant it explicitly.",
      "A named person in your organisation authorizes every change.",
      "You can remove access at any time.",
    ],
  },
  gcp: {
    eyebrow: "Cloud · Google Cloud",
    title: "Google Cloud Security",
    intro:
      `Tricognita is expanding its cloud security services and ${PRODUCT_DISPLAY_NAME} to Google Cloud, with the same approach we use on AWS and Azure: test, fix, verify and keep secure.`,
    servicesLine: "Assessment, remediation and retainers are being extended to Google Cloud.",
    productLine: "Evaluation of the same controls first, then the same approval, verification and evidence model.",
    access: [
      "Access through a least-privilege service account you create and control.",
      "Read-only access for evaluation; nothing changes without your authorization.",
      "The access model is validated on Google Cloud before any capability there is offered.",
    ],
    expansion: [
      "Evaluation of the same control catalogue on Google Cloud projects",
      "Least-privilege onboarding with a service account",
      "Approved remediation where supported, followed by verification",
      "Signed, linked records and closure records, as on AWS and Azure",
      "Assessment, remediation and retainer services for Google Cloud",
    ],
  },
};

/** ARIA's common model on every cloud (maturity differs by cloud). */
export const ARIA_MODEL = [
  { step: "Evaluate", body: "Check each control on each resource from read-only access." },
  { step: "Fix", body: "Approved, bounded remediation where the cloud's fix capability supports it." },
  { step: "Verify", body: "Re-run the same check; only a passing check counts." },
  { step: "Keep secure", body: "Re-check on a schedule and flag drift." },
  { step: "Evidence", body: "Signed, linked records and a closure record." },
];
