"use client";

/**
 * ScanProgressBar — real-time scan progress indicator.
 *
 * Real mode: polls /api/scan/status every 3s; auto-revalidates findings on complete.
 * Demo mode: driven by DemoScanState prop (client-side countdown from useDemoScan).
 * Hidden when status === "idle".
 */

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { fetcher } from "@/lib/swr-fetcher";
import { DEMO_SCAN_SERVICES } from "@/lib/demo-mode";
import { cn } from "@/lib/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanStatus {
  status: "idle" | "scanning" | "complete" | "error";
  elapsed_s: number;
  service: string | null;
  progress_pct: number;
  findings_count?: number;
  error_message?: string;
}

export interface DemoScanState {
  active: boolean;
  elapsed_s: number;
  service: string;
  progress_pct: number;
  done: boolean;
  error: boolean;
}

// ─── ScanProgressBar ──────────────────────────────────────────────────────────

interface ScanProgressBarProps {
  demoScanState?: DemoScanState;
  onScanComplete?: (findingsCount: number) => void;
}

export function ScanProgressBar({ demoScanState, onScanComplete }: ScanProgressBarProps) {
  const { mutate } = useSWRConfig();
  const prevStatusRef = useRef<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [completeFired, setCompleteFired] = useState(false);

  const { data: liveStatus } = useSWR<ScanStatus>(
    demoScanState ? null : "/api/scan/status",
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const status: ScanStatus = demoScanState
    ? {
        status: demoScanState.done ? "complete"
          : demoScanState.error ? "error"
          : demoScanState.active ? "scanning"
          : "idle",
        elapsed_s: demoScanState.elapsed_s,
        service: demoScanState.service,
        progress_pct: demoScanState.progress_pct,
      }
    : liveStatus ?? { status: "idle", elapsed_s: 0, service: null, progress_pct: 0 };

  // Live mode: trigger on real scan complete
  useEffect(() => {
    if (!liveStatus) return;
    const wasScanning = prevStatusRef.current === "scanning";
    const nowComplete = liveStatus.status === "complete";
    if (wasScanning && nowComplete) {
      mutate("/api/findings");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: effect syncs from localStorage / a one-shot scan event
      setShowComplete(true);
      onScanComplete?.(liveStatus.findings_count ?? 0);
      const t = setTimeout(() => setShowComplete(false), 5000);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = liveStatus.status;
  }, [liveStatus, mutate, onScanComplete]);

  // Demo mode: trigger on demo done
  useEffect(() => {
    if (demoScanState?.done && !completeFired) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: effect syncs from localStorage / a one-shot scan event
      setCompleteFired(true);
      mutate("/api/findings");
      setShowComplete(true);
      onScanComplete?.(23);
      const t = setTimeout(() => setShowComplete(false), 5000);
      return () => clearTimeout(t);
    }
    if (!demoScanState?.done) setCompleteFired(false);
  }, [demoScanState?.done, completeFired, mutate, onScanComplete]);

  if (status.status === "idle" && !showComplete) return null;

  const isScanning = status.status === "scanning";
  const isError = status.status === "error";
  const isComplete = status.status === "complete" || showComplete;
  const progressPct = isComplete ? 100 : Math.min(status.progress_pct, 99);

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 transition-all duration-300",
        isError ? "bg-red-900/20 border-red-700/40"
          : isComplete ? "bg-[var(--matcha-900)]/30 border-[var(--matcha-700)]/50"
          : "bg-[var(--moss)] border-[var(--sage-soft)]",
      )}
      role="status"
      aria-live="polite"
      id="scan-progress-bar"
    >
      <div className="flex items-center gap-3 mb-2">
        {isError ? (
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
        ) : isComplete ? (
          <CheckCircle2 size={16} className="text-[var(--matcha-400)] flex-shrink-0" />
        ) : (
          <Loader2 size={16} className="text-[var(--matcha-300)] animate-spin flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--stone-100)]">
            {isError ? "Scan failed — retry when ready"
              : isComplete ? "Fleet scan complete"
              : status.service ? `Scanning ${status.service}…`
              : "Initializing scanner…"}
          </p>
          {!isError && (
            <p className="text-[10px] text-[var(--stone-400)] mt-0.5">
              {isComplete
                ? "Findings table updated · Results ready to review"
                : `${status.elapsed_s}s elapsed · Checking IAM, network exposure, encryption`}
            </p>
          )}
        </div>
        {isScanning && (
          <span className="text-[10px] font-mono text-[var(--matcha-300)] flex-shrink-0">
            {progressPct}%
          </span>
        )}
      </div>

      {!isError && (
        <div className="h-1 w-full rounded-full bg-[var(--sage-soft)] overflow-hidden">
          {isScanning ? (
            <div
              className="h-full rounded-full relative overflow-hidden"
              style={{ width: `${progressPct}%`, background: "var(--matcha-400)", transition: "width 0.6s ease" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                  animation: "scan-shimmer 1.5s infinite",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          ) : (
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: "var(--matcha-400)" }}
            />
          )}
        </div>
      )}
      <style>{`
        @keyframes scan-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─── useDemoScan hook ─────────────────────────────────────────────────────────

export function useDemoScan() {
  const [state, setState] = useState<DemoScanState>({
    active: false, elapsed_s: 0,
    service: DEMO_SCAN_SERVICES[0], progress_pct: 0,
    done: false, error: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    startTimeRef.current = Date.now();
    setState({ active: true, elapsed_s: 0, service: DEMO_SCAN_SERVICES[0], progress_pct: 0, done: false, error: false });

    const TOTAL_S = 28;
    const SVC_COUNT = DEMO_SCAN_SERVICES.length;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const pct = Math.min(Math.round((elapsed / TOTAL_S) * 100), 99);
      const svcIdx = Math.min(Math.floor((elapsed / TOTAL_S) * SVC_COUNT), SVC_COUNT - 1);
      if (elapsed >= TOTAL_S) {
        clearInterval(intervalRef.current!);
        setState({ active: false, elapsed_s: TOTAL_S, service: DEMO_SCAN_SERVICES[SVC_COUNT - 1], progress_pct: 100, done: true, error: false });
        return;
      }
      setState({ active: true, elapsed_s: elapsed, service: DEMO_SCAN_SERVICES[svcIdx], progress_pct: pct, done: false, error: false });
    }, 500);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return { state, start };
}
