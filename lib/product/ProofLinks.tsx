import Link from "next/link";
import { Card, DateTime, HStack, VStack } from "@/lib/ui";
import { REPORT_STATE, type Evidence, type Report } from "@/lib/domain";

/**
 * ProofLinks — "can I show someone?".
 *
 * The end of the loop: what was verified, and the two documents customers
 * actually send outward. Report state is shown honestly — a report that is
 * still generating says so rather than offering a download that is not there.
 */

function reportOf(reports: Report[], kind: Report["kind"]): Report | undefined {
  return reports.find((r) => r.kind === kind);
}

export function ProofLinks({
  reports,
  evidence,
}: {
  reports: Report[];
  evidence: Evidence[];
}) {
  const monthly = reportOf(reports, "MONTHLY_ASSURANCE");
  const review = reportOf(reports, "CUSTOMER_REVIEW");
  const latestEvidence = [...evidence].sort(
    (a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt),
  )[0];

  const tiles = [
    {
      href: "/dashboard/reports/monthly",
      title: "Monthly assurance",
      body: monthly ? (
        <>
          {REPORT_STATE[monthly.state].label}
          {monthly.generatedAt && (
            <>
              {" · "}
              <DateTime value={monthly.generatedAt} variant="relative" />
            </>
          )}
        </>
      ) : (
        "No report yet"
      ),
    },
    {
      href: "/dashboard/reports/customer-review",
      title: "Customer review",
      body: review ? REPORT_STATE[review.state].label : "Prepare a summary for a security review",
    },
    {
      href: "/dashboard/reports/evidence",
      title: "Evidence",
      body: latestEvidence ? (
        <>
          {evidence.length} records · latest{" "}
          <DateTime value={latestEvidence.recordedAt} variant="relative" />
        </>
      ) : (
        "Recorded from the first verification"
      ),
    },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
        >
          <Card density="compact" interactive className="h-full">
            <VStack gap="xs">
              <HStack justify="between" align="center" gap="sm">
                <span className="text-[var(--text-sm)] font-medium text-[var(--fg)]">{t.title}</span>
                <span aria-hidden="true" className="text-[var(--fg-subtle)]">→</span>
              </HStack>
              <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">{t.body}</span>
            </VStack>
          </Card>
        </Link>
      ))}
    </div>
  );
}
