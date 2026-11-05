import Link from "next/link";
import { Card, DateTime, HStack, VStack } from "@/lib/ui";
import {
  REPORT_KIND,
  REPORT_KIND_MEANING,
  isReportDownloadable,
  type Report,
} from "@/lib/domain";
import { ReportStateBadge } from "./StatusBadges";

/**
 * ReportCard — one assurance output, stated as it actually is.
 *
 * The state decides what the card offers. A report that is still generating
 * shows no download, and a report that failed shows why it failed rather than
 * a retry that would do nothing. Formats are listed as a fact about the
 * document, never as a link that pretends to fetch one.
 */

export function ReportCard({
  report,
  href,
  action,
}: {
  report: Report;
  /** The product surface for this report, when one exists. */
  href?: string;
  /** Export control, already gated by the caller. */
  action?: React.ReactNode;
}) {
  const title = REPORT_KIND[report.kind];

  const body = (
    <VStack gap="sm">
      <HStack gap="sm" justify="between" align="start" className="flex-wrap">
        <VStack gap="xs" className="min-w-0">
          <span className="text-[var(--text-sm)] font-medium text-[var(--fg)]">{title}</span>
          <span className="text-[var(--text-xs)] text-[var(--fg-muted)] max-w-[60ch]">
            {REPORT_KIND_MEANING[report.kind]}
          </span>
        </VStack>
        <ReportStateBadge state={report.state} size="xs" />
      </HStack>

      <dl className="grid gap-2 sm:grid-cols-3 text-[var(--text-xs)]">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Period</dt>
          <dd className="text-[var(--fg)]">
            <DateTime value={report.periodStart} variant="absolute" withTime={false} />
            {" – "}
            <DateTime value={report.periodEnd} variant="absolute" withTime={false} />
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Generated</dt>
          <dd className="text-[var(--fg)]">
            {report.generatedAt ? (
              <DateTime value={report.generatedAt} variant="both" />
            ) : (
              <span className="text-[var(--fg-subtle)]">Not generated yet</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Formats</dt>
          <dd className="text-[var(--fg)]">
            {report.formats.length > 0 ? report.formats.join(", ") : "—"}
          </dd>
        </div>
      </dl>

      {report.summary && (
        <p className="text-[var(--text-xs)] text-[var(--fg-muted)] tabular-nums">
          As generated: {report.summary.controlsVerified} controls verified ·{" "}
          {report.summary.controlsFailing} failing · {report.summary.driftEvents} drift event
          {report.summary.driftEvents === 1 ? "" : "s"} · {report.summary.remediations} remediation
          {report.summary.remediations === 1 ? "" : "s"}
        </p>
      )}

      {report.state === "FAILED" && report.error && (
        <p className="text-[var(--text-xs)] text-[var(--status-danger)]">{report.error}</p>
      )}

      {(action || href) && (
        <HStack gap="sm" align="center" className="flex-wrap">
          {action}
          {href && (
            <Link
              href={href}
              className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
            >
              Open {title.toLowerCase()}
            </Link>
          )}
        </HStack>
      )}

      {!isReportDownloadable(report) && report.state === "GENERATING" && (
        <p className="text-[10px] text-[var(--fg-subtle)]">
          The summary below is read from the record while the document is produced.
        </p>
      )}
    </VStack>
  );

  return <Card>{body}</Card>;
}
