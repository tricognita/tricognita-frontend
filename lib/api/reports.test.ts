import { test } from "node:test";
import assert from "node:assert/strict";
import { monthOptions, reportDownloadHref, toReport, trailingPeriod } from "./reports";

test("only finished calendar months are offered, newest first, on exact UTC boundaries", () => {
  const opts = monthOptions(new Date("2026-10-14T12:00:00Z"), 3);
  assert.deepEqual(opts.map((o) => o.label), ["September 2026", "August 2026", "July 2026"]);
  assert.equal(opts[0].start, "2026-09-01T00:00:00Z");
  assert.equal(opts[0].end, "2026-10-01T00:00:00Z"); // October is in progress and is never offered
  assert.equal(opts[1].end, opts[0].start); // contiguous
});

test("months roll over a year boundary", () => {
  const opts = monthOptions(new Date("2026-01-05T00:00:00Z"), 2);
  assert.equal(opts[0].start, "2025-12-01T00:00:00Z");
  assert.equal(opts[0].end, "2026-01-01T00:00:00Z");
  assert.equal(opts[1].start, "2025-11-01T00:00:00Z");
});

test("a trailing period ends now to the second and spans whole days", () => {
  const p = trailingPeriod(30, new Date("2026-10-14T12:34:56.789Z"));
  assert.equal(p.end, "2026-10-14T12:34:56Z");
  assert.equal(p.start, "2026-09-14T12:34:56Z");
  assert.ok(!p.end.includes("."), "no fractional seconds: the API parses RFC 3339 and compares to now");
});

test("the API's report is mapped faithfully and an unknown state is not a ready document", () => {
  const dto = { id: "r1", kind: "MONTHLY_ASSURANCE", periodStart: "2026-09-01T00:00:00Z", periodEnd: "2026-10-01T00:00:00Z", state: "READY", generatedAt: "2026-10-14T00:00:00Z", generatedBy: "a@x.test",
    downloadUrl: "/api/reports/r1/download?format=csv", formats: ["CSV", "JSON", "DOCX"], summary: { controlsVerified: 2, controlsFailing: 1, driftEvents: 1, remediations: 0 }, signed: false };
  const r = toReport(dto);
  assert.deepEqual(r.formats, ["CSV", "JSON"]); // a format the product does not know is not advertised
  assert.equal(r.state, "READY");
  assert.equal(r.signed, false);
  assert.equal(toReport({ ...dto, state: "WEIRD" }).state, "UNAVAILABLE");
  assert.equal(toReport({ ...dto, signed: undefined }).signed, false, "signed is only ever true when the API said so");
  assert.equal(reportDownloadHref(r, "json"), "/api/reports/r1/download?format=json");
  assert.equal(reportDownloadHref({ ...r, downloadUrl: undefined }, "csv"), undefined);
});
