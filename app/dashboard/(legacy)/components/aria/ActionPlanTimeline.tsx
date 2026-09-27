"use client";

import type { HealingAction, ActionStatus, HealingModeState, ARIAJob } from "@/lib/aria-types";

const STATUS_BADGE: Record<ActionStatus, string> = {
  pending_approval: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  accepted: "bg-cyan-900/40 text-cyan-300 border-cyan-700/50",
  pending: "bg-zinc-800 text-zinc-500 border-zinc-700",
  running: "bg-blue-900/40 text-blue-300 border-blue-700/50 animate-pulse",
  executing: "bg-blue-900/40 text-blue-300 border-blue-700/50 animate-pulse",
  executed: "bg-green-900/40 text-green-300 border-green-700/50",
  success: "bg-green-900/40 text-green-300 border-green-700/50",
  rolled_back: "bg-zinc-800 text-zinc-400 border-zinc-700",
  failed: "bg-red-900/40 text-red-300 border-red-700/50",
};

interface Props {
  actions: HealingAction[];
  statuses: Record<string, ActionStatus>;
  jobs: Record<string, ARIAJob>;
  mode: HealingModeState;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function ActionPlanTimeline({ actions, statuses, jobs, mode, onApprove, onReject }: Props) {
  if (!actions.length) return <p className="text-sm text-zinc-500">No actions in plan.</p>;

  return (
    <ol className="space-y-2">
      {actions.map((a) => {
        const status = statuses[a.action_id] ?? "pending_approval";
        const showApproval = status === "pending_approval" && mode === "MANUAL_APPROVAL";
        return (
          <li key={a.action_id} className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2">
            <div className="flex items-start gap-2">
              <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[status]}`}>
                {status.replace("_", " ").toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{a.action_type}</p>
                <p className="text-xs text-zinc-500 truncate" title={a.target_arn}>
                  {a.target_arn.length > 45 ? `…${a.target_arn.slice(-42)}` : a.target_arn}
                </p>
                {a.rca_narrative && (
                  <p className="mt-1 text-xs text-zinc-400">{a.rca_narrative}</p>
                )}
                {jobs[a.action_id] && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono uppercase">
                      <span>{jobs[a.action_id].status}</span>
                      <span>{jobs[a.action_id].progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 transition-all duration-500"
                        style={{ width: `${jobs[a.action_id].progress}%` }}
                      />
                    </div>
                    {jobs[a.action_id].result && (
                      <p className="text-[10px] text-cyan-400 font-mono mt-1">{jobs[a.action_id].result}</p>
                    )}
                    {jobs[a.action_id].error && (
                      <p className="text-[10px] text-rose-400 font-mono mt-1">{jobs[a.action_id].error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            {showApproval && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onApprove(a.action_id)}
                  className="rounded bg-green-700 px-3 py-1 text-xs font-semibold text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(a.action_id)}
                  className="rounded bg-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
