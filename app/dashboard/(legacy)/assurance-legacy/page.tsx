"use client";

import { useState } from "react";
import useSWRInfinite from "swr/infinite";
import { useSearchParams } from "next/navigation";
import { ScrollText } from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  FilterChip,
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
} from "@/lib/ui";
import { fetcher, statusOf } from "@/lib/swr-fetcher";
import type { LedgerPage } from "@/lib/assurance-types";
import { EvidenceVerifyChip } from "../components/EvidenceVerifyChip";

const STATUSES = ["ALL", "passing", "failing"] as const;
type StatusFilter = (typeof STATUSES)[number];
const PAGE_SIZE = 50;
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

export default function VerdictLedgerPage() {
  const searchParams = useSearchParams();
  const concept = searchParams?.get("concept") ?? "";
  const [status, setStatus] = useState<StatusFilter>("ALL");

  const getKey = (index: number, prev: LedgerPage | null) => {
    if (prev && !prev.next_cursor) return null; // end of ledger
    const p = new URLSearchParams();
    if (status !== "ALL") p.set("status", status);
    if (concept) p.set("concept", concept);
    p.set("limit", String(PAGE_SIZE));
    if (index > 0 && prev?.next_cursor) p.set("cursor", prev.next_cursor);
    return `/api/assurance/ledger?${p.toString()}`;
  };

  const { data, error, isLoading, size, setSize, isValidating } = useSWRInfinite<LedgerPage>(
    getKey,
    (u: string) => fetcher<LedgerPage>(u),
  );

  const verdicts = data?.flatMap((page) => page.verdicts ?? []) ?? [];
  const last = data?.[data.length - 1];
  const hasMore = Boolean(last?.next_cursor);
  const loadingMore = isValidating && size > 0 && data?.length !== size;

  let meta: React.ReactNode = null;
  if (isLoading) meta = <StatusDot intent="info" pulse size="sm" label="Loading…" />;
  else if (statusOf(error) === 401) meta = <StatusDot intent="danger" size="sm" label="Session expired" />;
  else if (error) meta = <StatusDot intent="warning" size="sm" label="Backend unavailable" />;
  else meta = <StatusDot intent="success" size="sm" label={`${verdicts.length} verdicts · live`} />;

  return (
    <PageShell
      eyebrow="Assurance · Ledger"
      title="Verdict Ledger"
      description={
        concept
          ? `Assurance verdicts for ${concept} — every verdict traces to signed evidence.`
          : "Every assurance verdict, newest first — each traces to signed, verifiable evidence."
      }
      meta={meta}
      density="tight"
    >
      <FilterBar label="Verdict">
        {STATUSES.map((st) => (
          <FilterChip
            key={st}
            active={status === st}
            intent={st === "failing" ? "danger" : st === "passing" ? "success" : "neutral"}
            onClick={() => setStatus(st)}
          >
            {st === "ALL" ? "All" : st}
          </FilterChip>
        ))}
      </FilterBar>

      <Table>
        <THead>
          <TR>
            <TH>Evaluated</TH>
            <TH>Contract</TH>
            <TH>Concept</TH>
            <TH>Verdict</TH>
            <TH>Controls</TH>
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
                title="Ledger unavailable"
                description="The assurance backend could not be reached. Try again shortly."
              />
            </TBodyEmpty>
          ) : verdicts.length === 0 ? (
            <TBodyEmpty colSpan={COLS}>
              <EmptyState
                variant="bordered"
                icon={<ScrollText className="text-[var(--matcha-300)]" size={28} />}
                title="No verdicts yet"
                description="Run a scan to generate assurance verdicts. Each is recorded here with verifiable evidence."
              />
            </TBodyEmpty>
          ) : (
            verdicts.map((v) => (
              <TR key={v.assurance_result_id}>
                <TD>{relTime(v.evaluated_at)}</TD>
                <TD>{v.contract_id}</TD>
                <TD>{v.concept ?? "—"}</TD>
                <TD>
                  <Badge intent={v.passed ? "success" : "danger"}>{v.passed ? "PASS" : "FAIL"}</Badge>
                </TD>
                <TD>{v.controls?.length ? v.controls.join(", ") : "—"}</TD>
                <TD>
                  <EvidenceVerifyChip evidenceId={v.evidence_id} />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" size="sm" onClick={() => setSize(size + 1)} disabled={loadingMore}>
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </PageShell>
  );
}
