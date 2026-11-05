import Link from "next/link";
import { Card, DateTime, EmptyState, HStack, VStack } from "@/lib/ui";
import { sortedDrift, type Control, type DriftEvent, type Resource } from "@/lib/domain";
import { ControlStatusBadge } from "./StatusBadges";

/**
 * DriftSummary — "has anything broken again since it was fixed?".
 *
 * Drift is the product's recurring value, so it gets its own section rather
 * than being folded into failing controls. Resolved events stay visible: the
 * record that something drifted and was closed is the proof customers show.
 *
 * This is not a threat feed. Each entry is a control, a resource and a time.
 */

export function DriftSummary({
  drift,
  controls,
  resources,
  limit = 4,
}: {
  drift: DriftEvent[];
  controls: Control[];
  resources: Resource[];
  limit?: number;
}) {
  if (drift.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        title="No drift recorded"
        description="No control has moved from passing to failing since verification began."
      />
    );
  }

  const controlName = (id: string) => controls.find((c) => c.id === id)?.name ?? id;
  const resourceLabel = (id: string) => resources.find((r) => r.id === id)?.label ?? "a resource";
  const events = sortedDrift(drift).slice(0, limit);
  const open = drift.filter((d) => !d.resolvedAt).length;

  return (
    <VStack gap="sm">
      <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
        {open === 0
          ? "Every drift event has been closed and re-verified."
          : `${open} open drift event${open > 1 ? "s" : ""}.`}
      </p>

      <ul className="flex flex-col gap-2">
        {events.map((d) => {
          const resolved = Boolean(d.resolvedAt);
          return (
            <li key={d.id}>
              <Link
                href={`/dashboard/controls/${d.controlId}`}
                className="block rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                <Card density="compact" interactive>
                  <VStack gap="xs">
                    <HStack gap="sm" align="start" justify="between" className="flex-wrap">
                      <span className="text-[var(--text-sm)] text-[var(--fg)] min-w-0">
                        {controlName(d.controlId)}
                      </span>
                      {resolved ? (
                        <ControlStatusBadge status="PASS" size="xs" />
                      ) : (
                        <ControlStatusBadge status="DRIFTED" size="xs" />
                      )}
                    </HStack>
                    <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                      {resourceLabel(d.resourceId)} · detected{" "}
                      <DateTime value={d.detectedAt} variant="relative" />
                      {resolved && (
                        <>
                          {" · closed and re-verified "}
                          <DateTime value={d.resolvedAt} variant="relative" />
                        </>
                      )}
                    </p>
                  </VStack>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/dashboard/assurance/drift"
        className="text-[var(--text-xs)] underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] rounded-sm w-fit"
      >
        View all drift
      </Link>
    </VStack>
  );
}
