"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Download, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  EmptyState,
  ErrorState,
  HStack,
  PageShell,
  Skeleton,
  StatusDot,
  Table,
  TBody,
  TBodyEmpty,
  TD,
  TH,
  THead,
  TR,
} from "@/lib/ui";
import {
  DEMO_COMPLIANCE_CONTROLS,
  DEMO_COMPLIANCE_SCORE,
} from "@/lib/demo-data";
import { fetcher, isApiError } from "@/lib/swr-fetcher";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FrameworkScore {
  score: number;
  controls_total: number;
  controls_passing: number;
}

interface TrendPoint {
  date: string;
  score: number;
}

interface ScoreResponse {
  overall_score: number;
  grade: string;
  frameworks: Record<string, FrameworkScore>;
  trend: TrendPoint[];
  last_scan: string;
}

interface Control {
  id: string;
  framework: string;
  control_id: string;
  title: string;
  status: "PASS" | "FAIL";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  resource_count: number;
}

interface ControlsResponse {
  controls: Control[];
}

type FrameworkFilter = "ALL" | string;

// ── Style helpers ─────────────────────────────────────────────────────────────

const SEV_INTENT: Record<Control["severity"], BadgeIntent> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
};

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-[var(--matcha-300)]";
  if (grade.startsWith("B")) return "text-[var(--mist)]";
  if (grade.startsWith("C")) return "text-[var(--amber-clay)]";
  return "text-[var(--ember-glow)]";
}

function scoreBar(score: number): string {
  if (score >= 80) return "bg-[var(--matcha-400)]";
  if (score >= 60) return "bg-[var(--amber-clay)]";
  return "bg-[var(--ember)]";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [fwFilter, setFwFilter] = useState<FrameworkFilter>("ALL");

  const {
    data: scoreData,
    error: scoreError,
    isLoading: scoreLoading,
    mutate: mutateScore,
  } = useSWR<ScoreResponse>("/api/compliance/score", fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const {
    data: ctrlData,
    error: ctrlError,
    isLoading: ctrlLoading,
    mutate: mutateCtrls,
  } = useSWR<ControlsResponse>("/api/compliance/controls", fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const isLoading = scoreLoading || ctrlLoading;
  const isErrored = Boolean(scoreError || ctrlError);

  // Degraded mode: when both endpoints fail (or never resolve), fall back
  // to the canonical Hexgrid Inc. reference dataset so the page renders a
  // believable executive view instead of an empty shell. Live data takes
  // precedence when even one endpoint succeeds.
  const useReferenceData = isErrored && !scoreData && !ctrlData;
  const effectiveScore = scoreData ?? (useReferenceData ? DEMO_COMPLIANCE_SCORE : undefined);
  const effectiveControls = ctrlData?.controls
    ?? (useReferenceData ? DEMO_COMPLIANCE_CONTROLS : []);

  // Defensive — accept partial data (one endpoint may succeed when the
  // other fails) and never trust the structure to exist.
  const safeFrameworks = effectiveScore?.frameworks ?? {};
  const frameworks = Object.keys(safeFrameworks);
  const allControls = effectiveControls;

  const filtered = useMemo(
    () =>
      fwFilter === "ALL"
        ? allControls
        : allControls.filter((c) => c.framework === fwFilter),
    [allControls, fwFilter],
  );

  const failing = useMemo(
    () => filtered.filter((c) => c.status === "FAIL"),
    [filtered],
  );
  const passing = useMemo(
    () => filtered.filter((c) => c.status === "PASS"),
    [filtered],
  );

  // Locale-dependent date formatting is deferred to the client so SSR and
  // hydration agree (and so the React compiler doesn't flag toLocaleString
  // as impure in render).
  const [lastScanLabel, setLastScanLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!effectiveScore?.last_scan) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastScanLabel(null);
      return;
    }
    const d = new Date(effectiveScore.last_scan);
    setLastScanLabel(Number.isNaN(d.getTime()) ? null : d.toLocaleString());
  }, [effectiveScore?.last_scan]);

  // Trend memoization — guard against the prior pattern of recomputing
  // min/max inside the render loop.
  const trendStats = useMemo(() => {
    const trend = effectiveScore?.trend;
    if (!trend || trend.length < 2) return null;
    let min = trend[0].score;
    let max = trend[0].score;
    for (const t of trend) {
      if (t.score < min) min = t.score;
      if (t.score > max) max = t.score;
    }
    const first = trend[0].score;
    const last = trend[trend.length - 1].score;
    const arrow = last > first ? " ↑" : last < first ? " ↓" : " →";
    return { trend, min, max, first, last, arrow };
  }, [effectiveScore?.trend]);

  let statusMeta: React.ReactNode;
  if (isLoading) {
    statusMeta = (
      <StatusDot intent="info" pulse size="sm" label="Loading scores…" />
    );
  } else if (useReferenceData) {
    statusMeta = (
      <StatusDot intent="warning" size="sm" label="Reference posture · backend offline" />
    );
  } else if (isErrored) {
    statusMeta = (
      <StatusDot intent="warning" size="sm" label="Backend unreachable · cached posture shown" />
    );
  } else if (lastScanLabel) {
    statusMeta = (
      <StatusDot intent="success" size="sm" label={`Last scan ${lastScanLabel}`} />
    );
  } else {
    statusMeta = (
      <StatusDot intent="warning" size="sm" label="No scan data yet" />
    );
  }

  const retry = () => {
    mutateScore();
    mutateCtrls();
  };

  return (
    <PageShell
      eyebrow="Posture · Compliance"
      title="Compliance Posture"
      description="Composite score across CIS, SOC 2, NIST, ISO 27001, and custom policy frameworks. Failing controls are surfaced with the affected resource count for direct remediation."
      meta={statusMeta}
      actions={
        <HStack gap="sm" align="center">
          <a href="/api/export?format=csv" className="contents print:hidden">
            <Button variant="ghost" size="md" icon={<Download size={13} />}>
              CSV
            </Button>
          </a>
          <Button
            variant="primary"
            size="md"
            icon={<FileText size={13} />}
            onClick={() => window.print()}
            className="print:hidden"
          >
            PDF Export
          </Button>
        </HStack>
      }
      width="default"
      density="tight"
    >
      {/* Degraded-mode banner: when both endpoints fail, show reference data
          with a clear indicator that this is illustrative posture, not live. */}
      {useReferenceData && (
        <ErrorState
          variant="degraded"
          density="inline"
          title="Showing reference posture (Hexgrid Inc.)"
          description="The compliance backend is unreachable. ARIA will resume telemetry once it reconnects. Numbers below reflect the bundled reference dataset, not live scan results."
          detail={(() => {
            const e = scoreError ?? ctrlError;
            if (!isApiError(e)) return e instanceof Error ? e.message : undefined;
            return `${e.message}${e.requestId ? ` · request_id=${e.requestId}` : ""}`;
          })()}
          action={
            <Button
              variant="ghost"
              size="md"
              icon={<RefreshCw size={12} />}
              onClick={retry}
            >
              Retry live fetch
            </Button>
          }
        />
      )}

      {/* ── Overall score ── */}
      <Card variant="elevated" density="spacious">
        <HStack justify="between" align="start" gap="md" wrap>
          <div>
            <p className="eyebrow text-[var(--matcha-300)]">Overall posture</p>
            <p className="text-[var(--stone-400)] text-xs mt-1">
              Composite weighted score across all enabled frameworks.
            </p>
          </div>
          {isLoading && !effectiveScore && (
            <Skeleton variant="block" width="140px" height="64px" />
          )}
          {effectiveScore && (
            <div className="text-right">
              <p
                className={`text-5xl font-bold tabular-nums ${gradeColor(effectiveScore.grade ?? "?")} print:text-black`}
              >
                {effectiveScore.grade ?? "—"}
              </p>
              <p className="text-[var(--stone-400)] text-sm mt-1">
                {typeof effectiveScore.overall_score === "number"
                  ? `${effectiveScore.overall_score}/100 overall`
                  : "Score pending"}
              </p>
            </div>
          )}
        </HStack>

        {/* Framework scores grid */}
        {isLoading && !effectiveScore && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="block" height="56px" />
            ))}
          </div>
        )}
        {effectiveScore && frameworks.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={<ShieldCheck size={20} className="text-[var(--matcha-300)]" />}
              title="No frameworks scored yet"
              description="Tricognita scores every connected account against CIS AWS, SOC 2, NIST 800-53, ISO 27001, PCI DSS, and the AWS Well-Architected framework. Connect an account to begin."
              action={
                <Link href="/dashboard/credentials">
                  <Button variant="primary" size="sm">
                    Connect a cloud account
                  </Button>
                </Link>
              }
            />
          </div>
        )}
        {effectiveScore && frameworks.length > 0 && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(safeFrameworks).map(([fw, s]) => (
              <div key={fw} className="space-y-1.5">
                <HStack justify="between" align="center">
                  <span className="text-[10px] font-mono text-[var(--stone-400)] truncate max-w-[80px]">
                    {fw}
                  </span>
                  <span className="text-xs font-bold text-[var(--stone-200)] tabular-nums">
                    {s.score}%
                  </span>
                </HStack>
                <div
                  role="progressbar"
                  aria-valuenow={s.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${fw} compliance score`}
                  className="h-1.5 rounded-full bg-[var(--ink-deep)] overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full ${scoreBar(s.score)} transition-all`}
                    style={{ width: `${Math.min(100, Math.max(0, s.score))}%` }}
                  />
                </div>
                <p className="text-[9px] text-[var(--stone-600)]">
                  {s.controls_passing}/{s.controls_total} passed
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 7-day trend sparkline */}
        {trendStats && (
          <div className="mt-5 pt-4 border-t border-[var(--sage-soft)] flex items-center gap-4 flex-wrap">
            <p className="eyebrow text-[10px] shrink-0">7-day trend</p>
            <div className="flex items-end gap-1 h-8" aria-label="7-day compliance score trend">
              {trendStats.trend.map((pt, i) => {
                const span = trendStats.max - trendStats.min;
                const pct = span === 0 ? 50 : ((pt.score - trendStats.min) / span) * 100;
                return (
                  <div
                    key={`${pt.date}-${i}`}
                    title={`${pt.date}: ${pt.score}`}
                    className={`w-5 rounded-sm transition-all ${scoreBar(pt.score)}`}
                    style={{
                      height: `${Math.max(pct, 10)}%`,
                      opacity: 0.6 + (i / trendStats.trend.length) * 0.4,
                    }}
                  />
                );
              })}
            </div>
            <p className="text-xs text-[var(--stone-500)]">
              {trendStats.first} → {trendStats.last}
              {trendStats.arrow}
            </p>
          </div>
        )}
      </Card>

      {/* ── Controls table ── */}
      <Card variant="default" density="compact" className="p-0 overflow-hidden">
        {/* Framework tabs */}
        <div
          className="flex items-center gap-0 border-b border-[var(--sage-soft)] overflow-x-auto"
          style={{ background: "var(--moss)" }}
          role="tablist"
          aria-label="Compliance framework filter"
        >
          {(["ALL", ...frameworks] as FrameworkFilter[]).map((fw) => {
            const active = fwFilter === fw;
            return (
              <button
                key={fw}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setFwFilter(fw)}
                className={`shrink-0 px-4 py-3 text-[10px] font-bold uppercase tracking-wide transition-colors border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/40 ${
                  active
                    ? "text-[var(--matcha-200)] border-[var(--matcha-300)]"
                    : "text-[var(--stone-500)] hover:text-[var(--stone-300)] border-transparent"
                }`}
              >
                {fw}
                {fw !== "ALL" && safeFrameworks[fw] && (
                  <span className="ml-1 text-[var(--stone-600)]">
                    ({safeFrameworks[fw].score}%)
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Summary row */}
        <div
          className="px-5 py-3 flex items-center gap-4 text-xs text-[var(--stone-500)] border-b border-[var(--sage-soft)]"
          style={{ background: "var(--moss)" }}
        >
          <span>
            <strong className="text-[var(--matcha-300)]">{passing.length}</strong>{" "}
            passing
          </span>
          <span>
            <strong className="text-[var(--ember-glow)]">{failing.length}</strong>{" "}
            failing
          </span>
        </div>

        <Table density="compact" scroll={false}>
          <THead>
            <TR>
              <TH>Control</TH>
              <TH className="hidden sm:table-cell">Framework</TH>
              <TH>Status</TH>
              <TH className="hidden md:table-cell">Severity</TH>
              <TH className="hidden lg:table-cell">Affected</TH>
            </TR>
          </THead>
          <TBody>
            {ctrlLoading && allControls.length === 0 && (
              <>
                <tr>
                  <td colSpan={5} className="px-4 py-2.5">
                    <Skeleton variant="text" lines={1} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2.5">
                    <Skeleton variant="text" lines={1} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="px-4 py-2.5">
                    <Skeleton variant="text" lines={1} />
                  </td>
                </tr>
              </>
            )}
            {!ctrlLoading && filtered.length === 0 && (
              <TBodyEmpty colSpan={5}>
                <EmptyState
                  icon={<ShieldCheck size={20} className="text-[var(--matcha-300)]" />}
                  title={
                    ctrlError
                      ? "Controls feed unavailable"
                      : allControls.length === 0
                        ? "No control evaluations yet"
                        : `No ${fwFilter} controls`
                  }
                  description={
                    ctrlError
                      ? "Compliance backend is not responding. Score may be cached above; retry to fetch the latest control list."
                      : allControls.length === 0
                        ? "Once a scan completes, every evaluated control across CIS, SOC 2, NIST, and ISO 27001 will be listed here with the affected resource count."
                        : "Try a different framework, or clear the filter to view all controls."
                  }
                  action={
                    ctrlError ? (
                      <Button
                        variant="ghost"
                        size="md"
                        icon={<RefreshCw size={12} />}
                        onClick={retry}
                      >
                        Retry
                      </Button>
                    ) : undefined
                  }
                />
              </TBodyEmpty>
            )}
            {filtered.length > 0 &&
              [...failing, ...passing].map((c) => (
                <TR
                  key={c.id}
                  className={
                    c.status === "FAIL" ? "" : "opacity-70 hover:opacity-100"
                  }
                >
                  <TD>
                    <p className="font-mono text-[10px] text-[var(--mist)]">
                      {c.control_id}
                    </p>
                    <p className="text-[var(--stone-300)] mt-0.5 leading-snug max-w-[320px]">
                      {c.title}
                    </p>
                  </TD>
                  <TD mono className="hidden sm:table-cell">
                    {c.framework}
                  </TD>
                  <TD>
                    <Badge
                      intent={c.status === "PASS" ? "success" : "danger"}
                      variant="subtle"
                      size="xs"
                    >
                      {c.status}
                    </Badge>
                  </TD>
                  <TD className="hidden md:table-cell">
                    <Badge
                      intent={SEV_INTENT[c.severity] ?? "neutral"}
                      variant="subtle"
                      size="xs"
                    >
                      {c.severity}
                    </Badge>
                  </TD>
                  <TD className="hidden lg:table-cell tabular-nums text-[var(--stone-500)]">
                    {c.resource_count > 0
                      ? `${c.resource_count} resource${c.resource_count !== 1 ? "s" : ""}`
                      : "—"}
                  </TD>
                </TR>
              ))}
          </TBody>
        </Table>
      </Card>
    </PageShell>
  );
}
