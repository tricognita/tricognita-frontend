/**
 * The operating method for /how-we-work (Website Rebuild Plan Rev B.1 §27–§28:
 * "Method + approvals + trust summary").
 *
 * Copy only. Each stage names the registry services and ARIA capabilities that
 * carry it by id; their names, states and calls to action always come from
 * lib/marketing/capabilities.ts and lib/marketing/services.ts.
 */
import { PRODUCT_DISPLAY_NAME } from "./capabilities";

export type StageId = "test" | "fix" | "verify" | "keep-secure";

export interface MethodStage {
  id: StageId;
  name: string;
  /** One-line purpose of the stage. */
  purpose: string;
  /** What Tricognita's people do in this stage. */
  people: string[];
  /** Registry services that deliver this stage. */
  serviceIds: string[];
  /** What ARIA contributes, in one sentence. */
  aria: string;
  /** Registry ARIA capabilities that support this stage. */
  capabilityIds: string[];
  /** A boundary that keeps the stage honest. */
  boundary: string;
}

export const STAGES: MethodStage[] = [
  {
    id: "test",
    name: "Test",
    purpose: "Establish what is actually wrong, and what matters most.",
    people: [
      "Review your cloud controls from read-only access",
      "Test applications and APIs where a test is in scope",
      "Review pipelines and infrastructure code where it matters",
      "Explain each finding in terms of your business, and rank it",
    ],
    serviceIds: ["cloud-security-assessment", "penetration-testing", "devsecops"],
    aria: `${PRODUCT_DISPLAY_NAME} evaluates cloud controls resource by resource from read-only access, so findings are consistent and can be checked again later.`,
    capabilityIds: ["evaluation-aws", "evaluation-azure", "evaluation-gcp", "read-only-onboarding"],
    boundary: "Findings are the start of the work, not the deliverable.",
  },
  {
    id: "fix",
    name: "Fix",
    purpose: "Change what was agreed, safely, with your approval.",
    people: [
      "Plan each fix with your engineers, with its effect and a rollback path",
      "Apply remediation and hardening where it is in scope",
      "Lead complex and sensitive production changes",
      "Build security into new architecture and platforms",
    ],
    serviceIds: ["remediation-hardening", "secure-cloud-engineering", "kubernetes-security"],
    aria: `${PRODUCT_DISPLAY_NAME} applies approved, bounded fixes for supported controls, one resource at a time, and tracks the changes your engineers make. A named person in your organisation authorizes every change.`,
    capabilityIds: ["approval-model", "fixes-azure", "fixes-aws", "customer-applied-fixes"],
    boundary: "Not every control has an automated fix. Anything complex or sensitive stays with people.",
  },
  {
    id: "verify",
    name: "Verify",
    purpose: "A fix is not done because a change was made. It is done when the check passes.",
    people: [
      "Re-run the check that found the problem, on the same resource",
      "Retest findings from a penetration test after they are fixed",
      "Keep the open item open if the re-check fails, and say why",
    ],
    serviceIds: ["remediation-hardening", "penetration-testing"],
    aria: `${PRODUCT_DISPLAY_NAME} re-runs the same check, marks a control remediated only when it passes, and saves each step as a signed and linked record.`,
    capabilityIds: ["verification", "signed-records", "closure-record"],
    boundary: "Verification shows that a specific control passes after a specific change. It does not mean the whole environment is secure.",
  },
  {
    id: "keep-secure",
    name: "Keep secure",
    purpose: "Keep fixed controls fixed as your environment changes.",
    people: [
      "Review changes and new risks on a recurring cadence",
      "Fix drift and verify the fix again",
      "Stay available for security engineering questions and reviews",
    ],
    serviceIds: ["security-retainer"],
    aria: `${PRODUCT_DISPLAY_NAME} re-checks controls on a schedule, flags a control that passed and now fails, and keeps the history of each one.`,
    capabilityIds: ["scheduled-rechecks", "drift-alerts", "client-access"],
    boundary: "Re-checks run where the service and your environment support them.",
  },
];

/** How an engagement begins. */
export const START_STEPS = [
  { title: "Understand the environment", body: "Which clouds, accounts and systems are involved, and how they are run." },
  { title: "Establish scope", body: "What is in and out of the engagement, agreed in writing." },
  { title: "Identify the problem", body: "What your customers, auditors or engineers need solved." },
  { title: "Prioritise", body: "What needs attention first, and what can wait." },
];

/** Decisions that stay with people, always. */
export const PEOPLE_DECIDE = [
  "Defining the scope of the work",
  "Prioritising risk",
  "Deciding what should change",
  "Approving authorized fixes: a named person in your organisation",
  "Accepting risk that will not be fixed now",
  "Authorizing changes to production",
  "Final operational decisions about your systems",
];

/** The practical engagement flow. No timelines or prices. */
export const ENGAGEMENT_FLOW = [
  { title: "Scoping", body: "A call about your cloud and what you need." },
  { title: "Written scope", body: "What is in scope, what you receive, and a fixed-price proposal." },
  { title: "Engagement", body: "Work starts once you accept the proposal." },
  { title: "Findings and priorities", body: "What fails, why it matters, and what to fix first." },
  { title: "Approved remediation", body: "Changes your organisation authorizes, and nothing else." },
  { title: "Verification", body: "The same check, run again, and recorded." },
  { title: "Ongoing support", body: "A retainer where you want the work to continue." },
];
