"use client";

import useSWR from "swr";
import Link from "next/link";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
};

export default function GuardPoliciesPage() {
  const { role, isLoading } = useSession();
  const hasAccess = canDo(role, "managePolicies");

  const { data, error } = useSWR(
    swrKey(hasAccess, "/api/guard/policies"),
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );
  const policies = data?.policies ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8">
      <header className="flex flex-col gap-6">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/guard" className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Guard Policies
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1 ml-8">Rules engine governing AI interactions and PII detection.</p>
        </div>
      </header>

      <main className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Active Policies</h2>
          <button className="px-3 py-1.5 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors">
            + New Policy
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {policies.map((policy: any) => (
            <div key={policy.id} className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/30 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-white">{policy.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase
                    ${policy.action === 'BLOCK' ? 'bg-red-900/30 text-red-400 border border-red-800/50' : ''}
                    ${policy.action === 'WARN' ? 'bg-amber-900/30 text-amber-400 border border-amber-800/50' : ''}
                    ${policy.action === 'REDACT' ? 'bg-orange-900/30 text-orange-400 border border-orange-800/50' : ''}
                    ${policy.action === 'ALLOW' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : ''}
                  `}>
                    {policy.action}
                  </span>
                  {!policy.enabled && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400">DISABLED</span>
                  )}
                </div>
                <div className="space-y-1">
                  {policy.conditions.pii_types && policy.conditions.pii_types.length > 0 && (
                    <p className="text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-300">If PII detects:</span> {policy.conditions.pii_types.join(", ")}
                    </p>
                  )}
                  {policy.conditions.user_roles && policy.conditions.user_roles.length > 0 && (
                    <p className="text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-300">If user role is:</span> {policy.conditions.user_roles.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-zinc-500">Pri: {policy.priority}</p>
                <button className="mt-2 text-xs text-violet-400 hover:text-violet-300">Edit</button>
              </div>
            </div>
          ))}
          {policies.length === 0 && (
            <div className="p-8 text-center border border-zinc-800 rounded-lg bg-zinc-900/20 text-zinc-500 text-sm">
              No policies configured.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
