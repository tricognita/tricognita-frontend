/**
 * Lead kinds — one source for the lead store (lib/leads.ts), the public lead
 * API (/api/leads) and the admin inbox (/dashboard/admin/leads).
 *
 * Pure (no Redis, no Node APIs) so the client-side admin inbox can import it.
 *
 * `scoping_call` is the canonical kind for the public "Book a scoping call"
 * intent (2026-09-26).
 *
 * `request_demo` is a LEGACY kind from the earlier demo-based site:
 * - Historical records keep it. They are never rewritten or reinterpreted:
 *   a demo request is not assumed to be a scoping call, so the inbox shows
 *   them as "Demo request (legacy)".
 * - The API still accepts it so a visitor with an old page open does not lose
 *   their request, and stores it as submitted.
 * - Nothing we ship produces it any more (lib/marketing/contact.ts sends
 *   `scoping_call`); lib/marketing-contact.test.ts enforces that.
 */

export type LeadKind = "scoping_call" | "pilot_application" | "waitlist" | "contact" | "request_demo";

/** Kinds the lead API accepts, current first, then legacy. */
export const LEAD_KINDS: readonly LeadKind[] = [
  "scoping_call",
  "pilot_application",
  "waitlist",
  "contact",
  "request_demo",
] as const;

/** Kinds that are kept only for older clients and historical records. */
export const LEGACY_LEAD_KINDS: readonly LeadKind[] = ["request_demo"] as const;

/** Inbox labels. Existing kinds keep their labels; the order is the filter order. */
export const KIND_LABELS: Record<LeadKind, string> = {
  scoping_call: "Scoping Call",
  pilot_application: "Pilot",
  waitlist: "Waitlist",
  contact: "Contact",
  request_demo: "Demo request (legacy)",
};

/** Label for any stored kind, including one this build does not know. */
export function kindLabel(kind: string): string {
  return (KIND_LABELS as Record<string, string>)[kind] ?? `Unknown (${kind})`;
}

/** Confirmation messages returned by /api/leads. No response-time promises. */
export const LEAD_CONFIRMATION = {
  stored: "Thanks. We'll review your request and follow up with next steps.",
  deduped: "We already have your details from a recent submission. We'll follow up with next steps.",
} as const;
