'use client'

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { RestrictedPlaceholder } from "./RestrictedPlaceholder";

// ── Types ────────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "success" | "error";

interface FlowStep {
  name: string;
  status: StepStatus;
  latency_ms: number;
  details?: string;
  error?: string;
}

interface RoleFlowResult {
  role: string;
  email: string;
  global_status: "success" | "degraded" | "failed";
  steps: FlowStep[];
  total_latency_ms: number;
}

interface E2EReport {
  ran_at: string;
  mode: "full" | "internal" | "tenant";
  flows: RoleFlowResult[];
  overall_status: "operational" | "partial_failure" | "critical_failure";
}

// ── Status Helpers ───────────────────────────────────────────────────────────

const STEP_ICONS: Record<StepStatus, string> = {
  pending: "⏳",
  success: "✔",
  error: "✖",
};

const STEP_COLORS: Record<StepStatus, string> = {
  pending: "text-stone-500",
  success: "text-matcha-300",
  error: "text-rose-400",
};

const OVERALL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
  operational: {
    label: "All Checks Passed",
    color: "text-matcha-200",
    bg: "bg-matcha-300/8",
    border: "border-matcha-300/20",
    pulse: false,
  },
  partial_failure: {
    label: "Partial Check Failure",
    color: "text-amber-300",
    bg: "bg-amber-400/8",
    border: "border-amber-400/20",
    pulse: true,
  },
  critical_failure: {
    label: "Critical Failure — All Checks Broken",
    color: "text-rose-300",
    bg: "bg-rose-400/8",
    border: "border-rose-400/20",
    pulse: true,
  },
};

// ── Mode display labels (CLIENT-safe terminology) ─────────────────────────────

const MODE_LABELS: Record<string, { title: string; subtitle: string }> = {
  full:     { title: "End-to-End System Verification", subtitle: "Full infrastructure + auth + data plane" },
  internal: { title: "Internal Service Verification",  subtitle: "Internal control plane checks" },
  tenant:   { title: "Environment Verification",       subtitle: "Your environment posture and compliance" },
};

// ── Time Formatting ──────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 1000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3600_000)}h ago`;
}

// ── Component ────────────────────────────────────────────────────────────────

export function E2EVerificationPanel() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewSystemHealth");

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<E2EReport>;
  }, []);

  // Gate: null key = no fetch for roles without access
  const { data, error, isLoading, mutate } = useSWR<E2EReport>(
    swrKey(hasAccess, "/api/system-health/e2e"),
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 600_000 }
  );

  // Roles without any access get a clear restricted message
  if (!hasAccess) {
    return (
      <RestrictedPlaceholder
        title="System Verification"
        description="Automated verification of your security environment."
        roles={["ADMIN", "SECOPS", "DEVSECOPS", "SOC_LEAD"]}
        size="sm"
      />
    );
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await mutate(
      async () => {
        const r = await fetch("/api/system-health/e2e?refresh=1", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<E2EReport>;
      },
      { revalidate: false },
    );
    setTimeout(() => setIsRefreshing(false), 600);
  }

  const report = data;
  const globalConfig = report ? OVERALL_CONFIG[report.overall_status] : null;
  const modeConfig = report ? MODE_LABELS[report.mode] : MODE_LABELS["full"];

  // CLIENT/VIEWER/AUDITOR label overrides (no infra language)
  const isClientMode = report?.mode === "tenant";
  const runBtnLabel = isClientMode ? "▶ Check Environment" : "▶ Run System Check";
  const subLabel = isClientMode ? "Environment posture and compliance checks" : "End-to-end frontend-to-backend service verification";

  return (
    <div className="space-y-5">
      {/* ── Global Header ─────────────────────────────────────────────────── */}
      <div
        className={`rounded-xl border p-5 transition-all ${
          globalConfig
            ? `${globalConfig.bg} ${globalConfig.border}`
            : "bg-ink border-sage-soft"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Animated status orb */}
            <div className="relative">
              <div
                className={`w-3.5 h-3.5 rounded-full transition-colors ${
                  report
                    ? report.overall_status === "operational"
                      ? "bg-matcha-300"
                      : report.overall_status === "partial_failure"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                    : "bg-stone-500"
                }`}
              />
              {globalConfig?.pulse && (
                <div
                  className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                    report?.overall_status === "partial_failure"
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-50 tracking-tight">
                {modeConfig.title}
              </h3>
              {globalConfig && (
                <span className={`text-xs font-medium ${globalConfig.color}`}>
                  {globalConfig.label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold font-mono border transition-all cursor-dot ${
                isRefreshing
                  ? "border-matcha-300/30 text-matcha-300 bg-matcha-300/10"
                  : "border-sage-soft text-stone-300 hover:border-matcha-300/30 hover:text-matcha-300 hover:bg-matcha-300/5"
              }`}
            >
              {isRefreshing ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-matcha-300 border-t-transparent rounded-full animate-spin" />
                  Running...
                </span>
              ) : (
                runBtnLabel
              )}
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-stone-500">
          {report ? (
            <>
              <span>Last verified: {timeAgo(report.ran_at)}</span>
              <span>·</span>
              <span>{subLabel}</span>
              {/* Only show mode badge to non-client roles */}
              {!isClientMode && (
                <>
                  <span>·</span>
                  <span className="text-matcha-300/60">{report.mode} mode</span>
                </>
              )}
            </>
          ) : (
            <span>{modeConfig.subtitle}</span>
          )}
        </div>
      </div>

      {/* ── Loading State ─────────────────────────────────────────────────── */}
      {isLoading && !report && (
        <div className="glass p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-matcha-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-stone-400 font-mono">Running verification…</span>
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────────────────── */}
      {error && !report && (
        <div className="glass p-6 border border-rose-500/20">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-medium mb-2">
            <span>✖</span> Verification failed to start
          </div>
          <p className="text-[11px] text-stone-400 font-mono">{error.message}</p>
        </div>
      )}

      {/* ── Flow Results ─────────────────────────────────────────────────── */}
      {report && (
        <div className={`grid grid-cols-1 ${report.flows.length > 1 ? "md:grid-cols-3" : "md:grid-cols-1"} gap-4`}>
          {report.flows.map((flow) => {
            const isSuccess = flow.global_status === "success";

            return (
              <div
                key={flow.role}
                className={`group relative p-4 rounded-lg border transition-all ${
                  isSuccess ? "bg-ink border-sage-soft" : "bg-rose-950/20 border-rose-500/30"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isSuccess ? "text-matcha-400" : "text-rose-400"}`}>
                        {isSuccess ? "✔" : "✖"}
                      </span>
                      <h4 className="text-sm font-medium text-stone-200">
                        {/* CLIENT-safe title */}
                        {isClientMode ? "Environment Check" : `${flow.role} Flow`}
                      </h4>
                    </div>
                    {/* Only show email to ADMIN/SECOPS */}
                    {!isClientMode && (
                      <div className="text-[9px] text-stone-500 font-mono mt-1">{flow.email}</div>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-stone-400">
                    {flow.total_latency_ms}ms
                  </div>
                </div>

                {/* Steps Checklist */}
                <div className="space-y-2">
                  {flow.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={`text-[10px] mt-0.5 ${STEP_COLORS[step.status]}`}>
                        {STEP_ICONS[step.status]}
                      </span>
                      <div>
                        <div className="text-xs text-stone-300">{step.name}</div>
                        {step.details && !step.error && (
                          <div className="text-[9px] text-stone-500 font-mono">{step.details} ({step.latency_ms}ms)</div>
                        )}
                        {step.error && (
                          <div className="text-[9px] text-rose-400 font-mono mt-0.5">{step.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
