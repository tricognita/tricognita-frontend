"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Network,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
  HStack,
  KPI,
  PageShell,
  StatusDot,
  Timeline,
  TimelineItem,
  VStack,
} from "@/lib/ui";
import {
  DEMO_ATTACK_PATHS,
  DEMO_AUDIT_EVENTS,
  DEMO_COMPLIANCE_SCORE,
  DEMO_FINDINGS,
  DEMO_FINDINGS_SUMMARY,
  DEMO_ORG,
} from "@/lib/demo-data";

/**
 * Executive Summary — single-screen surface for CISOs, board members, and
 * security leaders who need posture context in <30 seconds.
 *
 * Information density is deliberately high; copy is short; every tile links
 * deeper for the operator who wants the full picture. Everything renders
 * from the canonical Hexgrid demo dataset so the surface is production-safe
 * even when the live backend is degraded — a security leader should never
 * see a blank executive view during a board meeting.
 */
export default function ExecutiveSummaryPage() {
  const score = DEMO_COMPLIANCE_SCORE;
  const sum = DEMO_FINDINGS_SUMMARY;

  // Trend direction — week-over-week posture change.
  const trendDelta = useMemo(() => {
    const trend = score.trend;
    if (!trend || trend.length < 2) return null;
    const first = trend[0].score;
    const last = trend[trend.length - 1].score;
    return { first, last, delta: last - first };
  }, [score.trend]);

  // Resolved this week vs new this week — simple remediation velocity signal.
  // weekAgo is deferred to client mount so the React compiler doesn't flag
  // Date.now() as impure in render, and so SSR + client hydration agree on
  // the initial empty state.
  const [weekAgo, setWeekAgo] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeekAgo(Date.now() - 7 * 86400_000);
  }, []);

  const remediationStats = useMemo(() => {
    if (weekAgo === null) return { newThisWeek: 0, resolvedThisWeek: 0 };
    const newThisWeek = DEMO_FINDINGS.filter(
      (f) => new Date(f.created_at).getTime() >= weekAgo,
    ).length;
    const resolvedThisWeek = DEMO_FINDINGS.filter(
      (f) =>
        f.status === "RESOLVED" &&
        new Date(f.created_at).getTime() >= weekAgo,
    ).length;
    return { newThisWeek, resolvedThisWeek };
  }, [weekAgo]);

  // Top 3 attack paths by severity then blast radius.
  const topPaths = useMemo(() => {
    const sevOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
    };
    return [...DEMO_ATTACK_PATHS]
      .sort((a, b) => {
        const s = sevOrder[a.severity] - sevOrder[b.severity];
        return s !== 0 ? s : b.blast_radius - a.blast_radius;
      })
      .slice(0, 3);
  }, []);

  // Last 5 audit events (already time-ordered in demo-data).
  const recentEvents = DEMO_AUDIT_EVENTS.slice(0, 5);

  const pathSeverityIntent: Record<
    (typeof DEMO_ATTACK_PATHS)[number]["severity"],
    BadgeIntent
  > = {
    CRITICAL: "danger",
    HIGH: "warning",
    MEDIUM: "info",
  };

  const eventIntent: Record<
    (typeof DEMO_AUDIT_EVENTS)[number]["actor_type"],
    BadgeIntent
  > = {
    ARIA: "violet",
    OPERATOR: "info",
    SYSTEM: "neutral",
  };

  return (
    <PageShell
      eyebrow="Executive · Posture summary"
      title="Security Posture Briefing"
      description={`Single-page operational read for ${DEMO_ORG.name} (AWS ${DEMO_ORG.primaryAccountId}). ${DEMO_ORG.cloudFootprint}. Updated every scan cycle.`}
      meta={
        <HStack gap="sm" align="center" wrap>
          <StatusDot
            intent="success"
            size="sm"
            label={`Last scan ${new Date(score.last_scan).toLocaleString()}`}
          />
          <Badge intent="neutral" variant="subtle" size="xs" mono>
            {DEMO_ORG.industry}
          </Badge>
        </HStack>
      }
      width="default"
      density="tight"
    >
      {/* ── Hero KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          label="Overall posture"
          value={`${score.overall_score}`}
          intent={
            score.overall_score >= 80
              ? "success"
              : score.overall_score >= 60
                ? "warning"
                : "danger"
          }
          trend={
            trendDelta
              ? {
                  value: `${trendDelta.delta > 0 ? "+" : ""}${trendDelta.delta} · 7d`,
                  direction:
                    trendDelta.delta > 0
                      ? "up"
                      : trendDelta.delta < 0
                        ? "down"
                        : "flat",
                }
              : undefined
          }
          hint={`Grade ${score.grade} · composite weighted score across all enabled frameworks`}
        />
        <KPI
          label="Open critical findings"
          value={
            DEMO_FINDINGS.filter(
              (f) => f.severity === "CRITICAL" && f.status === "OPEN",
            ).length
          }
          intent="danger"
          hint="Awaiting OPERATOR approval or autonomous remediation"
        />
        <KPI
          label="Mean time to remediation"
          value="4h 12m"
          intent="success"
          trend={{ value: "−38m · 7d", direction: "down" }}
          hint="From ARIA detection to OPERATOR-approved fix"
          source="ARIA telemetry"
        />
        <KPI
          label="Findings this week"
          value={remediationStats.newThisWeek}
          intent={remediationStats.newThisWeek > 5 ? "warning" : "info"}
          hint={`${remediationStats.resolvedThisWeek} resolved · ${remediationStats.newThisWeek - remediationStats.resolvedThisWeek} carried`}
        />
      </div>

      {/* ── Compliance + top paths ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Compliance card */}
        <Card variant="elevated" density="comfortable" className="lg:col-span-5">
          <CardHeader
            eyebrow="Posture"
            title="Compliance frameworks"
            description="Composite framework scores. Failing controls are surfaced in the full Compliance view with affected resource counts."
            actions={
              <Link href="/dashboard/compliance">
                <Button variant="ghost" size="xs" iconRight={<ArrowRight size={11} />}>
                  Full view
                </Button>
              </Link>
            }
          />
          <VStack gap="sm">
            {Object.entries(score.frameworks).map(([fw, s]) => (
              <div key={fw}>
                <HStack justify="between" align="center" className="mb-1">
                  <span className="text-xs text-[var(--stone-300)]">{fw}</span>
                  <span className="text-xs font-bold tabular-nums text-[var(--stone-100)]">
                    {s.score}%
                  </span>
                </HStack>
                <div
                  className="h-1.5 rounded-full bg-[var(--ink-deep)] overflow-hidden"
                  role="progressbar"
                  aria-valuenow={s.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${fw} compliance score`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.score >= 80
                        ? "bg-[var(--matcha-400)]"
                        : s.score >= 60
                          ? "bg-[var(--amber-clay)]"
                          : "bg-[var(--ember)]"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, s.score))}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--stone-600)] mt-0.5">
                  {s.controls_passing}/{s.controls_total} controls passing
                </p>
              </div>
            ))}
          </VStack>
        </Card>

        {/* Top attack paths */}
        <Card variant="elevated" density="comfortable" className="lg:col-span-7">
          <CardHeader
            eyebrow="Risk"
            title="Top attack paths"
            description="Ranked by severity then blast radius — these are the paths to brief first."
            actions={
              <Link href="/dashboard/attack-graph">
                <Button variant="ghost" size="xs" iconRight={<ArrowRight size={11} />}>
                  Open graph
                </Button>
              </Link>
            }
          />
          <VStack gap="sm">
            {topPaths.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/attack-graph?path=${p.id}`}
                className="block rounded-md border border-[var(--sage-soft)] bg-[var(--moss)] px-3 py-2.5 hover:border-[var(--matcha-400)]/40 transition-colors"
              >
                <HStack justify="between" align="start" gap="sm">
                  <div className="min-w-0 flex-1">
                    <HStack gap="sm" align="center" className="mb-1">
                      <Badge
                        intent={pathSeverityIntent[p.severity]}
                        variant="subtle"
                        size="xs"
                        mono
                      >
                        {p.severity}
                      </Badge>
                      <span className="font-mono text-[10px] text-[var(--matcha-300)]">
                        {p.id}
                      </span>
                      <span className="text-[10px] text-[var(--stone-500)]">
                        blast radius · {p.blast_radius.toLocaleString()}
                      </span>
                    </HStack>
                    <p className="text-xs text-[var(--stone-200)] font-medium leading-snug">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[var(--stone-500)] mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                  <Network
                    size={14}
                    className="text-[var(--stone-500)] shrink-0 mt-0.5"
                  />
                </HStack>
              </Link>
            ))}
          </VStack>
        </Card>
      </div>

      {/* ── Remediation velocity + recent ARIA activity ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card variant="elevated" density="comfortable" className="lg:col-span-5">
          <CardHeader
            eyebrow="Operations"
            title="Remediation velocity"
            description="New findings introduced vs. findings closed over the last 7 days."
          />
          <VStack gap="md">
            <HStack justify="between" align="center">
              <HStack gap="sm" align="center">
                <TrendingUp size={14} className="text-[var(--amber-clay)]" />
                <span className="text-xs text-[var(--stone-300)]">
                  New this week
                </span>
              </HStack>
              <span className="text-lg font-bold tabular-nums text-[var(--amber-clay)]">
                {remediationStats.newThisWeek}
              </span>
            </HStack>
            <HStack justify="between" align="center">
              <HStack gap="sm" align="center">
                <TrendingDown size={14} className="text-[var(--matcha-300)]" />
                <span className="text-xs text-[var(--stone-300)]">
                  Resolved this week
                </span>
              </HStack>
              <span className="text-lg font-bold tabular-nums text-[var(--matcha-300)]">
                {remediationStats.resolvedThisWeek}
              </span>
            </HStack>
            <div className="pt-3 border-t border-[var(--sage-soft)]">
              <HStack justify="between" align="center" className="mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)]">
                  Open · by severity
                </span>
              </HStack>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { label: "CRIT", value: sum.critical, intent: "danger" as const },
                  { label: "HIGH", value: sum.high, intent: "warning" as const },
                  { label: "MED", value: sum.medium, intent: "info" as const },
                  { label: "LOW", value: sum.low, intent: "neutral" as const },
                ].map((s) => (
                  <Link
                    key={s.label}
                    href={`/dashboard/findings?severity=${s.label === "CRIT" ? "CRITICAL" : s.label === "MED" ? "MEDIUM" : s.label}`}
                    className="text-center rounded-md py-1.5 bg-[var(--moss)] hover:bg-[var(--moss-hi)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/40"
                  >
                    <div className="eyebrow text-[var(--stone-500)] mb-1">
                      {s.label}
                    </div>
                    <div
                      className={`text-base font-bold tabular-nums ${
                        s.intent === "danger"
                          ? "text-[var(--ember-glow)]"
                          : s.intent === "warning"
                            ? "text-[var(--amber-clay)]"
                            : s.intent === "info"
                              ? "text-[var(--mist)]"
                              : "text-[var(--stone-200)]"
                      }`}
                    >
                      {s.value}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </VStack>
        </Card>

        <Card variant="elevated" density="comfortable" className="lg:col-span-7">
          <CardHeader
            eyebrow="Activity"
            title="Recent ARIA + analyst actions"
            description="Last five events — operator approvals, autonomous remediations, and detections — in chronological order."
            actions={
              <Link href="/dashboard/audit-trail">
                <Button variant="ghost" size="xs" iconRight={<ArrowRight size={11} />}>
                  Full audit trail
                </Button>
              </Link>
            }
          />
          <Timeline density="comfortable">
            {recentEvents.map((e) => {
              const isResolved =
                e.outcome === "EXECUTED" || e.outcome === "APPROVED";
              return (
                <TimelineItem
                  key={e.id}
                  intent={
                    e.outcome === "DETECTED"
                      ? "warning"
                      : isResolved
                        ? "success"
                        : "info"
                  }
                  time={new Date(e.timestamp).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  title={
                    <span>
                      <Badge
                        intent={eventIntent[e.actor_type]}
                        variant="subtle"
                        size="xs"
                        mono
                        className="mr-2"
                      >
                        {e.actor_type}
                      </Badge>
                      {e.action}
                    </span>
                  }
                  icon={
                    isResolved ? (
                      <CheckCircle2
                        size={12}
                        className="text-[var(--matcha-400)]"
                      />
                    ) : undefined
                  }
                  action={
                    e.finding_id ? (
                      <Link
                        href={`/dashboard/findings?focus=${e.finding_id}`}
                        className="text-[10px] text-[var(--matcha-300)] hover:text-[var(--matcha-200)] inline-flex items-center gap-1"
                      >
                        {e.finding_id}
                        <ArrowRight size={10} />
                      </Link>
                    ) : undefined
                  }
                >
                  {e.details && (
                    <p className="text-[11px] text-[var(--stone-500)] leading-relaxed">
                      {e.details}
                    </p>
                  )}
                </TimelineItem>
              );
            })}
          </Timeline>
        </Card>
      </div>

      {/* ── Footer credibility strip ────────────────────────────────────── */}
      <HStack gap="md" align="center" wrap className="pt-2">
        <HStack gap="xs" align="center">
          <ShieldCheck size={12} className="text-[var(--matcha-300)]" />
          <span className="text-[10px] font-mono text-[var(--stone-500)] uppercase tracking-widest">
            Data never leaves customer AWS
          </span>
        </HStack>
        <span className="text-[var(--stone-700)]">·</span>
        <span className="text-[10px] font-mono text-[var(--stone-500)] uppercase tracking-widest">
          Hash-linked audit chain
        </span>
        <span className="text-[var(--stone-700)]">·</span>
        <span className="text-[10px] font-mono text-[var(--stone-500)] uppercase tracking-widest">
          OPERATOR-approval default
        </span>
        <span className="text-[var(--stone-700)]">·</span>
        <span className="text-[10px] font-mono text-[var(--stone-500)] uppercase tracking-widest">
          Read-only by design
        </span>
      </HStack>
    </PageShell>
  );
}
