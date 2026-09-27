"use client";

import {
  BarChart, Bar, XAxis, YAxis, ReferenceLine,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props { shap: Record<string, number> }

export function SHAPExplainer({ shap }: Props) {
  const entries = Object.entries(shap)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 8)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(4)) }));

  return (
    <div className="w-full">
      <p className="text-xs text-zinc-400 mb-2 font-semibold uppercase tracking-wide">SHAP Feature Attribution</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={entries} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "#a1a1aa" }} />
          <ReferenceLine x={0} stroke="#52525b" />
          <Tooltip
            formatter={(v) => {
              const n = Number(v) || 0;
              return [`${n > 0 ? "+" : ""}${n.toFixed(3)}`];
            }}
            contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 11 }}
          />
          <Bar dataKey="value" radius={[0, 2, 2, 0]}>
            {entries.map((e, i) => (
              <Cell key={i} fill={e.value >= 0 ? "#ef4444" : "#22c55e"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
