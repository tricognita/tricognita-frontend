"use client";

import useSWR from "swr";
import type { FinOpsSummary, FinOpsFinding } from "@/lib/aria-types";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";

const fetcher = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r.json(); };

const FINDING_LABELS: Record<FinOpsFinding["finding_type"], string> = {
  zombie: "Zombie",
  spot_candidate: "Spot",
  overprovisioned: "Rightsize",
};

const FINDING_BADGE: Record<FinOpsFinding["finding_type"], string> = {
  zombie: "bg-red-900/40 text-red-300 border-red-700/50",
  spot_candidate: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  overprovisioned: "bg-amber-900/40 text-amber-300 border-amber-700/50",
};

interface Props {
  onTerminate: (id: string) => Promise<void>;
}

export function FinOpsAgent({ onTerminate }: Props) {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewFinOps");

  // Gate: null key = no fetch for roles lacking viewFinOps
  const { data: summary } = useSWR<FinOpsSummary>(
    swrKey(hasAccess, "/api/aria/finops/summary"),
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  const { data: findings } = useSWR<FinOpsFinding[]>(
    swrKey(hasAccess, "/api/aria/finops/findings?limit=20"),
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // No access: return null — this component is only rendered inside an admin-gated
  // ARIADashboard, so null is appropriate (parent handles the placeholder UX)
  if (!hasAccess) return null;

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Zombies", value: summary?.zombie_count ?? "—" },
          { label: "Spot Candidates", value: summary?.spot_candidates ?? "—" },
          { label: "Rightsize", value: summary?.rightsize_count ?? "—" },
          {
            label: "Est. Savings",
            value: typeof summary?.estimated_savings_usd === "number" ? `$${summary.estimated_savings_usd.toLocaleString()}` : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-lg font-bold text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Findings table */}
      {findings && findings.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-xs text-zinc-300">
            <thead>
              <tr className="bg-zinc-900 text-zinc-500 uppercase text-left">
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Savings</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {findings.map((f) => (
                <tr key={f.id} className="hover:bg-zinc-900/60">
                  <td className="px-3 py-2">
                    <span className={`rounded border px-1.5 py-0.5 text-xs font-semibold ${FINDING_BADGE[f.finding_type]}`}>
                      {FINDING_LABELS[f.finding_type]}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <span className="block truncate font-mono" title={f.resource_arn}>
                      {f.resource_arn.length > 36 ? `…${f.resource_arn.slice(-33)}` : f.resource_arn}
                    </span>
                    <span className="text-zinc-500">{f.resource_type}</span>
                  </td>
                  <td className="px-3 py-2 text-green-400">
                    {f.estimated_savings_usd != null ? `$${f.estimated_savings_usd.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{f.status}</td>
                  <td className="px-3 py-2">
                    {f.finding_type === "zombie" && f.status === "open" && (
                      <button
                        onClick={() => onTerminate(f.id)}
                        className="rounded bg-red-900/40 border border-red-700/50 px-2 py-0.5 text-xs text-red-300 hover:bg-red-800/60 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Terminate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No findings.</p>
      )}
    </div>
  );
}
