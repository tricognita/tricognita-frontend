"use client";

import { useMemo } from "react";

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
  label?: string;
}

interface Props {
  cells: HeatmapCell[];
  rows: string[];
  cols: string[];
  title?: string;
  caption?: string;
}

function heatColor(value: number, max: number): string {
  if (value === 0) return "#18181b";
  const ratio = max === 0 ? 0 : Math.min(1, value / max);
  if (ratio < 0.2) return "rgba(52,211,153,0.25)";
  if (ratio < 0.4) return "rgba(251,191,36,0.35)";
  if (ratio < 0.7) return "rgba(251,146,60,0.55)";
  return "rgba(239,68,68,0.75)";
}

export function ThreatHeatmap({ cells, rows, cols, title = "Threat Heatmap", caption }: Props) {
  const { grid, max } = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    let m = 0;
    for (const c of cells) {
      map.set(`${c.row}::${c.col}`, c);
      if (c.value > m) m = c.value;
    }
    return { grid: map, max: m };
  }, [cells]);

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        {caption && <p className="text-xs text-zinc-500">{caption}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: "4px" }}>
          <thead>
            <tr>
              <th className="w-24" />
              {cols.map((col) => (
                <th
                  key={col}
                  className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium pb-2 text-center"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th className="text-[11px] font-medium text-zinc-400 text-left pr-3 whitespace-nowrap">
                  {row}
                </th>
                {cols.map((col) => {
                  const cell = grid.get(`${row}::${col}`);
                  const value = cell?.value ?? 0;
                  const bg = heatColor(value, max);
                  const textClass = value >= max * 0.4 ? "text-zinc-50" : value > 0 ? "text-zinc-300" : "text-zinc-700";
                  return (
                    <td
                      key={col}
                      className={`h-10 min-w-[40px] text-center text-xs font-semibold tabular-nums rounded border border-zinc-800/40 ${textClass}`}
                      style={{ backgroundColor: bg }}
                      title={cell?.label ?? `${row} · ${col}: ${value}`}
                    >
                      {value === 0 ? "" : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-4 text-[10px] text-zinc-500">
        <span>Low</span>
        <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-emerald-500/30 via-amber-500/50 to-red-500/70" />
        <span>Critical</span>
      </div>
    </div>
  );
}
