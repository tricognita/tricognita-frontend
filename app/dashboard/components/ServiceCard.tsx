"use client";

import Link from "next/link";

export type ServiceStatus = "ACTIVE" | "PARTIAL" | "PLANNED" | "DEGRADED";
export type ServiceCategory = "Launch" | "Red Team" | "Internal" | "Advanced" | "Multi-Cloud";

export interface ServiceDescriptor {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  status: ServiceStatus;
  ariaIntegration: "Core" | "High" | "Medium" | "Low" | "None";
  coverage: number;
  href?: string;
}

const STATUS_STYLE: Record<ServiceStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40",
  PARTIAL: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40",
  DEGRADED: "bg-red-500/15 text-red-400 ring-1 ring-red-500/40",
  PLANNED: "bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/40",
};

const ARIA_STYLE: Record<ServiceDescriptor["ariaIntegration"], string> = {
  Core: "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/50",
  High: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/30",
  Medium: "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30",
  Low: "bg-zinc-700/30 text-zinc-400 ring-1 ring-zinc-700",
  None: "bg-zinc-800/40 text-zinc-600 ring-1 ring-zinc-800",
};

function CoverageRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = clamped >= 85 ? "#34d399" : clamped >= 60 ? "#fbbf24" : clamped > 0 ? "#fb923c" : "#52525b";

  return (
    <div className="relative w-12 h-12 shrink-0" aria-label={`${clamped}% coverage`}>
      <svg width={48} height={48} className="-rotate-90">
        <circle cx={24} cy={24} r={r} stroke="#27272a" strokeWidth={4} fill="none" />
        <circle
          cx={24}
          cy={24}
          r={r}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          fill="none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-zinc-300 tabular-nums">
        {clamped}
      </span>
    </div>
  );
}

export function ServiceCard({ service }: { service: ServiceDescriptor }) {
  const isAriaPowered = service.ariaIntegration === "Core" || service.ariaIntegration === "High";
  const accentBorder = isAriaPowered ? "border-violet-700/40 hover:border-violet-600/60" : "border-zinc-800 hover:border-zinc-700";

  const inner = (
    <article
      className={`group h-full rounded-xl bg-zinc-900/70 border p-4 transition-colors ${accentBorder}`}
      aria-labelledby={`svc-${service.id}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">{service.category}</p>
          <h3 id={`svc-${service.id}`} className="text-sm font-semibold text-zinc-100 mt-0.5 truncate">
            {service.name}
          </h3>
        </div>
        <CoverageRing value={service.coverage} />
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3 mb-4">{service.description}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[service.status]}`}>
          {service.status}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ARIA_STYLE[service.ariaIntegration]}`}>
          ARIA · {service.ariaIntegration}
        </span>
        <span className="ml-auto text-[10px] font-mono text-zinc-700">{service.id}</span>
      </div>
    </article>
  );

  if (service.href) {
    return (
      <Link href={service.href} className="block focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-950 rounded-xl">
        {inner}
      </Link>
    );
  }
  return inner;
}
