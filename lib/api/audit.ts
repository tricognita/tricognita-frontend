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

export async function fetchAuditEvents(before?: number): Promise<AuditPage> {
  const q = before ? `?before=${encodeURIComponent(String(before))}` : "";
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
