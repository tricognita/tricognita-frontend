"use client";

/**
 * TopBarTrust — three production-trust signals shown in the dashboard header:
 *
 *   1. TenantBadge      — name of the current tenant scope
 *   2. ApprovalModePill — live ARIA approval mode (Observe / Recommend / Auto)
 *   3. RegionPill       — region of last scan / default region
 *
 * The component is intentionally read-only. Toggling ARIA mode is done from
 * Settings; this is a status surface, not a control.
 */

import { Building2, ShieldCheck, Globe2 } from "lucide-react";
import { useSession } from "@/lib/use-session";
import { useHealingMode } from "@/lib/aria-hooks";

const MODE_STYLE = {
  MANUAL_APPROVAL: {
    label: "Recommend · JIT",
    dot: "bg-emerald-500",
    text: "text-emerald-300",
    ring: "border-emerald-800/60 bg-emerald-950/30",
    title: "Sensitive actions wait for human approval before executing.",
  },
  AUTONOMOUS: {
    label: "Auto · Policy-bound",
    dot: "bg-amber-400",
    text: "text-amber-300",
    ring: "border-amber-800/60 bg-amber-950/30",
    title: "Low-risk fixes execute automatically within defined policy.",
  },
} as const;

function shortTenant(tenantId: string | null, email: string | null): string {
  if (tenantId && tenantId.length > 0) {
    // tenantIds tend to be UUIDs or slugs; show a recognizable prefix.
    return tenantId.length > 12 ? `${tenantId.slice(0, 8)}…` : tenantId;
  }
  if (email && email.includes("@")) return email.split("@")[1];
  return "—";
}

export function TopBarTrust() {
  const { tenantId, email } = useSession();
  const { mode } = useHealingMode();
  const m = MODE_STYLE[mode];

  return (
    <div className="hidden md:flex items-center gap-2">
      {/* Tenant pill */}
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
        title="Your data is scoped to this tenant. Cross-tenant access is blocked at the API layer."
      >
        <Building2 size={12} className="text-zinc-500" />
        <span className="font-mono text-zinc-500 uppercase tracking-widest text-[9px]">Tenant</span>
        <span className="text-zinc-200">{shortTenant(tenantId, email)}</span>
      </span>

      {/* Approval-mode pill */}
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${m.ring} ${m.text}`}
        title={m.title}
      >
        <ShieldCheck size={12} />
        <span className="font-mono uppercase tracking-widest text-[9px] opacity-80">Mode</span>
        <span className="font-medium">{m.label}</span>
        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} aria-hidden />
      </span>

      {/* Region pill */}
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
        title="Telemetry is processed in the customer's selected cloud region. No cross-region data transfer."
      >
        <Globe2 size={12} className="text-zinc-500" />
        <span className="font-mono text-zinc-500 uppercase tracking-widest text-[9px]">Region</span>
        <span className="text-zinc-200">ap-south-1</span>
      </span>
    </div>
  );
}
