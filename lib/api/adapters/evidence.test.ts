/**
 * Evidence adapter behaviour. The rule under test throughout: the product may
 * never present a record as sound unless the backend said so in a word it
 * understands.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { toEvidence } from "./evidence";
import type { EvidenceDTO } from "../dto/evidence";

function dto(over: Partial<EvidenceDTO> = {}): EvidenceDTO {
  return {
    id: "EV-3F9A12BC",
    kind: "CONTROL_VERIFICATION",
    controlId: "TC-DATA-02",
    runId: "run-91",
    recordedAt: "2026-09-19T09:00:00Z",
    integrity: "VERIFIED",
    summary: "No storage bucket is public passed on 12 resources.",
    ...over,
  };
}

test("an evidence record maps across intact", () => {
  const e = toEvidence(dto());
  assert.equal(e.id, "EV-3F9A12BC");
  assert.equal(e.kind, "CONTROL_VERIFICATION");
  assert.equal(e.controlId, "TC-DATA-02");
  assert.equal(e.runId, "run-91");
  assert.equal(e.integrity, "VERIFIED");
  assert.equal(e.summary, "No storage bucket is public passed on 12 resources.");
});

test("an integrity value the product does not know is UNCHECKED, never VERIFIED", () => {
  assert.equal(toEvidence(dto({ integrity: "PROBABLY_FINE" })).integrity, "UNCHECKED");
  assert.equal(toEvidence(dto({ integrity: "" })).integrity, "UNCHECKED");
  assert.equal(
    toEvidence(dto({ integrity: undefined as unknown as string })).integrity,
    "UNCHECKED",
  );
});

test("a failed integrity check is carried through, not softened", () => {
  assert.equal(toEvidence(dto({ integrity: "FAILED" })).integrity, "FAILED");
});

test("drift keeps its own kind", () => {
  assert.equal(toEvidence(dto({ kind: "DRIFT" })).kind, "DRIFT");
});

test("an unknown kind renders as a control verification rather than crashing", () => {
  assert.equal(toEvidence(dto({ kind: "SOMETHING_NEW" })).kind, "CONTROL_VERIFICATION");
});

test("a missing control or run is undefined, not an empty string", () => {
  const e = toEvidence(dto({ controlId: "", runId: undefined }));
  assert.equal(e.controlId, undefined);
  assert.equal(e.runId, undefined);
});

test("a record with no summary does not become the string 'undefined'", () => {
  const e = toEvidence(dto({ summary: undefined as unknown as string }));
  assert.equal(e.summary, "");
});
