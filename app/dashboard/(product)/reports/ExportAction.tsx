"use client";

import { Button } from "@/lib/ui";
import { isReportDownloadable, type Report } from "@/lib/domain";
import { reportDownloadHref } from "@/lib/api/reports";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * ExportAction — an honest button.
 *
 * A report that has a document behind it offers that document, as CSV (opens in a spreadsheet) and as
 * JSON (the stored record itself, with its hash and signature status). Anything without one says why it
 * has nothing to export instead of offering a download that would not work.
 */
const LINK =
  "inline-flex items-center rounded-[var(--radius-tight)] border border-[var(--border-default)] px-2.5 py-1.5 text-[var(--text-xs)] text-[var(--fg)] hover:bg-[var(--surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]";

export function ExportAction({ report }: { report: Report }) {
  const { role } = useSession();
  if (!canDo(role, "exportReports")) return null;

  if (isReportDownloadable(report)) {
    const csv = reportDownloadHref(report, "csv");
    const json = reportDownloadHref(report, "json");
    return (
      <div className="flex flex-wrap items-center gap-2" aria-label="Export this report">
        {csv && report.formats.includes("CSV") && (
          <a className={LINK} href={csv} download>
            Download CSV
          </a>
        )}
        {json && report.formats.includes("JSON") && (
          <a className={LINK} href={json} download>
            Download JSON
          </a>
        )}
      </div>
    );
  }

  const reason =
    report.state === "GENERATING"
      ? "This document is still being produced."
      : report.state === "FAILED"
        ? "This document was not produced, so there is nothing to export."
        : "No document is available for this period.";

  return (
    <Button variant="secondary" size="sm" disabled title={reason}>
      Export
    </Button>
  );
}
