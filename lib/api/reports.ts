import type { DriftEvent, Report, ReportKind } from "@/lib/domain";
import { apiGet, apiPost } from "./client";

/**
 * Period reports and drift, as the API serves them.
 *
 * A report is a stored snapshot: this file maps it, it never computes one. The summary on a card is
 * "as generated" and the page reads the retained record again beside it, so the two are never merged.
 */

interface ReportDTO {
  id: string;
  kind: string;
  periodStart: string;
  periodEnd: string;
  state: string;
  generatedAt: string;
  generatedBy?: string;
  downloadUrl: string;
  formats: string[];
  summary: { controlsVerified: number; controlsFailing: number; driftEvents: number; remediations: number };
  signed?: boolean;
}

const KINDS: ReportKind[] = ["MONTHLY_ASSURANCE", "CUSTOMER_REVIEW", "EVIDENCE_EXPORT"];
const FORMATS = ["PDF", "CSV", "JSON"] as const;

export function toReport(d: ReportDTO): Report {
  return {
    id: d.id,
    kind: (KINDS as string[]).includes(d.kind) ? (d.kind as ReportKind) : "MONTHLY_ASSURANCE",
    periodStart: d.periodStart,
    periodEnd: d.periodEnd,
    // Only the states the API can actually produce are trusted; anything else is not a ready document.
    state: d.state === "READY" ? "READY" : d.state === "GENERATING" ? "GENERATING" : d.state === "FAILED" ? "FAILED" : "UNAVAILABLE",
    generatedAt: d.generatedAt || undefined,
    generatedBy: d.generatedBy || undefined,
    downloadUrl: d.downloadUrl || undefined,
    formats: d.formats.filter((f): f is (typeof FORMATS)[number] => (FORMATS as readonly string[]).includes(f)),
    signed: d.signed === true,
    summary: d.summary,
  };
}

export async function fetchReports(): Promise<Report[]> {
  const b = await apiGet<{ reports: ReportDTO[] }>("/api/reports", "reports");
  return (b.reports ?? []).map(toReport);
}

export async function generateReport(input: { kind: "MONTHLY_ASSURANCE" | "CUSTOMER_REVIEW"; periodStart: string; periodEnd: string }): Promise<Report> {
  return toReport(await apiPost<ReportDTO>("/api/reports", "generate a report", input));
}

/** The link for one format of a stored report; the BFF relays the file untouched. */
export function reportDownloadHref(report: Report, format: "csv" | "json"): string | undefined {
  if (!report.downloadUrl) return undefined;
  return report.downloadUrl.replace(/format=[a-z]+/i, `format=${format}`);
}

/** The last `count` fully finished calendar months (UTC), newest first. A month still in progress is never offered. */
export function monthOptions(now: Date, count = 12): Array<{ label: string; start: string; end: string }> {
  const out: Array<{ label: string; start: string; end: string }> = [];
  for (let i = 1; i <= count; i++) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    out.push({
      label: start.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
      start: start.toISOString().replace(/\.\d{3}Z$/, "Z"),
      end: end.toISOString().replace(/\.\d{3}Z$/, "Z"),
    });
  }
  return out;
}

/** A trailing period ending now, to the second (UTC). */
export function trailingPeriod(days: number, now: Date): { start: string; end: string } {
  const end = new Date(Math.floor(now.getTime() / 1000) * 1000);
  const start = new Date(end.getTime() - days * 86_400_000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  return { start: iso(start), end: iso(end) };
}

interface DriftDTO {
  id: string;
  controlId: string;
  resourceId: string;
  detectedAt: string;
  previousStatus: string;
  currentStatus: string;
  detectedByRunId: string;
  resolvedAt?: string;
  resolvedByRunId?: string;
}

export async function fetchDriftEvents(): Promise<DriftEvent[]> {
  const b = await apiGet<{ events: DriftDTO[] }>("/api/drift", "drift events");
  return (b.events ?? []).map((e) => ({
    id: e.id,
    controlId: e.controlId,
    resourceId: e.resourceId,
    detectedAt: e.detectedAt,
    previousStatus: "PASS" as const,
    currentStatus: "FAIL" as const,
    detectedByRunId: e.detectedByRunId,
    resolvedAt: e.resolvedAt || undefined,
    resolvedByRunId: e.resolvedByRunId || undefined,
  }));
}
