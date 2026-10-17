/**
 * Contact and lead intake (the /contact page and its form).
 *
 * The public sales intent is a scoping call. Everything here is pure so it can
 * be unit-tested and shared by the server page and the client form:
 * - the canonical intents and the URL builder every CTA uses;
 * - safe parsing of the public query parameters (intent, service, cloud,
 *   source): values are validated against the registries and anything else is
 *   ignored. Query parameters only prefill the form; they never authorise
 *   anything and are never trusted by the server;
 * - service and cloud options, derived from lib/marketing/capabilities.ts;
 * - the payload for the existing /api/leads endpoint (no backend change).
 */
import {
  CLOUDS,
  PRODUCT_DISPLAY_NAME,
  publicCapabilities,
  renderedState,
  SERVICES,
  STATE_LABEL,
  type CloudId,
  type PublicState,
} from "./capabilities";
import { serviceStateOnCloud } from "./clouds";

export const CONTACT_PATH = "/contact";

/** Canonical contact intents. `scoping` is the primary sales intent. */
export type ContactIntent = "scoping" | "interest" | "security" | "general";

export const CONTACT_INTENTS: { value: ContactIntent; label: string }[] = [
  { value: "scoping", label: "Book a scoping call" },
  { value: "interest", label: "Register interest in a launching service" },
  { value: "security", label: "A security question" },
  { value: "general", label: "Something else" },
];

/**
 * Old intent values still found in bookmarks and earlier links. They are
 * accepted so those links keep working, and always resolve to the scoping
 * intent. They are never generated.
 */
const LEGACY_INTENT_ALIASES: Record<string, ContactIntent> = { demo: "scoping", quote: "scoping" };

/** What the enquiry is about. */
export type ContactTopic = "services" | "product" | "both";

export const CONTACT_TOPICS: { value: ContactTopic; label: string }[] = [
  { value: "services", label: "Security services" },
  { value: "product", label: PRODUCT_DISPLAY_NAME },
  { value: "both", label: `Both services and ${PRODUCT_DISPLAY_NAME}` },
];

/**
 * Where a visitor came from, when a page says so with ?source=. A closed list:
 * anything else is ignored. The server also records the referring URL itself.
 */
export const CONTACT_SOURCES = ["home", "product", "services", "pricing", "cloud", "industries", "about"] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

/** The cloud field: the registry's clouds plus two non-cloud answers. */
export type ContactCloud = CloudId | "multi" | "unknown";

export interface ContactPrefill {
  intent: ContactIntent;
  topic?: ContactTopic;
  serviceId?: string;
  cloud?: ContactCloud;
  source?: ContactSource;
}

/** Build a /contact URL. Every marketing CTA that opens the form uses this. */
export function contactHref(opts: {
  intent: ContactIntent;
  service?: string;
  cloud?: CloudId;
  source?: ContactSource;
}): string {
  const q = new URLSearchParams({ intent: opts.intent });
  if (opts.service) q.set("service", opts.service);
  if (opts.cloud) q.set("cloud", opts.cloud);
  if (opts.source) q.set("source", opts.source);
  return `${CONTACT_PATH}?${q.toString()}`;
}

/** Services a visitor can pick: only those that are Available or Launching. */
export function contactServiceOptions(): { id: string; name: string; state: PublicState; stateLabel: string }[] {
  return publicCapabilities(SERVICES).flatMap((s) => {
    const state = renderedState(s);
    if (state !== "available" && state !== "launching") return [];
    return [{ id: s.id, name: s.name, state, stateLabel: STATE_LABEL[state] }];
  });
}

/** Cloud options from the registry, plus "more than one" and "not sure". */
export function contactCloudOptions(): { value: ContactCloud; label: string; servicesState?: PublicState }[] {
  return [
    ...CLOUDS.map((c) => ({ value: c.id as ContactCloud, label: c.name, servicesState: c.servicesState })),
    { value: "multi", label: "More than one" },
    { value: "unknown", label: "Other or not sure" },
  ];
}

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  // Public parameters are short slugs; anything else is not ours.
  return t.length > 0 && t.length <= 64 && /^[a-z0-9-]+$/.test(t) ? t : undefined;
}

/**
 * A service's state for this enquiry: on a named cloud it is the service's
 * state on that cloud (the same rule the cloud pages use), and a service that
 * does not cover the cloud is not bookable there. Without a named cloud it is
 * the service's own state.
 */
export function serviceStateFor(serviceId: string, cloud?: ContactCloud): PublicState | undefined {
  const option = contactServiceOptions().find((o) => o.id === serviceId);
  if (!option) return undefined;
  const entry = CLOUDS.find((c) => c.id === cloud);
  const service = SERVICES.find((s) => s.id === serviceId);
  if (!entry || !service?.clouds) return option.state;
  return serviceStateOnCloud(service, entry) ?? "launching";
}

/**
 * The intent the chosen service allows: bookable (Available) → a scoping call;
 * otherwise → a registration of interest. Security and general questions stay
 * as chosen.
 */
export function effectiveIntent(intent: ContactIntent, serviceId?: string, cloud?: ContactCloud): ContactIntent {
  if (intent === "security" || intent === "general" || !serviceId) return intent;
  const state = serviceStateFor(serviceId, cloud);
  if (!state) return intent;
  return state === "available" ? "scoping" : "interest";
}

/** Parse /contact query parameters safely. Unknown or malformed values are dropped. */
export function parseContactParams(params: Record<string, string | string[] | undefined>): ContactPrefill {
  const rawIntent = first(params.intent);
  let intent: ContactIntent =
    (rawIntent && (CONTACT_INTENTS.find((i) => i.value === rawIntent)?.value ?? LEGACY_INTENT_ALIASES[rawIntent])) ||
    "scoping";

  const rawService = first(params.service);
  const serviceId = contactServiceOptions().some((o) => o.id === rawService) ? rawService : undefined;

  const rawCloud = first(params.cloud);
  const cloudEntry = CLOUDS.find((c) => c.id === rawCloud || c.slug === rawCloud);
  const cloud: ContactCloud | undefined = cloudEntry ? cloudEntry.id : undefined;

  const rawSource = first(params.source);
  const source = (CONTACT_SOURCES as readonly string[]).includes(rawSource ?? "") ? (rawSource as ContactSource) : undefined;

  intent = effectiveIntent(intent, serviceId, cloud);
  const topic: ContactTopic | undefined = source === "product" ? "product" : serviceId ? "services" : undefined;

  return { intent, topic, serviceId, cloud, source };
}

/**
 * The /api/leads body for a submission. A bookable request is stored as the
 * canonical `scoping_call` kind (lib/lead-kinds.ts); everything else, including
 * registrations of interest, as `contact`. The intent is also written into
 * use_case for the inbox.
 */
export function leadPayload(f: {
  intent: ContactIntent;
  topic?: ContactTopic;
  serviceId?: string;
  cloud?: ContactCloud;
  source?: ContactSource;
  name: string;
  email: string;
  organisation: string;
  role: string;
  accounts?: string;
  driver?: string;
  message?: string;
}) {
  const intent = effectiveIntent(f.intent, f.serviceId, f.cloud);
  const intentLabel = CONTACT_INTENTS.find((i) => i.value === intent)?.label ?? intent;
  const service = contactServiceOptions().find((o) => o.id === f.serviceId);
  const cloud = contactCloudOptions().find((c) => c.value === f.cloud);
  const topic = CONTACT_TOPICS.find((t) => t.value === f.topic);
  const use_case = [
    `Intent: ${intentLabel}`,
    topic && `About: ${topic.label}`,
    service && `Service: ${service.name} (${STATE_LABEL[serviceStateFor(service.id, f.cloud) === "available" ? "available" : "launching"]})`,
    cloud && `Cloud: ${cloud.label}`,
    f.role && `Role: ${f.role}`,
    f.accounts && `Accounts: ${f.accounts}`,
    f.driver && `Driver: ${f.driver}`,
    f.source && `Source: ${f.source}`,
    f.message && `Notes: ${f.message}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    kind: intent === "scoping" ? ("scoping_call" as const) : ("contact" as const),
    name: f.name,
    email: f.email,
    company: f.organisation,
    role: f.role,
    use_case,
    context: { primary_cloud: f.cloud, team_size: f.accounts },
  };
}
