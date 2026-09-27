"use client";

import Link from "next/link";
import { AuthorizingState, EmptyState, NotAuthorizedState, Section, Skeleton, VStack } from "@/lib/ui";
import { EvidenceList, ReportCard } from "@/lib/product";
import {
  evidenceInPeriod,
  latestReportOfKind,
  periodRecord,
} from "@/lib/domain";
import { useControls, useDriftEvents, useEvidence, useReports, useVerificationRuns } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "../QueryBoundary";
import { ExportAction } from "../ExportAction";
import { PeriodFacts } from "../PeriodFacts";

/**
 * Monthly assurance — the recurring record for one calendar month.
 *
 * WHAT was checked, WHEN, what the RESULT was, what CHANGED, and what PROOF
 * exists. Counts only; a month with two failing controls says two, never a
 * grade derived from twenty-five passing ones.
 */
export function MonthlyScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const reports = useReports();
  const runs = useVerificationRuns();
  const evidence = useEvidence();
  const drift = useDriftEvents();
  const controls = useControls();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "exportReports")) {
    return <NotAuthorizedState subject="the monthly assurance report" />;
  }

  return (
    <QueryBoundary
      query={reports}
      unavailableMessage="The recurring monthly record of what was checked and what was found."
      skeleton={<Skeleton className="h-40 w-full" />}
    >
      {(data) => {
        const report = latestReportOfKind(data, "MONTHLY_ASSURANCE");
        if (!report) {
          return (
            <EmptyState
              variant="bordered"
              title="No monthly report yet"
              description="The first monthly report is produced after a full calendar month of verification."
            />
          );
        }

        const record =
          runs.data && evidence.data && drift.data
            ? periodRecord({
                runs: runs.data,
                drift: drift.data,
                evidence: evidence.data,
                start: report.periodStart,
                end: report.periodEnd,
              })
            : undefined;

        const periodEvidence = evidence.data
          ? evidenceInPeriod(evidence.data, report.periodStart, report.periodEnd)
          : [];

        return (
          <VStack gap="xl">
            <Section
              eyebrow="The report"
              title="Monthly assurance"
              description="The document itself, and the counts recorded when it was generated."
              spacing="sm"
            >
              <ReportCard report={report} action={<ExportAction report={report} />} />
            </Section>

            <Section
              eyebrow="The record"
              title="Verification activity in this period"
              description="Read from the retained record now, so it can be checked against the document above."
              spacing="sm"
            >
              <QueryBoundary
                query={runs}
                unavailableMessage="Verification runs for this period."
                skeleton={<Skeleton className="h-28 w-full" />}
              >
                {() =>
                  record ? (
                    <PeriodFacts
                      record={record}
                      start={report.periodStart}
                      end={report.periodEnd}
                    />
                  ) : (
                    <Skeleton className="h-28 w-full" />
                  )
                }
              </QueryBoundary>
            </Section>

            <Section
              eyebrow="Proof"
              title="Evidence from this period"
              description="Each record names the control it supports and the run that produced it."
              spacing="sm"
            >
              <QueryBoundary
                query={evidence}
                unavailableMessage="Evidence records for this period."
                skeleton={<Skeleton className="h-32 w-full" />}
              >
                {() => (
                  <EvidenceList
                    evidence={periodEvidence}
                    controls={controls.data ?? []}
                    runs={runs.data ?? []}
                    emptyTitle="No evidence records fall inside this period"
                    emptyDescription="Evidence currently retained was recorded outside these dates. The full record is on the Evidence page."
                  />
                )}
              </QueryBoundary>
            </Section>

            <nav aria-label="Related surfaces" className="flex flex-wrap gap-x-4 gap-y-2">
              <Link
                href="/dashboard/assurance/history"
                className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                Verification history
              </Link>
              <Link
                href="/dashboard/reports/evidence"
                className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                All evidence
              </Link>
            </nav>
          </VStack>
        );
      }}
    </QueryBoundary>
  );
}
