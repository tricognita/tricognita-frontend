import type { AuditEvent } from "@/lib/domain";
import { apiGet } from "./client";

interface EventDTO {
  seq: number;
  actor: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditPage {
  events: AuditEvent[];
  /** Pass as `before` to read the next older page; null when this was the last. */
  nextBefore: number | null;
}

function details(m: Record<string, unknown> | undefined): AuditEvent["details"] {
  const out: AuditEvent["details"] = {};
  for (const [k, v] of Object.entries(m ?? {})) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
}

export interface AuditFilters {
  actor?: string;
  action?: string;
  /** YYYY-MM-DD, inclusive. */
  from?: string;
  /** YYYY-MM-DD, inclusive (the whole day). */
  to?: string;
}

/** The first thing wrong with the filters, in words, or null. The API checks the same rules. */
export function auditFilterProblem(f: AuditFilters): string | null {
  const date = /^\d{4}-\d{2}-\d{2}$/;
  for (const [k, v] of [["From", f.from], ["To", f.to]] as const) {
    if (v && (!date.test(v) || Number.isNaN(Date.parse(v)))) return `${k} must be a real date (YYYY-MM-DD).`;
  }
  if (f.from && f.to && f.from > f.to) return "From must not be after To.";
  if ((f.actor ?? "").trim().length > 100 || (f.action ?? "").trim().length > 100) return "Who and Action must be at most 100 characters.";
  return null;
}

export async function fetchAuditEvents(filters: AuditFilters = {}, before?: number): Promise<AuditPage> {
  const p = new URLSearchParams();
  for (const k of ["actor", "action", "from", "to"] as const) {
    const v = filters[k]?.trim();
    if (v) p.set(k, v);
  }
  if (before) p.set("before", String(before));
  const q = p.size ? `?${p.toString()}` : "";
  const b = await apiGet<{ events: EventDTO[]; nextBefore?: number }>(`/api/audit/events${q}`, "the audit trail");
  return {
    events: (b.events ?? []).map((e) => ({
      seq: e.seq,
      actor: e.actor,
      action: e.action,
      resource: e.resource,
      details: details(e.metadata),
      occurredAt: e.createdAt,
    })),
    nextBefore: b.nextBefore ? b.nextBefore : null,
  };
}
