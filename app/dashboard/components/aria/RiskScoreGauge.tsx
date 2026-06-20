"use client";

interface Props { score: number }

export function RiskScoreGauge({ score }: Props) {
  const clamped = Math.max(0, Math.min(1, score));
  const cx = 80, cy = 80, r = 60;
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalAngle = Math.PI; // 180°

  function polar(angle: number) {
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  }

  function arcPath(a1: number, a2: number) {
    const s = polar(a1), e = polar(a2);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
  }

  const needleAngle = Math.PI - clamped * Math.PI;
  const needle = polar(needleAngle);

  const label = clamped >= 0.75 ? "CRITICAL" : clamped >= 0.5 ? "WATCH" : "NOMINAL";
  const labelColor = clamped >= 0.75 ? "#ef4444" : clamped >= 0.5 ? "#f59e0b" : "#22c55e";

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={100} aria-label={`Risk score ${(clamped * 100).toFixed(0)}%`}>
        {/* Green band 0–0.5 */}
        <path d={arcPath(Math.PI, Math.PI * 0.5)} stroke="#22c55e" strokeWidth={10} fill="none" />
        {/* Amber band 0.5–0.75 */}
        <path d={arcPath(Math.PI * 0.5, Math.PI * 0.25)} stroke="#f59e0b" strokeWidth={10} fill="none" />
        {/* Red band 0.75–1 */}
        <path d={arcPath(Math.PI * 0.25, 0)} stroke="#ef4444" strokeWidth={10} fill="none" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke="#e4e4e7" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#e4e4e7" />
      </svg>
      <span className="text-2xl font-bold text-zinc-100">{(clamped * 100).toFixed(0)}%</span>
      <span className="text-xs font-semibold mt-1" style={{ color: labelColor }}>{label}</span>
    </div>
  );
}
