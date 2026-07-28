/**
 * PRODUCT VIEW-MODEL — pure mappers from Contract state → Token color classes and
 * visual attributes. No React, no rendering. Extracted so the composition logic is
 * unit-testable (the components themselves are verified in the playground).
 *
 * Color classes are LITERAL strings (never `text-${x}`) so Tailwind's scanner emits
 * them. currentColor on a wrapping <g> flows into geometry's stroke/fill.
 *
 * Relative imports (not `@/`) so the tsx test runner resolves the contract values.
 */
import type { StateRole } from "../../../lib/design/tokens";
import {
  OperationalState,
  EvidenceState,
  OPERATIONAL_COLOR,
  EVIDENCE_COLOR,
} from "../../../lib/contracts/state";
import type { BeatStatus } from "../../../lib/contracts/narrative";

/** StateRole → literal Token color utility (null → neutral muted). */
export function roleClass(role: StateRole | null): string {
  switch (role) {
    case "nominal":
      return "text-nominal";
    case "engaged":
      return "text-engaged";
    case "advisory":
      return "text-advisory";
    case "halt":
      return "text-halt";
    default:
      return "text-bone-muted";
  }
}

export function operationalClass(s: OperationalState): string {
  return roleClass(OPERATIONAL_COLOR[s]);
}

export function evidenceClass(s: EvidenceState): string {
  return roleClass(EVIDENCE_COLOR[s]);
}

export interface BeatVisual {
  readonly colorClass: string;
  readonly opacity: number;
  readonly emphasized: boolean;
}

/** BeatStatus → the "you are here" visual: current is engaged, done is proven. */
export function beatVisual(status: BeatStatus): BeatVisual {
  switch (status) {
    case "current":
      return { colorClass: "text-engaged", opacity: 1, emphasized: true };
    case "completed":
      return { colorClass: "text-nominal", opacity: 1, emphasized: false };
    case "skipped":
      return { colorClass: "text-bone-subtle", opacity: 0.4, emphasized: false };
    case "future":
    default:
      return { colorClass: "text-bone-muted", opacity: 0.6, emphasized: false };
  }
}

/**
 * The append-only evidence lifecycle for the Nth block given how far the chain has
 * progressed. Pending → Unsigned → Sealed → Verified → Archived. Pure & monotonic.
 */
export function evidenceStateAt(
  index: number,
  sealedUpTo: number,
  verifiedUpTo: number,
  archived = false,
): EvidenceState {
  if (archived) return EvidenceState.Archived;
  if (index <= verifiedUpTo) return EvidenceState.Verified;
  if (index <= sealedUpTo) return EvidenceState.Sealed;
  if (index === sealedUpTo + 1) return EvidenceState.Unsigned;
  return EvidenceState.Pending;
}

/** A policy gate is open iff the control passed (nominal); halt/advisory are shut. */
export function gateOpen(s: OperationalState): boolean {
  return s === OperationalState.Nominal;
}
