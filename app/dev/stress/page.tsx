"use client";

import { useLayoutEffect, useState } from "react";
import { Frame, EvidenceNode } from "@/app/components/geometry";

/**
 * STRESS HARNESS — renders N evidence nodes (10 → 10,000) as SVG for manual browser
 * measurement of render/scroll performance and SVG scalability. Dev-only.
 * Measures mount time via a double-rAF after each size change.
 */
const SIZES = [10, 100, 1000, 10000];
const CELL = 34;

export default function StressPage() {
  const [n, setN] = useState(100);
  const [ms, setMs] = useState<number | null>(null);

  useLayoutEffect(() => {
    const t0 = performance.now();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setMs(+(performance.now() - t0).toFixed(1)));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [n]);

  if (process.env.NODE_ENV === "production") return <main className="p-6 text-fg">Not available in production.</main>;

  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const w = cols * CELL;
  const h = rows * CELL;

  return (
    <main className="mx-auto min-h-screen max-w-[1100px] bg-substrate p-6 text-bone">
      <h1 className="font-mono text-sm uppercase tracking-[0.14em]">SVG stress · {n.toLocaleString()} evidence nodes</h1>
      <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-xs">
        {SIZES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setMs(null); setN(s); }}
            className={`focus-ring rounded-panel border px-3 py-1 uppercase tracking-[0.1em] ${n === s ? "border-nominal text-nominal" : "border-graticule hover:border-bone-muted"}`}
          >
            {s.toLocaleString()}
          </button>
        ))}
        <span aria-live="polite" className="text-bone-muted">
          {ms == null ? "measuring…" : `~${ms}ms to first paint · ${cols}×${rows} grid`}
        </span>
        {n >= 10000 && <span className="text-advisory">large DOM — expected to stress the browser</span>}
      </div>

      <div className="mt-4 overflow-auto rounded-panel border border-graticule">
        <Frame width={w} height={h} role="img" aria-label={`${n} evidence nodes`} style={{ width: "100%", height: "auto" }} className="text-bone">
          {Array.from({ length: n }, (_, i) => (
            <EvidenceNode key={i} cx={(i % cols) * CELL + CELL / 2} cy={Math.floor(i / cols) * CELL + CELL / 2} w={24} h={18} notch={5} />
          ))}
        </Frame>
      </div>
    </main>
  );
}
