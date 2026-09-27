/**
 * /faq content (Website Rebuild Plan Rev B.1; page brief MARKETING_PAGE_BRIEFS
 * "FAQ"). Every answer is built from the approved sources, so the FAQ can never
 * disagree with the rest of the site or become a second state registry:
 * - names, states, clouds and prices: capabilities.ts, clouds.ts, services.ts;
 * - access, approval, verification and evidence wording: security.ts (each
 *   claim tied to the claims register) and company.ts;
 * - the engagement flow: method.ts.
 *
 * Deliberately not included: competitor comparisons (the page brief gates them
 * on legal review, and no approval is recorded); response times, free trials,
 * hosting locations and certifications Tricognita does not hold.
 */
import {
  capabilityById,
  CLOUDS,
  PRODUCT_CAPABILITIES,
  PRODUCT_DESCRIPTOR,
  PRODUCT_DISPLAY_NAME,
  PRODUCT_PRICING,
  publicCapabilities,
  renderedState,
  SERVICES,
  STATE_LABEL,
  type Capability,
  type PublicState,
} from "./capabilities";
import { ARIA_MODEL, cloudById, cloudHref, servicesOnCloud } from "./clouds";
import { DATA_HANDLING, MARKETS } from "./company";
import { INDUSTRIES } from "./industries";
import { ENGAGEMENT_FLOW } from "./method";
import { CERTIFICATION_STATEMENT, CUSTOMER_CONTROL, EVIDENCE_CLAIMS, REMEDIATION_RULES, type SecurityClaim } from "./security";
import { SERVICE_PAGES, isServicePage, servicePageHref } from "./service-details";
import { FIXED_AFTER_SCOPING, SERVICE_DETAILS, serviceGroup, servicePriceLabel } from "./services";
import { HOW_WE_WORK_HREF, PLATFORM_HREF, SERVICES_HREF } from "./site";

export interface FaqLink {
  href: string;
  label: string;
}

export interface FaqEntry {
  q: string;
  /** Plain-text answer (also used for FAQPage structured data). */
  a: string;
  links?: FaqLink[];
}

export interface FaqSection {
  id: string;
  title: string;
  items: FaqEntry[];
}

/* ── Helpers (all registry-derived) ─────────────────────────────────────── */

const label = (s: PublicState) => (s === "deferred" ? "" : STATE_LABEL[s]).toLowerCase();

function cap(id: string): Capability {
  const c = capabilityById(id);
  if (!c) throw new Error(`capability ${id} is missing from the registry`);
  return c;
}

function claim(list: readonly SecurityClaim[], source: string): string {
  const c = list.find((x) => x.source === source);
  if (!c) throw new Error(`claim ${source} is missing from security.ts`);
  return c.text;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "Covers X." → "It covers X." (boundary text used inside a sentence). */
function sentenceWithIt(text: string): string {
  return /^Covers\b/.test(text) ? `It covers${text.slice("Covers".length)}` : text;
}

function servicesIn(state: PublicState): Capability[] {
  return publicCapabilities(SERVICES).filter((s) => renderedState(s) === state);
}

/** The product's overall public state: Available only once one capability is. */
function productState(): PublicState {
  return publicCapabilities(PRODUCT_CAPABILITIES).some((c) => renderedState(c) === "available") ? "available" : "launching";
}

function serviceLink(id: string): FaqLink {
  return { href: isServicePage(id) ? servicePageHref(id) : SERVICES_HREF, label: cap(id).name };
}

/* ── The FAQ ────────────────────────────────────────────────────────────── */

export function buildFaq(): FaqSection[] {
  const aria = PRODUCT_DISPLAY_NAME;
  const gcp = cloudById("gcp");
  const gcpServices = servicesOnCloud(gcp);
  const gcpEvaluation = cap(gcp.platformCapabilityId);
  const launching = servicesIn("launching");
  const planned = servicesIn("planned");
  const byGroup = (g: string) => publicCapabilities(SERVICES).filter((s) => serviceGroup(s) === g && renderedState(s) !== "planned");
  const kubernetes = cap("kubernetes-security");
  const azureFixes = cap("fixes-azure");
  const awsFixes = cap("fixes-aws");
  const rechecks = cap("scheduled-rechecks");
  const closure = cap("closure-record");
  const readiness = cap("certification-readiness");
  const pci = capabilityById("pci-support");

  return [
    {
      id: "tricognita",
      title: "Tricognita",
      items: [
        {
          q: "What does Tricognita do?",
          a: `Tricognita is a cloud security engineering company. We test, fix and verify cloud security with your team through security engineering services, and ${aria}, our product for ${PRODUCT_DESCRIPTOR.toLowerCase()}, makes the repeatable parts consistent.`,
          links: [
            { href: SERVICES_HREF, label: "Services" },
            { href: PLATFORM_HREF, label: aria },
          ],
        },
        {
          q: "Do you provide services, software, or both?",
          a: `Both. Services are engineering work done by people: assessment, testing, remediation, readiness and engineering. ${aria} is software that evaluates cloud controls, applies approved, bounded fixes where supported, verifies them and keeps a record. Every available service can be bought on its own, and you do not need services to use ${aria}.`,
          links: [{ href: HOW_WE_WORK_HREF, label: "How we work" }],
        },
        {
          q: "Who do you work with?",
          a: `Teams running cloud environments, with industry pages for ${joinNames(Object.values(INDUSTRIES).map((i) => i.name))} teams. We work with companies in ${joinNames(MARKETS.map((m) => (m.id === "uae" ? `the ${m.name}` : m.name)))}.`,
          links: [{ href: "/industries", label: "Industries" }],
        },
      ],
    },
    {
      id: "aria",
      title: aria,
      items: [
        {
          q: `What is ${aria}?`,
          a: `${aria} is Tricognita's product for ${PRODUCT_DESCRIPTOR.toLowerCase()}. It follows one model: ${ARIA_MODEL.map((m) => m.step).join(" → ")}. ${aria} is currently ${label(productState())}; each capability shows its current state on the product page.`,
          links: [{ href: `${PLATFORM_HREF}#availability`, label: "What is available" }],
        },
        {
          q: `Does ${aria} replace security engineers?`,
          a: `No. ${aria} handles repeatable cloud-control work: checking controls, applying approved, bounded fixes where supported, re-checking and keeping records. Scope, priorities, risk decisions and the approval of every change stay with people.`,
          links: [{ href: HOW_WE_WORK_HREF, label: "What people decide" }],
        },
        {
          q: `Does ${aria} make changes automatically?`,
          a: `Not without your authorization. ${claim(CUSTOMER_CONTROL, "R11")} ${claim(REMEDIATION_RULES, "R2")} ${claim(REMEDIATION_RULES, "R7")}`,
        },
        {
          q: `How does ${aria} verify a fix?`,
          a: `${claim(REMEDIATION_RULES, "R5")} Only a passing check marks the control remediated. ${claim(REMEDIATION_RULES, "R6")}`,
        },
        {
          q: `What evidence does ${aria} produce?`,
          a: `${claim(EVIDENCE_CLAIMS, "E1")} ${claim(EVIDENCE_CLAIMS, "E2")} ${claim(EVIDENCE_CLAIMS, "E3")} A closure record brings it together: ${closure.summary.charAt(0).toLowerCase()}${closure.summary.slice(1)}`,
          links: [{ href: `${PLATFORM_HREF}#evidence`, label: "Evidence" }],
        },
      ],
    },
    {
      id: "clouds",
      title: "Clouds",
      items: [
        {
          q: "Which clouds do you support?",
          a: `${CLOUDS.map((c) => `${c.name}: services ${label(c.servicesState)}, ${aria} ${label(renderedState(cap(c.platformCapabilityId)))}`).join(". ")}. Capabilities differ by cloud, and each cloud page shows its current state.`,
          links: [{ href: "/cloud", label: "Clouds" }],
        },
        {
          q: `What does Tricognita cover on ${gcp.name}?`,
          a: `${gcp.name} support is being expanded. The services that cover ${gcp.name} are ${joinNames(gcpServices.map((x) => x.service.name))}, currently ${joinNames([...new Set(gcpServices.map((x) => label(x.state)))])} there. ${aria} evaluation on ${gcp.name} is ${label(renderedState(gcpEvaluation))}. Other services do not cover ${gcp.name} yet.`,
          links: [{ href: cloudHref(gcp), label: gcp.name }],
        },
        {
          q: "Do you cover Kubernetes?",
          a: `${kubernetes.name} is ${label(renderedState(kubernetes))}. ${sentenceWithIt(SERVICE_PAGES["kubernetes-security"].boundaries.join(" "))}`,
          links: [serviceLink(kubernetes.id)],
        },
      ],
    },
    {
      id: "services",
      title: "Services",
      items: [
        {
          q: "What services do you offer?",
          a: `Core services: ${joinNames(byGroup("primary").map((s) => s.name))}. Supporting services: ${joinNames(byGroup("supporting").map((s) => s.name))}. Specialist services: ${joinNames(byGroup("specialist").map((s) => s.name))}. Each service shows its current state.`,
          links: [{ href: SERVICES_HREF, label: "All services" }, ...byGroup("primary").map((s) => serviceLink(s.id))],
        },
        {
          q: "Can I book a service that is launching?",
          a: `Not yet. ${joinNames(launching.map((s) => s.name))} ${launching.length === 1 ? "is" : "are"} ${label("launching")}: you can register interest, and ${launching.length === 1 ? "it is" : "they are"} priced at launch.`,
          links: launching.map((s) => serviceLink(s.id)),
        },
        ...(planned.length > 0
          ? [
              {
                q: "Are there services you do not offer yet?",
                a: `${joinNames(planned.map((s) => s.name))} ${planned.length === 1 ? "is" : "are"} ${label("planned")}: on our roadmap, and not yet offered.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "remediation",
      title: "Remediation and verification",
      items: [
        {
          q: "What does an assessment look at?",
          a: `${cap("cloud-security-assessment").name} reviews ${joinNames(SERVICE_DETAILS["cloud-security-assessment"].scope.map((x) => x.toLowerCase()))}. ${claim(EVIDENCE_CLAIMS, "A4")} ${claim(EVIDENCE_CLAIMS, "A5")}`,
          links: [serviceLink("cloud-security-assessment")],
        },
        {
          q: "What can be fixed automatically?",
          a: `${azureFixes.name} (currently ${label(renderedState(azureFixes))}): ${azureFixes.enablementWording} ${awsFixes.name} (currently ${label(renderedState(awsFixes))}): ${awsFixes.summary} Not every control has an automated fix; everything else is changed by people and verified the same way.`,
          links: [serviceLink("remediation-hardening")],
        },
        {
          q: "What happens if a fix does not work?",
          a: `${claim(REMEDIATION_RULES, "R6")} If the re-check fails, the control stays open, and the fix can be planned again.`,
        },
        {
          q: "What happens if a control breaks again later?",
          a: `${rechecks.summary} It can then be fixed and verified again the same way. This is currently ${label(renderedState(rechecks))}.`,
          links: [{ href: `${PLATFORM_HREF}#drift`, label: "Drift" }],
        },
      ],
    },
    {
      id: "pricing",
      title: "Pricing and engagement",
      items: [
        {
          q: "How are services priced?",
          a: `Each engagement is scoped to the problem, then priced in writing. ${STATE_LABEL.available} services have a ${FIXED_AFTER_SCOPING.toLowerCase()}; launching services are ${servicePriceLabel(launching[0] ?? cap("penetration-testing"))?.toLowerCase() ?? "priced at launch"}. No price list is published.`,
          links: [{ href: "/pricing", label: "Pricing" }],
        },
        {
          q: `Is ${aria} included in the Security Retainer?`,
          a: PRODUCT_PRICING.retainer,
          links: [serviceLink("security-retainer")],
        },
        {
          q: `Can I use ${aria} on its own?`,
          a: `Standalone access is ${label(PRODUCT_PRICING.standalone.state)}. ${PRODUCT_PRICING.standalone.detail}`,
          links: [{ href: "/pricing", label: "Pricing" }],
        },
        {
          q: "What does an engagement look like?",
          a: `${ENGAGEMENT_FLOW.map((f) => f.title).join(" → ")}. Timelines are agreed per engagement.`,
          links: [{ href: HOW_WE_WORK_HREF, label: "How we work" }],
        },
        {
          q: "How do I start?",
          a: "With a scoping call. We reply by email to arrange it, and you receive a written scope before any work starts.",
          links: [{ href: "/contact", label: "Contact" }],
        },
      ],
    },
    {
      id: "security",
      title: "Trust and security",
      items: [
        {
          q: "What access do you need?",
          a: `${claim(CUSTOMER_CONTROL, "C7")} ${claim(CUSTOMER_CONTROL, "C9")}`,
          links: [{ href: "/security#access", label: "Access" }],
        },
        {
          q: "Who authorizes changes?",
          a: `Your organisation. ${claim(REMEDIATION_RULES, "R2")} ${claim(REMEDIATION_RULES, "R3")}`,
          links: [{ href: "/security#remediation", label: "How changes are authorised" }],
        },
        {
          q: "What stays under my control?",
          a: `${DATA_HANDLING[1]} ${claim(CUSTOMER_CONTROL, "R11")}`,
        },
        {
          q: "Where is my data stored?",
          a: DATA_HANDLING[2],
          links: [{ href: "/security#data", label: "Data handling" }],
        },
      ],
    },
    {
      id: "certification",
      title: "Certification and readiness",
      items: [
        {
          q: "Can you certify us for ISO 27001 or SOC 2?",
          a: `No. ${SERVICE_PAGES["certification-readiness"].boundaries[0]} ${readiness.name} implements and evidences the technical controls your auditor will test, alongside your compliance consultant.`,
          links: [serviceLink(readiness.id)],
        },
        {
          q: "Does Tricognita hold a SOC 2 or ISO 27001 certification?",
          a: CERTIFICATION_STATEMENT,
          links: [{ href: "/security#publish", label: "What we publish" }],
        },
        {
          q: "Is a closure record an audit opinion?",
          a: "No. It is a record of what happened: what was checked, what changed, who approved it and what the check returned. It is not an audit opinion, an attestation or a certification.",
        },
        ...(pci
          ? [
              {
                q: "Do you support PCI DSS?",
                a: `${pci.name} is ${label(renderedState(pci))}. ${renderedState(pci) === "planned" ? "It is on our roadmap and not yet offered." : "See its current state on the services page."}`,
                links: [{ href: SERVICES_HREF, label: "Services" }],
              },
            ]
          : []),
      ],
    },
  ];
}
