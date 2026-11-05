"use client";

import {
  AuthorizingState, EmptyState, NotAuthorizedState, Section, VStack } from "@/lib/ui";
import { ReportCard } from "@/lib/product";
import { REPORT_KIND, reportsByPeriod, type Report, type ReportKind } from "@/lib/domain";
import { useReports } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "./QueryBoundary";
import { ExportAction } from "./ExportAction";

/**
 * Reports index — the three assurance outputs, not a document library.
 *
 * Each kind gets its own section so the distinction between the recurring
 * report, the customer-facing summary and the underlying evidence stays
 * obvious. A kind with no record says so in its own words.
 */

const SURFACE: Record<ReportKind, string> = {
  MONTHLY_ASSURANCE: "/dashboard/reports/monthly",
  CUSTOMER_REVIEW: "/dashboard/reports/customer-review",
  EVIDENCE_EXPORT: "/dashboard/reports/evidence",
};

const NOTHING_YET: Record<ReportKind, string> = {
  MONTHLY_ASSURANCE: "The first monthly report is produced after a full calendar month of verification.",
  CUSTOMER_REVIEW: "A customer review summary is drawn from the record whenever you need one.",
  EVIDENCE_EXPORT: "Evidence is recorded from the first verification run; an export can be produced from it.",
};

const ORDER: ReportKind[] = ["MONTHLY_ASSURANCE", "CUSTOMER_REVIEW", "EVIDENCE_EXPORT"];

function KindSection({ kind, reports }: { kind: ReportKind; reports: Report[] }) {
  const forKind = reportsByPeriod(reports.filter((r) => r.kind === kind));
  return (
    <Section eyebrow={REPORT_KIND[kind]} title={REPORT_KIND[kind]} spacing="sm">
      {forKind.length === 0 ? (
        <EmptyState
          variant="bordered"
          title={`No ${REPORT_KIND[kind].toLowerCase()} on record`}
          description={NOTHING_YET[kind]}
        />
      ) : (
        <VStack gap="sm">
          {forKind.map((r) => (
            <ReportCard key={r.id} report={r} href={SURFACE[r.kind]} action={<ExportAction report={r} />} />
          ))}
        </VStack>
      )}
    </Section>
  );
}

export function ReportsScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const reports = useReports();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "exportReports")) {
    return <NotAuthorizedState subject="assurance reports" />;
  }

  return (
    <QueryBoundary
      query={reports}
      unavailableMessage="Monthly assurance reports, customer review summaries and evidence exports."
    >
      {(data) =>
        data.length === 0 ? (
          <EmptyState
            variant="bordered"
            title="No reports yet"
            description="The first monthly report is produced after a full calendar month of verification. Evidence is recorded from the first run."
          />
        ) : (
          <VStack gap="lg">
            {ORDER.map((kind) => (
              <KindSection key={kind} kind={kind} reports={data} />
            ))}
          </VStack>
        )
      }
    </QueryBoundary>
  );
}
