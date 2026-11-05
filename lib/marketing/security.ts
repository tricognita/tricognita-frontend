/**
 * Public security and trust claims for /security.
 *
 * Every claim cites the row of the product truth register it comes from
 * (docs/02_Company/Marketing/MARKETING_CLAIMS_GUARDRAILS.md §2) and uses that
 * row's approved wording, or its interim wording where the row is gated. A
 * claim may only cite a row marked AVAILABLE, AVAILABLE — WORDING, or GATED
 * with interim wording; lib/marketing-capabilities.test.ts checks this.
 *
 * Deliberately NOT claimed here, and why (register rows in brackets):
 * - that Tricognita cannot read your data: AWS read-only access can read
 *   some stored data [C8];
 * - two-person approval [R4]; tamper-evident records [E4];
 *   independent verification [E6]; published hosting locations [S4];
 *   data residency [S5]; certifications [S6, stated as not held];
 *   credential encryption at rest [S7];
 * - the external-ID and "only Tricognita can assume" access wording [C5]:
 *   the external ID is optional in the current onboarding.
 */

export interface SecurityClaim {
  text: string;
  /** Register row in MARKETING_CLAIMS_GUARDRAILS.md §2 (e.g. "C7"). */
  source: string;
}

/** What stays under the customer's control. */
export const CUSTOMER_CONTROL: SecurityClaim[] = [
  { text: "Checking your controls needs read-only access.", source: "C7" },
  {
    text: "Applying a fix needs an additional, narrowly scoped permission for that one kind of change. You grant it only if you want Tricognita to apply fixes.",
    source: "C9",
  },
  { text: "Each kind of automated fix is off by default. It is switched on per organisation.", source: "R11" },
  { text: "Nothing changes in your cloud until someone with approval rights approves it.", source: "R2" },
];

/** How a change is authorised and bounded. */
export const REMEDIATION_RULES: SecurityClaim[] = [
  { text: "Nothing changes in your cloud until someone with approval rights approves it.", source: "R2" },
  { text: "An approval is valid for a limited time. After that, it must be approved again.", source: "R3" },
  { text: "A fix changes one setting on the one resource that failed. It cannot be pointed at anything else.", source: "R7" },
  { text: "After a fix is applied, the control is checked again straight away.", source: "R5" },
  { text: "Each fix ends in one of three outcomes: Fixed, Did not fix it, or Unconfirmed.", source: "R6" },
];

/** How checks, evidence and the record of actions work. */
export const EVIDENCE_CLAIMS: SecurityClaim[] = [
  { text: "Each control is checked by a defined rule. AI does not decide whether a control passes.", source: "A4" },
  { text: "If a control cannot be checked, we say so. It is never counted as passing.", source: "A5" },
  { text: "Every check is saved as an evidence record: the control, the resources, the time and the result.", source: "E1" },
  { text: "Each evidence record is signed and linked to the one before it.", source: "E2" },
  { text: "When a record is opened, the product checks it still matches what was written.", source: "E3" },
  // E6 forbids "independently verifiable"; this is its approved wording.
  { text: "Tricognita verifies each record's integrity.", source: "E6" },
  { text: "Every request, approval and change is recorded in a linked audit log.", source: "E7" },
];

/** How the platform itself controls access. */
export const PLATFORM_CLAIMS: SecurityClaim[] = [
  {
    text: "Give each person the access they need: administrators, security operators, and read-only auditors.",
    source: "S1",
  },
  {
    text: "Invite your auditor with a read-only role. They can see controls and evidence, and cannot change anything.",
    source: "S2",
  },
  { text: "Each organisation's data is kept separate.", source: "S3" },
];

/** Stated plainly, because customers ask (register S6, approved wording). */
export const CERTIFICATION_STATEMENT = "Tricognita does not yet hold a SOC 2 or ISO 27001 certification.";

/** What is deliberately not claimed today, in customer terms. */
export const NOT_CLAIMED: string[] = [
  "That read-only access cannot read any of your data: on some clouds, read-only roles can read stored data.",
  "Two-person approval for changes.",
  "Published hosting locations, or data residency in a particular country.",
  "Company certifications, audit reports or penetration test reports.",
  "Encryption commitments beyond what is documented for each engagement.",
];

/** How a change moves from finding to verified result. */
export const CHANGE_FLOW = [
  { step: "Find", body: "A defined check shows a control failing on a resource." },
  { step: "Scope", body: "The fix is agreed: what changes, on which resource, and how to roll it back." },
  { step: "Authorize", body: "Someone with approval rights in your organisation approves it." },
  { step: "Bounded change", body: "One setting changes on that one resource, and nothing else." },
  { step: "Verify", body: "The same check runs again, and the result is recorded." },
];
