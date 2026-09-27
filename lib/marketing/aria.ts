/**
 * How the marketing site presents ARIA outside /product: as one product with
 * one product-level state, not as a list of capability states.
 *
 * Presentation only. Nothing here declares a state: the product-level state is
 * derived from the capability registry (capabilities.ts) with the same rule
 * /about and /pricing use, so it can only become Available once a capability
 * has passed its gates there. The detailed, per-capability states stay on
 * /product, the canonical place for them.
 */
import {
  PRODUCT_CAPABILITIES,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  renderedState,
  type PublicState,
} from "./capabilities";
import { SERVICE_DETAILS } from "./services";

/** ARIA's overall public state: Available only once one of its public capabilities is. */
export function ariaProductState(): PublicState {
  return publicCapabilities(PRODUCT_CAPABILITIES).some((c) => renderedState(c) === "available") ? "available" : "launching";
}

/** True while ARIA as a whole is still launching. */
export function ariaInDevelopment(): boolean {
  return ariaProductState() !== "available";
}

/** Shown beside the state badge while the product is launching. */
export const ARIA_DEVELOPMENT_LABEL = "In development";

/** One-paragraph product status, for any page that is not /product. */
export function ariaStatusNote(): string {
  return ariaInDevelopment()
    ? `${PRODUCT_DISPLAY_NAME} is being developed as Tricognita's ${PRODUCT_DESCRIPTOR.toLowerCase()} product. Its final capabilities will be introduced as they are validated and launched.`
    : `${PRODUCT_DISPLAY_NAME} is Tricognita's product for ${PRODUCT_DESCRIPTOR.toLowerCase()}. The product page shows what each capability covers.`;
}

/**
 * Whether ARIA takes part in a service's workflow. Read from the service's
 * existing ARIA relationship (SERVICE_DETAILS[id].aria); never forced.
 */
export function ariaSupportsService(serviceId: string): boolean {
  return (SERVICE_DETAILS[serviceId]?.aria.length ?? 0) > 0;
}

/** The relationship line on a service ARIA supports. */
export function ariaWorkflowLine(): string {
  return ariaInDevelopment()
    ? `${PRODUCT_DISPLAY_NAME} is being developed to support repeatable cloud-control remediation and verification within this workflow.`
    : `${PRODUCT_DISPLAY_NAME} supports repeatable cloud-control remediation and verification within this workflow.`;
}

/** The relationship line on a service ARIA is not part of. */
export const ARIA_NOT_IN_WORKFLOW = `Engineering-led work; ${PRODUCT_DISPLAY_NAME} is not part of this workflow.`;
