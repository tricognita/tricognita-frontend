"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ExternalLink, Network } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  FilterChip,
  HStack,
  KPI,
  PageShell,
  StatusDot,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TBodyEmpty,
  cn,
  type BadgeIntent,
  type FilterChipIntent,
} from "@/lib/ui";
import {
  DEMO_ATTACK_PATHS,
  DEMO_FINDINGS,
  DEMO_FINDINGS_SUMMARY,
} from "@/lib/demo-data";
import { fetcher, statusOf } from "@/lib/swr-fetcher";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Finding {
  id: string;
  rule_id: string;
  resource_id: string;
  resource_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "RESOLVED" | "SUPPRESSED";
  title: string;
  description: string;
  remediation: string;
  frameworks: string[];
  mitre: string[];
  risk_score: number;
  created_at: string;
}

interface FindingsResponse {
  findings: Finding[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    resolved: number;
  };
}

type SevFilter = "ALL" | "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type StatFilter = "ALL" | "OPEN" | "RESOLVED" | "SUPPRESSED";
type SortKey = "risk_score" | "created_at";

// ── Intent mappings ───────────────────────────────────────────────────────────

const SEVERITY_INTENT: Record<Finding["severity"], BadgeIntent> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "warning",
  LOW: "info",
};

const STATUS_INTENT: Record<Finding["status"], BadgeIntent> = {
  OPEN: "danger",
  RESOLVED: "success",
  SUPPRESSED: "neutral",
};

const SEVERITY_CHIP_INTENT: Record<Exclude<SevFilter, "ALL">, FilterChipIntent> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "warning",
  LOW: "info",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Resilient fetcher is shared across routes — see lib/swr-fetcher.

// ── Component ─────────────────────────────────────────────────────────────────

const VALID_SEVERITIES = new Set<SevFilter>(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const VALID_STATUSES = new Set<StatFilter>(["ALL", "OPEN", "RESOLVED", "SUPPRESSED"]);

export default function FindingsPage() {
  const searchParams = useSearchParams();
  const focusId = searchParams?.get("focus") ?? null;
  // Initial severity filter — honor a valid ?severity= deep-link from the
  // dashboard Posture KPI tiles, fall back to "ALL" otherwise.
  const sevParam = (searchParams?.get("severity") ?? "ALL") as SevFilter;
  const initialSev: SevFilter = VALID_SEVERITIES.has(sevParam) ? sevParam : "ALL";
  const statParam = (searchParams?.get("status") ?? "OPEN") as StatFilter;
  const initialStat: StatFilter = VALID_STATUSES.has(statParam) ? statParam : "OPEN";

  const [sevFilter, setSevFilter] = useState<SevFilter>(initialSev);
  const [statFilter, setStatFilter] = useState<StatFilter>(initialStat);
  const [expanded, setExpanded] = useState<string | null>(focusId);
  const [sortBy, setSortBy] = useState<SortKey>("risk_score");

  // Honor cross-route deep links (e.g. AlertFeed → /findings?focus=FND-…).
  // When the focused id is in SUPPRESSED or RESOLVED status, widen the
  // status filter so the row is visible after expansion.
  useEffect(() => {
    if (!focusId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(focusId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatFilter("ALL");
  }, [focusId]);

  const { data, isLoading, error } = useSWR<FindingsResponse>(
    "/api/findings",
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  // Degraded mode: fall back to the canonical Hexgrid reference dataset
  // when the backend is unreachable. Same shape as the live API.
  const useReferenceData = Boolean(error) && !data;
  const effectiveFindings = data?.findings ?? (useReferenceData ? DEMO_FINDINGS : []);
  const effectiveSummary = data?.summary ?? (useReferenceData ? DEMO_FINDINGS_SUMMARY : undefined);
  const isDegraded = !data && !isLoading && !error;

  const filtered = useMemo(() => {
    return effectiveFindings
      .filter((f) => sevFilter === "ALL" || f.severity === sevFilter)
      .filter((f) => statFilter === "ALL" || f.status === statFilter)
      .sort((a, b) =>
        sortBy === "risk_score"
          ? b.risk_score - a.risk_score
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [effectiveFindings, sevFilter, statFilter, sortBy]);

  const sum = effectiveSummary;

  // ── Status meta — surfaced at top-right of PageShell ──────────────────────
  let statusMeta: React.ReactNode = null;
  if (isLoading) {
    statusMeta = <StatusDot intent="info" pulse size="sm" label="Loading findings…" />;
  } else if (statusOf(error) === 429) {
    statusMeta = <StatusDot intent="warning" pulse size="sm" label="Rate limited — retrying" />;
  } else if (statusOf(error) === 401) {
    statusMeta = <StatusDot intent="danger" size="sm" label="Session expired" />;
  } else if (useReferenceData) {
    statusMeta = <StatusDot intent="warning" size="sm" label="Reference data · backend offline" />;
  } else if (isDegraded) {
    statusMeta = <StatusDot intent="warning" size="sm" label="Reference data" />;
  } else if (data) {
    statusMeta = <StatusDot intent="success" size="sm" label={`${data.findings.length} findings · live`} />;
  }

  // ── KPI summary row ───────────────────────────────────────────────────────
  const kpis: Array<{ label: string; value: number | string; intent?: KPIIntent }> = [
    { label: "Total",    value: sum?.total    ?? "—" },
    { label: "Critical", value: sum?.critical ?? "—", intent: "danger" },
    { label: "High",     value: sum?.high     ?? "—", intent: "warning" },
    { label: "Medium",   value: sum?.medium   ?? "—", intent: "warning" },
    { label: "Low",      value: sum?.low      ?? "—", intent: "info" },
    { label: "Open",     value: sum?.open     ?? "—", intent: "danger" },
    { label: "Resolved", value: sum?.resolved ?? "—", intent: "success" },
  ];

  return (
    <PageShell
      eyebrow="Posture · Findings"
      title="Security Findings"
      description="Cloud posture findings across all scanned resources, ranked by ARIA risk score."
      meta={statusMeta}
      density="tight"
    >
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => (
          <KPI key={k.label} label={k.label} value={k.value} intent={k.intent} />
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <FilterBar label="Severity">
          {(["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
            <FilterChip
              key={s}
              active={sevFilter === s}
              intent={s === "ALL" ? "neutral" : SEVERITY_CHIP_INTENT[s]}
              onClick={() => setSevFilter(s)}
            >
              {s}
            </FilterChip>
          ))}
        </FilterBar>

        <FilterBar label="Status">
          {(["ALL", "OPEN", "RESOLVED", "SUPPRESSED"] as const).map((s) => (
            <FilterChip
              key={s}
              active={statFilter === s}
              intent={s === "OPEN" ? "danger" : s === "RESOLVED" ? "success" : "neutral"}
              onClick={() => setStatFilter(s)}
            >
              {s}
            </FilterChip>
          ))}
        </FilterBar>

        <FilterBar label="Sort">
          {(["risk_score", "created_at"] as const).map((s) => (
            <FilterChip key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
              {s === "risk_score" ? "Risk score" : "Newest"}
            </FilterChip>
          ))}
        </FilterBar>
      </div>

      {/* Findings table */}
      <Table density="compact" stickyHeader>
        <THead>
          <TR>
            <TH>Rule · Resource</TH>
            <TH className="hidden sm:table-cell">Type</TH>
            <TH>Severity</TH>
            <TH className="hidden md:table-cell">Status</TH>
            <TH className="hidden lg:table-cell">Risk</TH>
            <TH className="hidden lg:table-cell">Age</TH>
            <TH align="right" width="w-10">{/* expand toggle */}</TH>
          </TR>
        </THead>
        <TBody>
          {filtered.length === 0 ? (
            <TBodyEmpty colSpan={7}>
              {isLoading ? (
                <EmptyState
                  title="Loading findings…"
                  description="Reading the latest scan from the API."
                />
              ) : effectiveFindings.length === 0 ? (
                <EmptyState
                  icon={<Network size={20} className="text-[var(--matcha-300)]" />}
                  title="No findings to triage yet"
                  description="Tricognita evaluates every resource in your connected accounts against CIS, SOC 2, NIST, and your custom policies. New findings appear here automatically after each scan, ranked by ARIA's risk score."
                  action={
                    <Link href="/dashboard/credentials">
                      <Button variant="primary" size="sm">
                        Connect a cloud account
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  title="No findings match the current filters."
                  description="Try widening the severity or status filter above."
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSevFilter("ALL");
                        setStatFilter("ALL");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              )}
            </TBodyEmpty>
          ) : (
            filtered.map((f) => {
              const isExpanded = expanded === f.id;
              return (
                <Fragment key={f.id}>
                  <TR
                    interactive
                    selected={isExpanded}
                    onClick={() => setExpanded(isExpanded ? null : f.id)}
                  >
                    <TD>
                      <div className="space-y-0.5">
                        <p className="font-mono text-[10px] text-[var(--matcha-300)]">{f.rule_id}</p>
                        <p className="text-[var(--stone-200)] font-medium leading-snug">{f.title}</p>
                        <p className="text-[var(--stone-500)] text-[10px] font-mono truncate max-w-[320px]" title={f.resource_id}>
                          {f.resource_id}
                        </p>
                      </div>
                    </TD>
                    <TD className="hidden sm:table-cell text-[var(--stone-400)]">{f.resource_type}</TD>
                    <TD>
                      <Badge intent={SEVERITY_INTENT[f.severity]} variant="subtle" mono>
                        {f.severity}
                      </Badge>
                    </TD>
                    <TD className="hidden md:table-cell">
                      <Badge intent={STATUS_INTENT[f.status]} variant="subtle" mono>
                        {f.status}
                      </Badge>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <HStack gap="sm" align="center">
                        <div
                          className="h-1.5 w-14 rounded-full overflow-hidden"
                          style={{ background: "var(--moss-hi)" }}
                          aria-label={`Risk score ${f.risk_score} of 100`}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--matcha-300)]"
                            style={{
                              width: `${Math.min(100, Math.max(0, f.risk_score))}%`,
                              opacity: 0.65 + f.risk_score / 320,
                            }}
                          />
                        </div>
                        <span className="text-[var(--stone-400)] tabular-nums text-[11px]">
                          {f.risk_score}
                        </span>
                      </HStack>
                    </TD>
                    <TD className="hidden lg:table-cell text-[var(--stone-500)]">
                      {relTime(f.created_at)}
                    </TD>
                    <TD align="right" className="text-[var(--stone-500)]">
                      <ChevronDown
                        size={14}
                        className={cn("transition-transform duration-200", isExpanded && "rotate-180")}
                      />
                    </TD>
                  </TR>

                  {isExpanded && (
                    <TR>
                      <TD
                        colSpan={7}
                        className="!p-0"
                      >
                        <div
                          className="px-5 pb-5 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
                          style={{ background: "var(--moss)" }}
                        >
                          <div className="space-y-2">
                            <p className="eyebrow">Description</p>
                            <p className="text-[var(--stone-300)] leading-relaxed">{f.description}</p>
                          </div>
                          <div className="space-y-2">
                            <p className="eyebrow">Remediation</p>
                            <p className="text-[var(--stone-300)] leading-relaxed">{f.remediation}</p>
                          </div>
                          {f.frameworks.length > 0 && (
                            <div className="space-y-2">
                              <p className="eyebrow">Frameworks</p>
                              <HStack gap="xs" wrap>
                                {f.frameworks.map((fw) => (
                                  <Badge key={fw} intent="info" variant="subtle" size="xs" mono>
                                    {fw}
                                  </Badge>
                                ))}
                              </HStack>
                            </div>
                          )}
                          {f.mitre.length > 0 && (
                            <div className="space-y-2">
                              <p className="eyebrow">MITRE ATT&amp;CK</p>
                              <HStack gap="xs" wrap>
                                {f.mitre.map((t) => (
                                  <Badge key={t} intent="violet" variant="subtle" size="xs" mono>
                                    {t}
                                  </Badge>
                                ))}
                              </HStack>
                            </div>
                          )}
                          {/* Cross-route: related attack paths backed by this finding. */}
                          {(() => {
                            const related = DEMO_ATTACK_PATHS.filter((p) =>
                              p.finding_ids.includes(f.id),
                            );
                            if (related.length === 0) return null;
                            return (
                              <div className="space-y-2 md:col-span-2">
                                <p className="eyebrow">Related attack paths</p>
                                <div className="space-y-1.5">
                                  {related.map((p) => (
                                    <Link
                                      key={p.id}
                                      href={`/dashboard/attack-graph?path=${p.id}`}
                                      className="flex items-start gap-2 text-xs text-[var(--stone-300)] hover:text-[var(--matcha-200)] transition-colors"
                                    >
                                      <Network
                                        size={12}
                                        className="text-[var(--matcha-300)] shrink-0 mt-0.5"
                                      />
                                      <span className="flex-1">
                                        <span className="font-mono text-[10px] text-[var(--matcha-300)] mr-1.5">
                                          {p.id}
                                        </span>
                                        {p.name}
                                        <ExternalLink
                                          size={10}
                                          className="inline ml-1 text-[var(--stone-500)]"
                                        />
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </TD>
                    </TR>
                  )}
                </Fragment>
              );
            })
          )}
        </TBody>
      </Table>
    </PageShell>
  );
}

// Local type alias — KPI's KPIIntent type is re-exported from lib/ui;
// avoid importing the full type explicitly to keep the public surface narrow.
type KPIIntent = "neutral" | "success" | "warning" | "danger" | "info";
