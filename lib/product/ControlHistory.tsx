import { DateTime, EmptyState, Timeline, TimelineItem } from "@/lib/ui";
import type { ControlEvent, ControlEventKind } from "@/lib/domain";

/**
 * ControlHistory — this control's life, newest first.
 *
 * Verification results, drift and fixes on one timeline, because the customer's
 * question is chronological: was it passing, did it break, who fixed it, did the
 * fix hold. Resolved drift stays on the record; it is the proof.
 */

const INTENT: Record<ControlEventKind, "success" | "danger" | "warning" | "info" | "neutral"> = {
  VERIFIED: "success",
  FAILING: "danger",
  NOT_ASSESSED: "neutral",
  DRIFT_DETECTED: "warning",
  DRIFT_RESOLVED: "success",
  REMEDIATION: "info",
};

export function ControlHistory({ events, limit }: { events: ControlEvent[]; limit?: number }) {
  if (events.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        title="No history yet"
        description="History begins with this control's first verification."
      />
    );
  }

  const shown = limit ? events.slice(0, limit) : events;

  return (
    <Timeline density="comfortable">
      {shown.map((e) => (
        <TimelineItem
          key={e.id}
          intent={INTENT[e.kind]}
          title={e.title}
          time={<DateTime value={e.at} variant="both" />}
        >
          {e.detail ? (
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">{e.detail}</span>
          ) : null}
        </TimelineItem>
      ))}
    </Timeline>
  );
}
