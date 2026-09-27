"use client";

import { Button } from "@/lib/ui";
import { isReportDownloadable, type Report } from "@/lib/domain";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * ExportAction — an honest button.
 *
 * There is no report API behind this yet, so the control is rendered disabled
 * with the reason on it rather than wired to something that would appear to
 * work. A simulated download is worse than no download: the customer would
 * only discover the difference in front of their auditor.
 */
export function ExportAction({ report }: { report: Report }) {
  const { role } = useSession();
  if (!canDo(role, "exportReports")) return null;

  const reason = !isReportDownloadable(report)
    ? report.state === "GENERATING"
      ? "This document is still being produced."
      : report.state === "FAILED"
        ? "This document was not produced, so there is nothing to export."
        : "No document is available for this period."
    : "Export arrives with the reports API. The record below is live.";

  return (
    <Button variant="secondary" size="sm" disabled title={reason}>
      Export{report.formats.length > 0 ? ` (${report.formats.join(", ")})` : ""}
    </Button>
  );
}
