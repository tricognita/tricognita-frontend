import type { Organisation } from "@/lib/domain";

/**
 * Acme Technologies — the fictional customer the fixtures describe.
 *
 * Never presented as a real organisation: fixture mode renders a persistent
 * "Demo data" bar, and exports are watermarked.
 */
export const FIXTURE_ORG: Organisation = {
  id: "org-acme",
  name: "Acme Technologies",
  controlsInBaseline: 27,
};
