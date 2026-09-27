"use client";

import type { ReasoningStep } from "@/lib/aria-types";

const TOOL_ICON: Record<string, string> = {
  query_cw_logs: "📊",
  get_xray_service_map: "🗺️",
  retrieve_incident_kb: "📚",
};

interface Props { steps: ReasoningStep[]; rootCause: string }

export function ReActStepTrace({ steps, rootCause }: Props) {
  return (
    <div className="space-y-1">
      {steps.map((s) => (
        <details key={s.step_index} className="group rounded border border-zinc-800 bg-zinc-900">
          <summary className="cursor-pointer select-none px-3 py-2 text-sm text-zinc-300 list-none flex items-center gap-2">
            <span className="text-zinc-500 font-mono text-xs">Step {s.step_index}</span>
            <span>{TOOL_ICON[s.action] ?? "⚙️"}</span>
            <span className="font-medium">{s.action}</span>
          </summary>
          <div className="px-3 pb-3 space-y-2">
            {s.thought && (
              <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-words">
                <span className="text-zinc-500">Thought: </span>{s.thought}
              </pre>
            )}
            {s.action_input && (
              <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-words">
                <span className="text-zinc-500">Input: </span>{s.action_input}
              </pre>
            )}
            {s.observation && (
              <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap break-words">
                <span className="text-zinc-500">Obs: </span>{s.observation}
              </pre>
            )}
          </div>
        </details>
      ))}
      {rootCause && (
        <p className="mt-2 rounded bg-amber-950/40 border border-amber-700/50 px-3 py-2 text-sm text-amber-300 font-medium">
          Root Cause: {rootCause}
        </p>
      )}
    </div>
  );
}
