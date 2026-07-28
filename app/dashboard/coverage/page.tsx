"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Radar } from "lucide-react";
import {
  Badge,
  EmptyState,
  FilterBar,
  FilterChip,
  KPI,
  PageShell,
  Skeleton,
  StatusDot,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TBodyEmpty,
  type BadgeIntent,
} from "@/lib/ui";
import { fetcher, statusOf } from "@/lib/swr-fetcher";
import type { CoverageReport, CoverageStatus } from "@/lib/assurance-types";

const STATUS_INTENT: Record<CoverageStatus, BadgeIntent> = {
  COVERED: "success",
  GAP: "danger",
  UNASSESSED: "neutral",
};

const SEVERITY_INTENT: Record<string, BadgeIntent> = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "warning",
  LOW: "info",
};

const STATUSES = ["ALL", "COVERED", "GAP", "UNASSESSED"] as const;
type StatusFilter = (typeof STATUSES)[number];
const COLS = 6;

function relTime(iso?: string): string {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (Number.isNaN(m)) return "—";
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CoveragePage() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const { data, error, isLoading } = useSWR<CoverageReport>(
    "/api/assurance/coverage",
    (u: string) => fetcher<CoverageReport>(u),
  );

  let meta: React.ReactNode = null;
  if (isLoading) meta = <StatusDot intent="info" pulse size="sm" label="Loading…" />;
  else if (statusOf(error) === 401) meta = <StatusDot intent="danger" size="sm" label="Session expired" />;
  else if (error) meta = <StatusDot intent="warning" size="sm" label="Backend unavailable" />;
  else if (data) meta = <StatusDot intent="success" size="sm" label={`${data.summary.concepts_total} concepts · live`} />;

  const s = data?.summary;
  const concepts = (data?.concepts ?? []).filter((c) => filter === "ALL" || c.status === filter);

  return (
    <PageShell
      eyebrow="Assurance · Coverage"
      title="Coverage & Gap"
      description="Which canonical risks are proven detected, and where the gaps are — backed by signed evidence."
      meta={meta}
      density="tight"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Concepts" value={s?.concepts_total ?? "—"} />
        <KPI label="Covered" value={s?.covered ?? "—"} intent="success" />
        <KPI label="Gaps" value={s?.gaps ?? "—"} intent="danger" />
        <KPI label="Unassessed" value={s?.unassessed ?? "—"} intent="neutral" />
      </div>

      <FilterBar label="Status">
        {STATUSES.map((st) => (
          <FilterChip
            key={st}
            active={filter === st}
            intent={st === "GAP" ? "danger" : st === "COVERED" ? "success" : "neutral"}
            onClick={() => setFilter(st)}
          >
            {st}
          </FilterChip>
        ))}
      </FilterBar>

      <Table>
        <THead>
          <TR>
            <TH>Concept</TH>
            <TH>Severity</TH>
            <TH>Status</TH>
            <TH>Controls</TH>
            <TH>Last evaluated</TH>
            <TH>Evidence</TH>
          </TR>
        </THead>
        <TBody>
          {isLoading ? (
            <TBodyEmpty colSpan={COLS}>
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </TBodyEmpty>
          ) : error ? (
            <TBodyEmpty colSpan={COLS}>
              <EmptyState
                variant="bordered"
                title="Report unavailable"
                description="The assurance backend could not be reached. Try again shortly."
              />
            </TBodyEmpty>
          ) : concepts.length === 0 ? (
            <TBodyEmpty colSpan={COLS}>
              <EmptyState
                variant="bordered"
                icon={<Radar className="text-[var(--matcha-300)]" size={28} />}
                title="No coverage data yet"
                description="Run a scan to assure detections. Each canonical risk appears here as covered, a gap, or unassessed."
              />
            </TBodyEmpty>
          ) : (
            concepts.map((c) => (
              <TR key={c.concept}>
                <TD>
                  <span className="font-medium">{c.title}</span>
                  <span className="block text-xs text-stone-500">{c.concept}</span>
                </TD>
                <TD>
                  <Badge intent={SEVERITY_INTENT[c.severity] ?? "neutral"} variant="subtle">
                    {c.severity}
                  </Badge>
                </TD>
                <TD>
                  <Badge intent={STATUS_INTENT[c.status]}>{c.status}</Badge>
                </TD>
                <TD>{c.controls.length ? c.controls.join(", ") : "—"}</TD>
                <TD>{relTime(c.last_evaluated_at)}</TD>
                <TD>
                  <Link
                    href={`/dashboard/assurance?concept=${encodeURIComponent(c.concept)}`}
                    className="text-xs text-matcha-300 hover:underline"
                  >
                    View verdicts →
                  </Link>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </PageShell>
  );
}
