/**
 * /sample-report: one synthetic security closure record (Website Rebuild Plan
 * Rev B.1 new routes; Marketing Strategy §18 "See a sample report — a labelled
 * synthetic sample").
 *
 * Everything here is fictional and is labelled so on the page. The scenario is
 * deliberately one the product really supports, so the sample never shows an
 * action the product cannot take:
 *  - control TC-DATA-02 (api/controls/catalogue.go), evaluated on Azure
 *    (controls/evaluator/azure.go);
 *  - its Azure fix, which changes one setting on one storage account
 *    (remediation/azureexec, claims register R9);
 *  - status, outcome and record words from lib/domain/status.ts, the words
 *    the product itself shows.
 *
 * Product claims come from lib/marketing/security.ts (claims register rows),
 * names and states from the registry. No real customer, account, resource,
 * date, person, score or count appears. lib/marketing-sample-report.test.ts
 * checks.
 */
import {
  CONTROL_STATUS,
  EVIDENCE_INTEGRITY,
  EVIDENCE_KIND,
  EVIDENCE_KIND_MEANING,
  FINDING_STATUS,
  REMEDIATION_STATE,
  REMEDIATION_VERDICT,
  SEVERITY,
} from "../domain/status";
import { capabilityById, PRODUCT_DESCRIPTOR, PRODUCT_DISPLAY_NAME, type Capability } from "./capabilities";
import { ARIA_MODEL, cloudById } from "./clouds";
import { STAGES } from "./method";
import { CUSTOMER_CONTROL, EVIDENCE_CLAIMS, REMEDIATION_RULES, type SecurityClaim } from "./security";

/** Shown at the top of the page and on every module of the sample. */
export const SAMPLE_LABEL = "SYNTHETIC SAMPLE — NOT A CUSTOMER REPORT";

/** The required disclaimer, near the top and again near the report body. */
export const SAMPLE_DISCLAIMER =
  "All environments, resources, findings, timestamps and identities shown here are synthetic examples created for illustration.";

/** What the sample is not, stated plainly. */
export const SAMPLE_NOT = [
  "It is not a report for, or about, any real organisation.",
  "It is not an audit, a certification report or a penetration test report.",
  "It is not evidence from a real engagement, and it does not show results anyone has achieved.",
];

export const SAMPLE_PURPOSE =
  "This example shows how a finding can move from assessment through approved remediation, verification and evidence.";

const claim = (list: SecurityClaim[], source: string): string => {
  const c = list.find((x) => x.source === source);
  if (!c) throw new Error(`claims register row ${source} is missing from lib/marketing/security.ts`);
  return c.text;
};

export const cap = (id: string): Capability => {
  const c = capabilityById(id);
  if (!c) throw new Error(`capability ${id} is missing from the registry`);
  return c;
};

const azure = cloudById("azure");

/* ── Synthetic identifiers ───────────────────────────────────────────────
 * Obviously fictional names. Never a real subscription ID, tenant, account
 * number, domain, IP address or person. Times are relative sample times, not
 * dates. */
export const SYNTHETIC = {
  organisation: "Example Organisation",
  environment: "synthetic-environment",
  subscription: "example-subscription",
  resourceGroup: "example-resource-group",
  resource: "samplestorage01",
  requester: "Example Security Engineer",
  approver: "Example Security Approver",
  reference: "SAMPLE-0001",
} as const;

export const SAMPLE_TIME = {
  assessed: "Sample day 1, 09:40",
  requested: "Sample day 1, 10:55",
  approved: "Sample day 1, 11:05",
  applied: "Sample day 1, 11:12",
  verified: "Sample day 1, 11:13",
  rechecked: "Sample day 2, 09:40",
} as const;

export interface Field {
  label: string;
  value: string;
  /** Monospace (identifiers and settings). */
  mono?: boolean;
}

/* ── 2. Report metadata ─────────────────────────────────────────────────── */
export const METADATA: Field[] = [
  { label: "Record", value: "Sample security closure record" },
  { label: "Reference", value: SYNTHETIC.reference, mono: true },
  { label: "Organisation", value: `${SYNTHETIC.organisation} (synthetic)` },
  { label: "Environment", value: SYNTHETIC.environment, mono: true },
  { label: "Cloud", value: azure.name },
  { label: "Subscription", value: SYNTHETIC.subscription, mono: true },
  { label: "Access for checking", value: `Read-only: ${azure.access.charAt(0).toLowerCase()}${azure.access.slice(1)}` },
  { label: "Scope of this record", value: "One control on one resource" },
];

/* ── 3–4. Finding and assessment ───────────────────────────────────────── */
// From api/controls/catalogue.go (TC-DATA-02) and the Azure evaluator.
export const CONTROL = {
  id: "TC-DATA-02",
  name: "No storage bucket is public",
  whyItMatters:
    "Anyone with the link can read the contents, and exported files often contain customer personal data.",
} as const;

export const FINDING = {
  title: `Public blob access is allowed on storage account ${SYNTHETIC.resource}`,
  status: CONTROL_STATUS.FAIL.label,
  severity: SEVERITY.CRITICAL.label,
  severityMeaning: SEVERITY.CRITICAL.meaning,
  findingStatus: FINDING_STATUS.OPEN.label,
};

export const ASSESSMENT: Field[] = [
  { label: "Control", value: `${CONTROL.name} (${CONTROL.id})` },
  { label: "Resource", value: `${SYNTHETIC.resource} · storage account · ${SYNTHETIC.resourceGroup}`, mono: true },
  { label: "Observed state", value: "Public blob access: allowed" },
  { label: "Expected state", value: "Public blob access: disallowed on the storage account" },
  { label: "Result", value: CONTROL_STATUS.FAIL.label },
  { label: "Severity", value: `${SEVERITY.CRITICAL.label}: ${SEVERITY.CRITICAL.meaning.toLowerCase()}` },
  { label: "Why it matters", value: CONTROL.whyItMatters },
  { label: "Assessment time", value: SAMPLE_TIME.assessed },
];

/** How the check is made, in the register's approved words. */
export const ASSESSMENT_NOTES = [
  claim(CUSTOMER_CONTROL, "C7"),
  claim(EVIDENCE_CLAIMS, "A4"),
  claim(EVIDENCE_CLAIMS, "A5"),
];

/* ── 5. Remediation plan: people and ARIA, kept apart ──────────────────── */
export interface PlanStep {
  id: string;
  title: string;
  /** What the engineers (the example organisation's, and ours when engaged) do. */
  people: string;
  /** What ARIA supports in this step, or null where the step is people only. */
  aria: string | null;
}

export const PLAN: PlanStep[] = [
  {
    id: "finding",
    title: "Finding",
    people: "Confirm the finding, and whether any application depends on public access to this storage account.",
    aria: `The defined check reports the control as ${CONTROL_STATUS.FAIL.label.toLowerCase()} on ${SYNTHETIC.resource}.`,
  },
  {
    id: "decision",
    title: "Remediation decision",
    people:
      "Decide that public access is not needed, agree the change with the owning engineers and plan the rollback: allow public access again on this one account.",
    aria: null,
  },
  {
    id: "approval",
    title: "Approved change",
    people: `${SYNTHETIC.approver}, a named person in the example organisation, reviews and approves the one change.`,
    aria: "Records the request and the approval. The approval is one-time and expires.",
  },
  {
    id: "execution",
    title: "Bounded execution",
    people: "Stay available to roll back if an application is affected.",
    aria: `Re-checks the control before the change runs, then changes one setting on ${SYNTHETIC.resource} and nothing else.`,
  },
  {
    id: "verification",
    title: "Verification",
    people: "Review the result, and confirm the applications that use the account still work.",
    aria: "Runs the same check again straight away and records the outcome.",
  },
];

/** Where a change is complex or has no supported automated fix. */
export const ENGINEERING_LED =
  "Complex or unsupported changes remain engineering-led. Your engineers, or ours when you work with us, make the change, and it is tracked and verified the same way.";

/* ── 6. Approval record ────────────────────────────────────────────────── */
export const APPROVAL: Field[] = [
  { label: "Proposed change", value: `Disallow public blob access on ${SYNTHETIC.resource}` },
  { label: "Requested by", value: `${SYNTHETIC.requester} (synthetic)` },
  { label: "Approver", value: `${SYNTHETIC.approver} (synthetic)` },
  { label: "Authorization", value: REMEDIATION_STATE.APPROVED.label },
  { label: "Scope", value: `One setting on one resource: ${SYNTHETIC.resource}` },
  { label: "Requested", value: SAMPLE_TIME.requested },
  { label: "Approved", value: SAMPLE_TIME.approved },
];

export const APPROVAL_RULES = [
  claim(REMEDIATION_RULES, "R2"),
  claim(REMEDIATION_RULES, "R3"),
  claim(CUSTOMER_CONTROL, "C9"),
  claim(CUSTOMER_CONTROL, "R11"),
];

/* ── 7. Remediation action ─────────────────────────────────────────────── */
export const ACTION: Field[] = [
  { label: "Action", value: "Disallow public blob access" },
  { label: "Resource", value: SYNTHETIC.resource, mono: true },
  { label: "Setting", value: "allowBlobPublicAccess", mono: true },
  { label: "Before", value: "true (public blob access allowed)", mono: true },
  { label: "After", value: "false (public blob access disallowed)", mono: true },
  { label: "Applied", value: SAMPLE_TIME.applied },
  { label: "State", value: REMEDIATION_STATE.APPLIED.label },
];

export const ACTION_STATE_MEANING = REMEDIATION_STATE.APPLIED.meaning;

export const ACTION_BOUNDS = [
  claim(REMEDIATION_RULES, "R7"),
  "No other storage account, container or setting in the subscription is changed.",
];

/* ── 8. Verification ───────────────────────────────────────────────────── */
export const VERIFICATION_SEQUENCE: { step: string; detail: string; time: string; result: string }[] = [
  { step: "Before", detail: "Control checked", time: SAMPLE_TIME.assessed, result: CONTROL_STATUS.FAIL.label },
  { step: "Change", detail: "Approved remediation applied", time: SAMPLE_TIME.applied, result: REMEDIATION_STATE.APPLIED.label },
  { step: "After", detail: "Same check run again", time: SAMPLE_TIME.verified, result: CONTROL_STATUS.PASS.label },
];

/** The three outcomes the product records (register R6), with this sample's marked. */
export const OUTCOMES = [
  { label: REMEDIATION_VERDICT.REMEDIATED.label, meaning: REMEDIATION_VERDICT.REMEDIATED.meaning, thisSample: true },
  { label: REMEDIATION_VERDICT.NOT_EFFECTIVE.label, meaning: REMEDIATION_VERDICT.NOT_EFFECTIVE.meaning, thisSample: false },
  { label: REMEDIATION_VERDICT.UNVERIFIED.label, meaning: REMEDIATION_VERDICT.UNVERIFIED.meaning, thisSample: false },
];

export const VERIFICATION_RULES = [claim(REMEDIATION_RULES, "R5"), claim(REMEDIATION_RULES, "R6")];

/** Verification's boundary, from the method (/how-we-work). */
export const VERIFICATION_BOUNDARY = STAGES.find((s) => s.id === "verify")!.boundary;

/* ── 9. Evidence ───────────────────────────────────────────────────────── */
export const EVIDENCE: Field[] = [
  { label: "Record type", value: EVIDENCE_KIND.REMEDIATION },
  { label: "What it holds", value: EVIDENCE_KIND_MEANING.REMEDIATION },
  { label: "Control", value: `${CONTROL.name} (${CONTROL.id})` },
  { label: "Resources", value: SYNTHETIC.resource, mono: true },
  { label: "Time", value: SAMPLE_TIME.verified },
  { label: "Result", value: `${CONTROL_STATUS.PASS.label} · ${REMEDIATION_VERDICT.REMEDIATED.label}` },
  { label: "Integrity on retrieval", value: EVIDENCE_INTEGRITY.VERIFIED.label },
];

/** The linked records behind this closure, in order. */
export const EVIDENCE_TRAIL = [
  { record: "Assessment check", time: SAMPLE_TIME.assessed, result: CONTROL_STATUS.FAIL.label },
  { record: "Fix requested", time: SAMPLE_TIME.requested, result: REMEDIATION_STATE.PENDING_APPROVAL.label },
  { record: "Approval", time: SAMPLE_TIME.approved, result: REMEDIATION_STATE.APPROVED.label },
  { record: "Change applied", time: SAMPLE_TIME.applied, result: REMEDIATION_STATE.APPLIED.label },
  { record: "Verification check", time: SAMPLE_TIME.verified, result: CONTROL_STATUS.PASS.label },
];

export const EVIDENCE_RULES = [
  claim(EVIDENCE_CLAIMS, "E1"),
  claim(EVIDENCE_CLAIMS, "E2"),
  claim(EVIDENCE_CLAIMS, "E3"),
  claim(EVIDENCE_CLAIMS, "E7"),
];

/* ── 10. Closure record ────────────────────────────────────────────────── */
export const CLOSURE: { stage: string; state: string; detail: string; anchor: string }[] = [
  { stage: "Finding", state: "Identified", detail: `${CONTROL.name}, ${SYNTHETIC.resource}`, anchor: "finding" },
  { stage: "Authorization", state: REMEDIATION_STATE.APPROVED.label, detail: `${SYNTHETIC.approver} (synthetic)`, anchor: "approval" },
  { stage: "Remediation", state: REMEDIATION_STATE.APPLIED.label, detail: "One setting, one resource", anchor: "remediation-action" },
  { stage: "Verification", state: REMEDIATION_VERDICT.REMEDIATED.label, detail: "Same check run again", anchor: "verification" },
  { stage: "Evidence", state: "Recorded", detail: "Signed, linked records", anchor: "evidence" },
  { stage: "Closure", state: "Closed", detail: `Finding marked ${FINDING_STATUS.RESOLVED.label.toLowerCase()}`, anchor: "closure" },
];

/** What happened after closure: the Keep secure step. */
export const AFTER_CLOSURE = {
  label: "Later scheduled re-check",
  time: SAMPLE_TIME.rechecked,
  result: CONTROL_STATUS.PASS.label,
  note: "Controls are re-checked on a schedule. A control that passed and later fails is flagged as drifted, so it can be fixed and verified again.",
};

export const CLOSURE_NOTE = `${cap("closure-record").summary} It is a record of what happened, not an audit opinion.`;

/* ── 11. ARIA ──────────────────────────────────────────────────────────── */
/** Where each ARIA model step appears in this sample. */
export const ARIA_IN_SAMPLE: Record<string, { anchor: string; text: string }> = {
  Evaluate: { anchor: "assessment", text: "The failing control was found by a defined check." },
  Fix: { anchor: "remediation-action", text: "The approved, bounded change was applied to one resource." },
  Verify: { anchor: "verification", text: "The same check ran again and the control passed." },
  "Keep secure": { anchor: "closure", text: "A later scheduled re-check still passed." },
  Evidence: { anchor: "evidence", text: "Each step was saved as a signed, linked record." },
};

export const ARIA_STEPS = ARIA_MODEL.map((m) => {
  const inSample = ARIA_IN_SAMPLE[m.step];
  if (!inSample) throw new Error(`${PRODUCT_DISPLAY_NAME} model step ${m.step} has no place in the sample`);
  return { step: m.step, body: m.body, ...inSample };
});

export const ARIA_ROLE = [
  `${PRODUCT_DISPLAY_NAME} is Tricognita's product for ${PRODUCT_DESCRIPTOR.toLowerCase()}. It makes the repeatable parts of this record consistent: the check, the bounded change, the re-check and the records.`,
  `It does not decide what to change, approve changes or replace engineering judgement. People made every decision in this sample.`,
  `This sample was written by Tricognita to illustrate the workflow. It is not a report generated by ${PRODUCT_DISPLAY_NAME}.`,
];

/** The capabilities this sample illustrates; their states come from the registry. */
export const SAMPLE_CAPABILITY_IDS = [
  azure.platformCapabilityId,
  "approval-model",
  azure.fixCapabilityId!,
  "customer-applied-fixes",
  "verification",
  "scheduled-rechecks",
  "signed-records",
  "closure-record",
];

/** Services that carry this record, in the order of the work. */
export const SERVICE_PATH: { stage: string; serviceId: string; note: string }[] = [
  { stage: "Assessment", serviceId: "cloud-security-assessment", note: "Finds and ranks what fails." },
  { stage: "Remediation", serviceId: "remediation-hardening", note: "Plans and applies each fix with your engineers." },
  { stage: "Verification", serviceId: "remediation-hardening", note: "Re-checks each fix and records whether it held." },
  { stage: "Ongoing support", serviceId: "security-retainer", note: "Re-checks and drift fixes, where you want the work to continue." },
];

/* ── 12. Human decision boundary ───────────────────────────────────────── */
export { PEOPLE_DECIDE } from "./method";

/** The page's modules, in order: stable ids and headings for design. */
export const MODULES = [
  { id: "synthetic-notice", title: "About this sample" },
  { id: "metadata", title: "Report metadata" },
  { id: "finding", title: "Finding summary" },
  { id: "assessment", title: "Assessment detail" },
  { id: "remediation-plan", title: "Remediation plan" },
  { id: "approval", title: "Approval record" },
  { id: "remediation-action", title: "Remediation action" },
  { id: "verification", title: "Verification result" },
  { id: "evidence", title: "Evidence record" },
  { id: "closure", title: "Closure record" },
  { id: "aria", title: `Where ${PRODUCT_DISPLAY_NAME} fits` },
  { id: "human-boundary", title: "Human decision boundary" },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

export const moduleTitle = (id: ModuleId): string => MODULES.find((m) => m.id === id)!.title;

/** The sample's cloud: one whose fix capability supports this control. */
export const SAMPLE_CLOUD = azure;
