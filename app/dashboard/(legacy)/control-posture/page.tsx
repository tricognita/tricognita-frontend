"use client";

import { Fragment, useState } from "react";
import useSWR from "swr";
import { ShieldCheck } from "lucide-react";
import {
  Badge,
  EmptyState,
  FilterBar,
  FilterChip,
  HStack,
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
import type { ControlPostureReport, ControlStatus } from "@/lib/assurance-types";
import { EvidenceVerifyChip } from "../components/EvidenceVerifyChip";

const STATUS_INTENT: Record<ControlStatus, BadgeIntent> = {
  SATISFIED: "success",
  FAILING: "danger",
  UNKNOWN: "neutral",
};

const FRAMEWORKS = ["", "SOC2", "CIS", "ISO27001"] as const;
const COLS = 7;

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

export default function ControlPosturePage() {
  const [framework, setFramework] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const url = `/api/assurance/control-posture${framework ? `?framework=${encodeURIComponent(framework)}` : ""}`;
  const { data, error, isLoading } = useSWR<ControlPostureReport>(
    url,
    (u: string) => fetcher<ControlPostureReport>(u),
  );

  let meta: React.ReactNode = null;
  if (isLoading) meta = <StatusDot intent="info" pulse size="sm" label="Loading…" />;
  else if (statusOf(error) === 401) meta = <StatusDot intent="danger" size="sm" label="Session expired" />;
  else if (error) meta = <StatusDot intent="warning" size="sm" label="Backend unavailable" />;
  else if (data) meta = <StatusDot intent="success" size="sm" label={`${data.summary.controls} controls · live`} />;

  const s = data?.summary;
  const controls = data?.controls ?? [];

  return (
    <PageShell
      eyebrow="Assurance · Compliance"
      title="Control Posture"
      description="Evidence-backed control status — every control traces to signed assurance evidence."
      meta={meta}
      density="tight"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="Controls" value={s?.controls ?? "—"} />
        <KPI label="Satisfied" value={s?.satisfied ?? "—"} intent="success" />
        <KPI label="Failing" value={s?.failing ?? "—"} intent="danger" />
        <KPI label="Unknown" value={s?.unknown ?? "—"} intent="neutral" />
      </div>

      <FilterBar label="Framework">
        {FRAMEWORKS.map((f) => (
          <FilterChip key={f || "ALL"} active={framework === f} onClick={() => setFramework(f)}>
            {f || "All"}
          </FilterChip>
        ))}
      </FilterBar>

      <Table>
        <THead>
          <TR>
            <TH>Control</TH>
            <TH>Status</TH>
            <TH>Pass</TH>
            <TH>Fail</TH>
            <TH>Concepts</TH>
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
          ) : controls.length === 0 ? (
            <TBodyEmpty colSpan={COLS}>
              <EmptyState
                variant="bordered"
                icon={<ShieldCheck className="text-[var(--matcha-300)]" size={28} />}
                title="No assurance evidence yet"
                description="Run a scan to generate signed evidence. Control posture appears here once detections are assured."
              />
            </TBodyEmpty>
          ) : (
            controls.map((c) => (
              <Fragment key={c.control}>
                <TR
                  interactive
                  onClick={() => setExpanded(expanded === c.control ? null : c.control)}
                  aria-expanded={expanded === c.control}
                >
                  <TD>{c.control}</TD>
                  <TD>
                    <Badge intent={STATUS_INTENT[c.status]}>{c.status}</Badge>
                  </TD>
                  <TD>{c.passing_results}</TD>
                  <TD>{c.failing_results}</TD>
                  <TD>{c.concepts.length ? c.concepts.join(", ") : "—"}</TD>
                  <TD>{relTime(c.last_evaluated_at)}</TD>
                  <TD>{c.latest_evidence_ids?.length ?? 0} record(s)</TD>
                </TR>
                {expanded === c.control && c.latest_evidence_ids?.length ? (
                  <TR>
                    <TD colSpan={COLS}>
                      <HStack gap="sm" className="flex-wrap">
                        <span className="text-xs text-stone-400">Trace to evidence:</span>
                        {c.latest_evidence_ids.map((id) => (
                          <EvidenceVerifyChip key={id} evidenceId={id} />
                        ))}
                      </HStack>
                    </TD>
                  </TR>
                ) : null}
              </Fragment>
            ))
          )}
        </TBody>
      </Table>
    </PageShell>
  );
}
