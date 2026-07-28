/**
 * Product view-model — unit tests for the pure Contract-state → Token-color and
 * evidence-lifecycle mappers (the components themselves are verified in the
 * playground). Run via `npm test`.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { OperationalState, EvidenceState } from "../../../lib/contracts/state";
import {
  roleClass,
  operationalClass,
  evidenceClass,
  beatVisual,
  evidenceStateAt,
  gateOpen,
} from "./viewmodel";

test("roleClass maps every StateRole to a literal Token utility (Tailwind-scannable)", () => {
  assert.equal(roleClass("nominal"), "text-nominal");
  assert.equal(roleClass("engaged"), "text-engaged");
  assert.equal(roleClass("advisory"), "text-advisory");
  assert.equal(roleClass("halt"), "text-halt");
  assert.equal(roleClass(null), "text-bone-muted");
});

test("operationalClass: reverted reads as engaged (active reversal); halt as halt", () => {
  assert.equal(operationalClass(OperationalState.Nominal), "text-nominal");
  assert.equal(operationalClass(OperationalState.Halt), "text-halt");
  assert.equal(operationalClass(OperationalState.Reverted), "text-engaged");
});

test("evidenceClass: sealed/verified are proven (nominal); pending/archived neutral", () => {
  assert.equal(evidenceClass(EvidenceState.Sealed), "text-nominal");
  assert.equal(evidenceClass(EvidenceState.Verified), "text-nominal");
  assert.equal(evidenceClass(EvidenceState.Pending), "text-bone-muted");
  assert.equal(evidenceClass(EvidenceState.Archived), "text-bone-muted");
});

test("beatVisual: current is emphasized/engaged; completed proven; skipped dim", () => {
  assert.equal(beatVisual("current").colorClass, "text-engaged");
  assert.ok(beatVisual("current").emphasized);
  assert.equal(beatVisual("completed").colorClass, "text-nominal");
  assert.ok(beatVisual("skipped").opacity < beatVisual("future").opacity);
});

test("evidenceStateAt is monotonic: pending → unsigned → sealed → verified → archived", () => {
  // nothing sealed/verified yet
  assert.equal(evidenceStateAt(0, -1, -1), EvidenceState.Unsigned); // next-to-seal
  assert.equal(evidenceStateAt(2, -1, -1), EvidenceState.Pending);
  // block 0..1 sealed, none verified
  assert.equal(evidenceStateAt(0, 1, -1), EvidenceState.Sealed);
  assert.equal(evidenceStateAt(2, 1, -1), EvidenceState.Unsigned);
  // block 0 verified
  assert.equal(evidenceStateAt(0, 2, 0), EvidenceState.Verified);
  // archived overrides everything
  assert.equal(evidenceStateAt(0, 2, 2, true), EvidenceState.Archived);
});

test("gateOpen: only a passed (nominal) control opens the gate", () => {
  assert.ok(gateOpen(OperationalState.Nominal));
  assert.ok(!gateOpen(OperationalState.Halt));
  assert.ok(!gateOpen(OperationalState.Advisory));
  assert.ok(!gateOpen(OperationalState.Engaged));
});
