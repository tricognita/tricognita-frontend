/**
 * Performance — the deterministic data + view-model pipeline at scale (10 → 10,000
 * events). Measures generation + per-row processing time and memory in Node, and
 * asserts the pipeline is near-LINEAR (no accidental O(n²)) and bounded.
 *
 * NOTE: real browser render/animation FPS is measured manually via /dev/stress
 * (documented in the Frontend Validation Report). This proves the DATA layer scales.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { largeEvidenceChain } from "./scenarios";
import { EvidenceState } from "../contracts/state";

const SIZES = [10, 100, 1000, 10000] as const;

function processScenario(count: number): { ms: number; verified: number } {
  const t0 = performance.now();
  const s = largeEvidenceChain(count, 7);
  // A realistic reduction: classify every evidence row (what the render layer does).
  let verified = 0;
  for (const row of s.timeline) {
    if (row.state === EvidenceState.Verified || row.state === EvidenceState.Sealed) verified++;
  }
  const ms = performance.now() - t0;
  return { ms, verified };
}

test("data pipeline scales to 10,000 events, near-linear, bounded", () => {
  const rows: { n: number; ms: number; perEvent: number; heapMB: number }[] = [];
  for (const n of SIZES) {
    processScenario(n); // warm
    const before = process.memoryUsage().heapUsed;
    const { ms } = processScenario(n);
    const after = process.memoryUsage().heapUsed;
    rows.push({ n, ms: +ms.toFixed(3), perEvent: +(ms / n).toFixed(5), heapMB: +((after - before) / 1e6).toFixed(2) });
  }

  console.log("\n  events |     ms |  ms/event | ~heapΔ MB");
  console.log("  -------+--------+-----------+----------");
  for (const r of rows) {
    console.log(`  ${String(r.n).padStart(6)} | ${String(r.ms).padStart(6)} | ${String(r.perEvent).padStart(9)} | ${String(r.heapMB).padStart(8)}`);
  }

  const big = rows.find((r) => r.n === 10000)!;
  const small = rows.find((r) => r.n === 100)!;
  // Bounded: 10k events processed well under a frame budget's many multiples.
  assert.ok(big.ms < 500, `10k pipeline took ${big.ms}ms (expected < 500ms)`);
  // Near-linear: per-event cost must not blow up with N (guards against O(n²)).
  assert.ok(big.perEvent < small.perEvent * 8 + 0.01, `per-event cost grew too much (${big.perEvent} vs ${small.perEvent})`);
});

test("generated dataset is exact at scale (no truncation/rounding drift)", () => {
  const s = largeEvidenceChain(10000, 7);
  assert.equal(s.timeline.length, 10000);
  assert.equal(s.evidence.count, 10000);
  assert.equal(s.timeline[9999].id, "ev-10000");
});
