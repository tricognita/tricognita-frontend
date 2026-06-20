"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import type {
  HealingAction,
  ActionStatus,
  PredictionResult,
  RCAResult,
  ARIAJob,
} from "@/lib/aria-types";
import { useARIAStream, useHealingMode, useRCALog } from "@/lib/aria-hooks";
import { HealingMode } from "./HealingMode";
import { IncidentDrawer } from "./IncidentDrawer";
import { FinOpsAgent } from "./FinOpsAgent";
import { Shield, Activity, Search, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { emitAuditEvent } from "@/lib/audit-events";

const fetcher = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r.json(); };

export function ARIADashboard() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewAria");

  const { mode, mutateMode, isLoading: modeLoading } = useHealingMode();

  // Live stream state
  const [logs, setLogs] = useState<PredictionResult[]>([]);
  const [activeLog, setActiveLog] = useState<PredictionResult | null>(null);
  const [activeRCAId, setActiveRCAId] = useState<string | null>(null);
  const [actionStatuses, setActionStatuses] = useState<Record<string, ActionStatus>>({});
  const [activeJobs, setActiveJobs] = useState<Record<string, ARIAJob>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  const { data: rcaData } = useRCALog(activeRCAId);
  // /api/aria/actions — SECOPS-tier. null key prevents fetch for other roles.
  // SSE stream handles real-time action status updates; no polling needed.
  const { data: actions = [] } = useSWR<HealingAction[]>(
    activeRCAId && hasAccess ? `/api/aria/actions?rca_log_id=${encodeURIComponent(activeRCAId)}&limit=50` : null,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // Track in-flight job intervals so they're cleaned up on unmount
  const pollIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  // Track in-flight approve/reject to debounce spam clicks
  const actionInFlight = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      for (const id of pollIntervals.current.values()) clearInterval(id);
    };
  }, []);

  const handleEvent = useCallback((type: string, data: unknown) => {
    if (type === "prediction") {
      const pred = data as PredictionResult;
      setLogs((prev) => [...prev.slice(-49), pred]); // Keep last 50
    } else if (type === "rca_complete") {
      const rca = data as RCAResult;
      setActiveRCAId(rca.session_id);
    } else if (type === "action") {
      const row = data as { action_id: string; status: ActionStatus };
      setActionStatuses((prev) => ({ ...prev, [row.action_id]: row.status }));
    } else if (type === "mode_change") {
      // mode SWR will revalidate via useHealingMode polling
    }
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useARIAStream(handleEvent);

  const pendingCount = Object.values(actionStatuses).filter((s) => s === "pending_approval").length;

  function pollJob(jobId: string, actionId: string) {
    // Clear any existing interval for this action to avoid double-polling
    const existing = pollIntervals.current.get(actionId);
    if (existing) clearInterval(existing);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/aria/jobs/${jobId}`);
        if (!res.ok) return;
        const job: ARIAJob = await res.json();

        setActiveJobs(prev => ({ ...prev, [actionId]: job }));
        setActionStatuses(prev => ({ ...prev, [actionId]: job.status as ActionStatus }));

        if (job.status === "success" || job.status === "failed" || job.status === "rolled_back") {
          clearInterval(interval);
          pollIntervals.current.delete(actionId);
          setTimeout(() => {
            setActiveJobs(prev => {
              const next = { ...prev };
              delete next[actionId];
              return next;
            });
          }, 5000);
        }
      } catch (err) {
        console.error("Job polling failed", err);
      }
    }, 2000);

    pollIntervals.current.set(actionId, interval);
  }

  async function handleApprove(id: string) {
    if (actionInFlight.current.has(id)) return;
    actionInFlight.current.add(id);
    try {
      const res = await fetch(`/api/aria/actions/${encodeURIComponent(id)}/approve`, { method: "POST" });
      const responseData = await res.json();
      if (responseData.job_id) {
        setActionStatuses((prev) => ({ ...prev, [id]: "accepted" }));
        pollJob(responseData.job_id, id);
      } else {
        setActionStatuses((prev) => ({ ...prev, [id]: "success" }));
      }
      // Phase 7 G6 — emit operator approval audit. The Go side already
      // writes the remediation execution to audit_logs, but this client
      // event records the human-decision moment with the operator's
      // session context (vs. ARIA's autonomous decisions, which are
      // attributed differently).
      void emitAuditEvent({
        type: "remediation.approved",
        resource: id,
        metadata: { job_id: responseData.job_id ?? null },
      });
    } finally {
      actionInFlight.current.delete(id);
    }
  }

  async function handleReject(id: string) {
    if (actionInFlight.current.has(id)) return;
    actionInFlight.current.add(id);
    try {
      const res = await fetch(`/api/aria/actions/${encodeURIComponent(id)}/reject`, { method: "POST" });
      const responseData = await res.json();
      if (responseData.job_id) {
        setActionStatuses((prev) => ({ ...prev, [id]: "accepted" }));
        pollJob(responseData.job_id, id);
      } else {
        setActionStatuses((prev) => ({ ...prev, [id]: "rolled_back" }));
      }
      void emitAuditEvent({
        type: "remediation.rejected",
        resource: id,
        metadata: { job_id: responseData.job_id ?? null },
      });
    } finally {
      actionInFlight.current.delete(id);
    }
  }

  async function handleTerminate(id: string) {
    const res = await fetch(`/api/aria/finops/${encodeURIComponent(id)}/terminate`, { method: "POST" });
    const data = await res.json();
    if (data.job_id) {
      pollJob(data.job_id, id);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-900/30 border border-violet-800/50 flex items-center justify-center">
            <Activity className="text-violet-400 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              ARIA Proxy Feed
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-xs text-zinc-500">
              Live LLM Interaction Stream
            </p>
          </div>
        </div>
        <HealingMode
          mode={mode}
          pendingCount={pendingCount}
          isLoading={modeLoading}
          onChange={mutateMode}
        />
      </div>

      <div className="flex-1 min-h-[500px] flex gap-4 overflow-hidden">
        {/* Stream Pane */}
        <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl relative">
          <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-500 flex justify-between">
            <span>stdout // aria-guard-v2</span>
            <span>Intercepting prompt stream...</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm scrollbar-thin scrollbar-thumb-zinc-800">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-4">
                <ShieldAlert className="w-12 h-12" />
                <p>Waiting for LLM traffic...</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {logs.map((log, i) => {
                  const isHighRisk = log.risk_score >= 0.75;
                  const isBlocked = log.anomaly_flags.length > 0;
                  return (
                    <motion.div
                      key={log.resource_arn + i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        activeLog === log ? 'bg-zinc-800 border-zinc-600' : 
                        isBlocked ? 'bg-rose-950/20 border-rose-900/30 hover:border-rose-700/50' : 
                        'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700'
                      }`}
                      onClick={() => { setActiveLog(log); setDrawerOpen(true); }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 truncate">
                          <span className="text-xs text-zinc-500 min-w-[60px]">{new Date().toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>
                          {isBlocked ? <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          <span className={`truncate ${isBlocked ? 'text-rose-200' : 'text-zinc-300'}`}>
                            {log.resource_arn.split('/').pop() || log.resource_arn}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {isBlocked && (
                            <span className="text-[10px] uppercase bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">Redacted</span>
                          )}
                          <span className={`font-bold ${isHighRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {(log.risk_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            <div ref={feedEndRef} />
          </div>
        </div>

        {/* Inspector Pane */}
        <div className="w-1/3 min-w-[300px] flex flex-col bg-zinc-900/20 border border-zinc-800/80 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <Search className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-300">Payload Inspector</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {activeLog ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase text-zinc-500 font-bold mb-2">Event ID</h3>
                  <code className="text-xs text-violet-300 break-all">{activeLog.resource_arn}</code>
                </div>
                
                <div>
                  <h3 className="text-xs uppercase text-zinc-500 font-bold mb-2">Policy Flags</h3>
                  {activeLog.anomaly_flags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeLog.anomaly_flags.map((flag) => (
                        <span key={flag} className="px-2 py-1 bg-rose-950/40 border border-rose-800/50 rounded text-xs text-rose-300 font-mono">
                          {flag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-zinc-400">None detected.</span>
                  )}
                </div>

                <div>
                  <h3 className="text-xs uppercase text-zinc-500 font-bold mb-2">SHAP Analysis</h3>
                  <div className="space-y-2">
                    {Object.entries(activeLog.shap_vector || {}).map(([feature, weight]) => (
                      <div key={feature} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">{feature}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${weight > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(Math.abs(weight) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-zinc-500 font-mono w-8 text-right">{weight.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setDrawerOpen(true)}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600"
                >
                  View Full RCA Details
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center p-6">
                <p className="text-sm text-zinc-500">Select an event from the stream to view its payload inspector.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FinOps agent in a compact row at bottom */}
      <div className="shrink-0 pt-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Background Agents</h2>
        </div>
        <FinOpsAgent onTerminate={handleTerminate} />
      </div>

      {/* Incident drawer (RCA) */}
      <IncidentDrawer
        open={drawerOpen}
        riskScore={activeLog?.risk_score ?? 0}
        shap={activeLog?.shap_vector ?? {}}
        rca={rcaData ?? null}
        actions={actions}
        statuses={actionStatuses}
        jobs={activeJobs}
        mode={mode}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
