/**
 * Accessibility — WCAG color contrast, computed from the REAL token CSS
 * (app/styles/tokens/primitives.css) so it validates the shipped palette.
 * Text roles must meet AA (>=4.5:1); state colors used as graphics/large meet the
 * non-text/large threshold (>=3:1, WCAG 1.4.11 / 1.4.3-large).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync("app/styles/tokens/primitives.css", "utf8");

function hexOf(name: string): string {
  const m = css.match(new RegExp(`--_${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`primitive --_${name} not found in primitives.css`);
  return m[1];
}

function relLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const chan = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}

function ratio(a: string, b: string): number {
  const la = relLum(a);
  const lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const rows: { pair: string; ratio: number; need: number }[] = [];
function check(pair: string, fg: string, bg: string, need: number) {
  const r = +ratio(fg, bg).toFixed(2);
  rows.push({ pair, ratio: r, need });
  assert.ok(r >= need, `${pair} contrast ${r}:1 < required ${need}:1`);
}

test("DARK theme — text AA (>=4.5), state grammar graphical (>=3)", () => {
  const bg = hexOf("graphite-900");
  check("bone/substrate", hexOf("bone-100"), bg, 4.5);
  check("bone-muted/substrate", hexOf("bone-500"), bg, 4.5);
  check("nominal/substrate", hexOf("nominal-500"), bg, 3);
  check("engaged/substrate", hexOf("engaged-500"), bg, 3);
  check("advisory/substrate", hexOf("advisory-500"), bg, 3);
  check("halt/substrate", hexOf("halt-500"), bg, 3);
});

test("LIGHT theme — text AA (>=4.5), state grammar graphical (>=3)", () => {
  const bg = hexOf("paper-100");
  check("ink/paper", hexOf("ink-900"), bg, 4.5);
  check("ink-muted/paper", hexOf("ink-500"), bg, 4.5);
  check("nominal-ink/paper", hexOf("nominal-ink"), bg, 3);
  check("engaged-ink/paper", hexOf("engaged-ink"), bg, 3);
  check("advisory-ink/paper", hexOf("advisory-ink"), bg, 3);
  check("halt-ink/paper", hexOf("halt-ink"), bg, 3);
});

test("report", () => {
  console.log("\n  pair                      ratio   need");
  console.log("  --------------------------+-------+-----");
  for (const r of rows) {
    console.log(`  ${r.pair.padEnd(25)} | ${String(r.ratio).padStart(5)} | ${r.need}`);
  }
});
