"use client";

import { useEffect, useRef } from "react";
import type { HealingAction, ActionStatus, HealingModeState, RCAResult, ARIAJob } from "@/lib/aria-types";
import { RiskScoreGauge } from "./RiskScoreGauge";
import { SHAPExplainer } from "./SHAPExplainer";
import { ReActStepTrace } from "./ReActStepTrace";
import { ActionPlanTimeline } from "./ActionPlanTimeline";

interface Props {
  open: boolean;
  riskScore: number;
  shap: Record<string, number>;
  rca: RCAResult | null;
  actions: HealingAction[];
  statuses: Record<string, ActionStatus>;
  jobs: Record<string, ARIAJob>;
  mode: HealingModeState;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onClose: () => void;
}

export function IncidentDrawer({
  open, riskScore, shap, rca, actions, statuses, jobs, mode, onApprove, onReject, onClose,
}: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Incident detail"
        className="fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <span className="text-sm font-semibold text-zinc-100">Incident Analysis</span>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          <div className="flex gap-6 items-start">
            <RiskScoreGauge score={riskScore} />
            <div className="flex-1 min-w-0">
              <SHAPExplainer shap={shap} />
            </div>
          </div>

          {rca && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
                Reasoning Trace
              </p>
              <ReActStepTrace steps={rca.reasoning_steps} rootCause={rca.root_cause} />
            </section>
          )}

          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
              Action Plan
            </p>
            <ActionPlanTimeline
              actions={actions}
              statuses={statuses}
              jobs={jobs}
              mode={mode}
              onApprove={onApprove}
              onReject={onReject}
            />
          </section>
        </div>
      </div>
    </>
  );
}
