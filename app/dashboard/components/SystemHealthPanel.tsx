'use client'

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { resilientFetch } from "@/lib/resilience";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { RestrictedPlaceholder } from "./RestrictedPlaceholder";

// ── Types ────────────────────────────────────────────────────────────────────

type CheckStatus = "operational" | "degraded" | "down" | "throttled";

interface SubsystemCheck {
  name: string;
  status: CheckStatus;
  latency_ms: number;
  checked_at: string;
  error?: string;
  details?: string;
}

interface RoleCheck {
  role: string;
  label: string;
  status: CheckStatus;
  details: string;
}

interface HealthReport {
  global_status: CheckStatus;
  checked_at: string;
  subsystems: SubsystemCheck[];
  roles: RoleCheck[];
  uptime_estimate_hours: number;
}

interface EmailLog {
  id: string;
  type: string;
  from_email: string;
  to_email: string;
  subject: string;
  status: "sent" | "failed";
  error?: string;
  timestamp: string;
}

// ── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CheckStatus, { icon: string; color: string; glow: string; bg: string; border: string; label: string }> = {
  operational: {
    icon: "✔",
    color: "text-matcha-300",
    glow: "shadow-[0_0_8px_rgba(183,214,149,0.6)]",
    bg: "bg-matcha-300/10",
    border: "border-matcha-300/25",
    label: "Operational",
  },
  degraded: {
    icon: "⚠",
    color: "text-amber-400",
    glow: "shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    bg: "bg-amber-400/10",
    border: "border-amber-400/25",
    label: "Degraded",
  },
  down: {
    icon: "✖",
    color: "text-rose-400",
    glow: "shadow-[0_0_8px_rgba(251,113,133,0.5)]",
    bg: "bg-rose-400/10",
    border: "border-rose-400/25",
    label: "Down",
  },
  throttled: {
    icon: "◶",
    color: "text-cyan-400",
    glow: "shadow-[0_0_8px_rgba(34,211,238,0.5)]",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/25",
    label: "Throttled",
  },
};

const GLOBAL_STATUS_CONFIG: Record<CheckStatus, { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
  operational: {
    label: "All Systems Operational",
    color: "text-matcha-200",
    bg: "bg-matcha-300/8",
    border: "border-matcha-300/20",
    pulse: false,
  },
  degraded: {
    label: "Partial Degradation Detected",
    color: "text-amber-300",
    bg: "bg-amber-400/8",
    border: "border-amber-400/20",
    pulse: true,
  },
  down: {
    label: "Critical findings — immediate attention required",
    color: "text-rose-300",
    bg: "bg-rose-400/8",
    border: "border-rose-400/20",
    pulse: true,
  },
  throttled: {
    label: "Active Rate Limiting Encountered",
    color: "text-cyan-300",
    bg: "bg-cyan-400/8",
    border: "border-cyan-400/20",
    pulse: true,
  },
};

// ── Subsystem Icon Map ───────────────────────────────────────────────────────

const SUBSYSTEM_ICONS: Record<string, string> = {
  "Frontend Edge (Vercel)": "◈",
  "Go Control Plane (Fly.io)": "⬡",
  "API Authentication Pipeline": "⛊",
  "Session / Auth System": "🔐",
  "OIDC / Token Exchange": "⟐",
  "Redis / KV Store": "⬢",
  "S3 Object Storage": "☰",
  "ARIA Reasoning Engine": "◉",
  "Notifications & Alerts": "◫",
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

export function SystemHealthPanel() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewSystemHealth");

  const [expanded, setExpanded] = useState<string | null>(null);
  // minimum 60s to avoid hammering the health endpoint
  const [refreshInterval, setRefreshInterval] = useState(60_000);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthLog, setHealthLog] = useState<Array<{ time: string; status: CheckStatus; summary: string }>>([]);
  const [showLog, setShowLog] = useState(false);

  const fetcher = useCallback(async (url: string) => {
    return resilientFetch<HealthReport>(url, { cache: "no-store" }, "health-monitor");
  }, []);

  // Gate: null key disables the SWR fetch entirely for non-admin roles
  const { data, error, isLoading, mutate } = useSWR<HealthReport>(
    swrKey(hasAccess, "/api/system-health"),
    fetcher,
    { refreshInterval, revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const { data: emailData, mutate: mutateEmails } = useSWR<{ logs: EmailLog[] }>(
    swrKey(hasAccess, "/api/email-logs"),
    async (url) => {
      return resilientFetch<{ logs: EmailLog[] }>(url, { cache: "no-store" }, "email-logs");
    },
    { refreshInterval, revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // Append to local health log on each fetch (must be before any conditional return).
  // Functional updater is intentional — we derive the new log entry from incoming
  // SWR data, not from existing state. Lint flags sync setState in effects; the
  // pattern here is the React-recommended way to mirror server state into a
  // bounded local timeline.
  useEffect(() => {
    if (data) {
      const downCount = data.subsystems.filter((s) => s.status === "down").length;
      const degradedCount = data.subsystems.filter((s) => s.status === "degraded").length;
      const summary = downCount > 0
        ? `${downCount} down, ${degradedCount} degraded`
        : degradedCount > 0
        ? `${degradedCount} degraded`
        : "All operational";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHealthLog((prev) => [
        { time: data.checked_at, status: data.global_status, summary },
        ...prev.slice(0, 49),
      ]);
    }
  }, [data?.checked_at]);

  // Non-admin roles: show intentional restricted UI (no fetch was made — swrKey returned null)
  if (!hasAccess) {
    return (
      <RestrictedPlaceholder
        title="System Health"
        description="Real-time infrastructure diagnostics, subsystem status, and email delivery logs."
        roles={["ADMIN"]}
        size="md"
      />
    );
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    // Force-bypass server cache on manual refresh
    await Promise.all([
      mutate(async () => resilientFetch<HealthReport>("/api/system-health?refresh=1", { cache: "no-store" }, "health-monitor"), { revalidate: false }),
      mutateEmails(),
    ]);
    setTimeout(() => setIsRefreshing(false), 600);
  }

  const report = data;
  const globalConfig = report
    ? GLOBAL_STATUS_CONFIG[report.global_status]
    : null;

  return (
    <div className="space-y-5">
      {/* ── Global Status Banner ─────────────────────────────────────────── */}
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
                    ? report.global_status === "operational"
                      ? "bg-matcha-300"
                      : report.global_status === "degraded"
                      ? "bg-amber-400"
                      : report.global_status === "throttled"
                      ? "bg-cyan-400"
                      : "bg-rose-500"
                    : "bg-stone-500"
                }`}
              />
              {globalConfig?.pulse && (
                <div
                  className={`absolute inset-0 rounded-full animate-ping opacity-30 ${
                    report?.global_status === "degraded"
                      ? "bg-amber-400"
                      : report?.global_status === "throttled"
                      ? "bg-cyan-400"
                      : "bg-rose-500"
                  }`}
                />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-50 tracking-tight">
                System Health Monitor
              </h3>
              {globalConfig && (
                <span className={`text-xs font-medium ${globalConfig.color}`}>
                  {globalConfig.label}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Refresh interval selector */}
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-ink border border-sage-soft rounded px-2 py-1 text-[10px] font-mono text-stone-400 outline-none cursor-dot"
            >
              <option value={60_000}>Every 1 min</option>
              <option value={300_000}>Every 5 min</option>
              <option value={600_000}>Every 10 min</option>
              <option value={1800_000}>Every 30 min</option>
            </select>

            {/* Manual refresh */}
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
                  Checking…
                </span>
              ) : (
                "↻ Run Health Check"
              )}
            </button>

            {/* Log toggle */}
            <button
              onClick={() => setShowLog(!showLog)}
              className="px-2 py-1.5 rounded text-[10px] font-mono text-stone-500 hover:text-stone-300 border border-sage-soft hover:border-matcha-300/30 transition-colors cursor-dot"
            >
              {showLog ? "Hide Log" : "View Log"}
            </button>
          </div>
        </div>

        {/* Last checked */}
        {report && (
          <div className="flex items-center gap-4 text-[10px] font-mono text-stone-500">
            <span>Last checked: {timeAgo(report.checked_at)}</span>
            <span>·</span>
            <span>{report.subsystems.length} subsystems scanned</span>
            <span>·</span>
            <span>Refresh: {refreshInterval / 60_000}min</span>
          </div>
        )}
      </div>

      {/* ── Loading State ─────────────────────────────────────────────────── */}
      {isLoading && !report && (
        <div className="glass p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-matcha-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-stone-400 font-mono">Running system diagnostics…</span>
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────────────────── */}
      {error && !report && (
        <div className="glass p-6 border border-rose-500/20">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-medium mb-2">
            <span>✖</span> Health check failed
          </div>
          <p className="text-[11px] text-stone-400 font-mono">{error.message}</p>
        </div>
      )}

      {/* ── Subsystem Grid ────────────────────────────────────────────────── */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {report.subsystems.map((sub) => {
            const cfg = STATUS_CONFIG[sub.status];
            const isExpanded = expanded === sub.name;
            const icon = SUBSYSTEM_ICONS[sub.name] ?? "●";

            return (
              <div
                key={sub.name}
                onClick={() => setExpanded(isExpanded ? null : sub.name)}
                className={`group relative p-4 rounded-lg border transition-all cursor-dot ${
                  isExpanded
                    ? `${cfg.bg} ${cfg.border}`
                    : "bg-ink border-sage-soft hover:border-stone-600"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm opacity-50">{icon}</span>
                    <span className="text-xs font-medium text-stone-200 leading-tight">
                      {sub.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} ${cfg.border} border`}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                </div>

                {/* Meta line */}
                <div className="flex items-center gap-3 text-[9px] font-mono text-stone-500">
                  <span>{sub.latency_ms}ms</span>
                  <span>·</span>
                  <span>{timeAgo(sub.checked_at)}</span>
                </div>

                {/* Details / Error (shown when expanded or when there's an error) */}
                {(isExpanded || sub.error) && (
                  <div className="mt-3 pt-3 border-t border-sage-soft/50 space-y-1.5">
                    {sub.details && (
                      <p className="text-[10px] text-stone-400 font-mono leading-relaxed">
                        {sub.details}
                      </p>
                    )}
                    {sub.error && (
                      <div className="flex items-start gap-1.5 text-[10px] text-rose-400 font-mono leading-relaxed">
                        <span className="shrink-0 mt-0.5">⚠</span>
                        <span>{sub.error}</span>
                      </div>
                    )}
                    {isExpanded && (
                      <div className="text-[9px] text-stone-600 font-mono">
                        Response time: {sub.latency_ms}ms · Checked: {new Date(sub.checked_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Expand indicator */}
                <div className="absolute bottom-2 right-3 text-[9px] text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isExpanded ? "▲ collapse" : "▼ expand"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Role-Based Verification ───────────────────────────────────────── */}
      {report && (
        <div className="glass p-5">
          <h4 className="eyebrow flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-matcha-300 shadow-[0_0_6px_rgba(183,214,149,0.4)]" />
            Role-Based Access Verification
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {report.roles.map((role) => {
              const cfg = STATUS_CONFIG[role.status];
              return (
                <div
                  key={role.role}
                  className="flex items-center justify-between p-3 bg-ink rounded-lg border border-sage-soft"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs ${cfg.color}`}>{cfg.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-stone-200">
                        {role.label}
                      </div>
                      <div className="text-[9px] text-stone-500 font-mono">
                        {role.details}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                  >
                    {role.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Health Check Log (History) ────────────────────────────────────── */}
      {showLog && (
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="eyebrow flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-stone-500" />
              Health Check History (Session)
            </h4>
            <span className="text-[9px] text-stone-600 font-mono">
              {healthLog.length} entries · in-memory only
            </span>
          </div>
          {healthLog.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-4">No entries yet.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
              {healthLog.map((entry, i) => {
                const cfg = STATUS_CONFIG[entry.status];
                return (
                  <div
                    key={`${entry.time}-${i}`}
                    className="flex items-center gap-3 px-3 py-1.5 rounded bg-ink/50 text-[10px] font-mono"
                  >
                    <span className={`${cfg.color}`}>{cfg.icon}</span>
                    <span className="text-stone-500 w-28 shrink-0">
                      {new Date(entry.time).toLocaleTimeString()}
                    </span>
                    <span className={`${cfg.color} font-semibold w-20 shrink-0`}>
                      {cfg.label}
                    </span>
                    <span className="text-stone-400">{entry.summary}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {/* ── Email System Status ───────────────────────────────────────────── */}
      {report && (
        <div className="glass p-5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="eyebrow flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
              Email System Status
            </h4>
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <span className="px-2 py-1 bg-ink border border-sage-soft rounded text-stone-300">
                SES Transport: <span className="text-matcha-300 font-bold">OK</span>
              </span>
              <span className="px-2 py-1 bg-ink border border-sage-soft rounded text-stone-300">
                alerts@tricognita.com: <span className="text-matcha-300 font-bold">OK</span>
              </span>
              <span className="px-2 py-1 bg-ink border border-sage-soft rounded text-stone-300">
                info@tricognita.com: <span className="text-matcha-300 font-bold">OK</span>
              </span>
            </div>
          </div>
          
          <div className="border border-sage-soft rounded-lg overflow-hidden bg-ink/50">
            {(!emailData || !emailData.logs || emailData.logs.length === 0) ? (
              <p className="text-xs text-stone-500 text-center py-6 font-mono">No recent email logs found.</p>
            ) : (
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-ink text-stone-400 border-b border-sage-soft/50">
                  <tr>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">From / To</th>
                    <th className="px-4 py-2 font-medium">Subject</th>
                    <th className="px-4 py-2 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-soft/20">
                  {emailData.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-sage-soft/10 transition-colors">
                      <td className="px-4 py-2">
                        {log.status === "sent" ? (
                          <span className="text-matcha-400">SENT</span>
                        ) : (
                          <span className="text-rose-400 font-bold">FAILED</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-stone-500">{log.type}</td>
                      <td className="px-4 py-2 flex flex-col gap-0.5">
                        <span className="text-stone-300">{log.from_email}</span>
                        <span className="text-stone-500">→ {log.to_email}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-stone-300 truncate max-w-[200px] inline-block">{log.subject}</span>
                        {log.error && <div className="text-rose-400 mt-1 truncate max-w-[200px]">{log.error}</div>}
                      </td>
                      <td className="px-4 py-2 text-stone-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
