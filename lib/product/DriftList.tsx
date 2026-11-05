import Link from "next/link";
import { Card, DateTime, EmptyState, HStack, VStack } from "@/lib/ui";
import type { Control, DriftEvent, Remediation, Resource } from "@/lib/domain";
import { ControlStatusBadge } from "./StatusBadges";

/**
 * DriftList — what changed after verification.
 *
 * Drift is a state change, not an attack: a control that was verified is now
 * failing. Each entry reads as that sentence — control, resource, when it was
 * last good, when it broke, and whether it has been closed since.
 */
export function DriftList({
  drift,
  controls,
  resources,
  remediations = [],
  emptyTitle = "No drift recorded",
  emptyDescription = "No control has moved from passing to failing.",
}: {
  drift: DriftEvent[];
  controls: Control[];
  resources: Resource[];
  /** Used only to resolve a recorded remediationId into something readable. */
  remediations?: Remediation[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (drift.length === 0) {
    return <EmptyState variant="bordered" title={emptyTitle} description={emptyDescription} />;
  }

  const controlById = new Map(controls.map((c) => [c.id, c]));
  const resourceById = new Map(resources.map((r) => [r.id, r]));
  const remediationById = new Map(remediations.map((m) => [m.id, m]));

  return (
    <ul className="flex flex-col gap-2">
      {drift.map((d) => {
        const control = controlById.get(d.controlId);
        const resource = resourceById.get(d.resourceId);
        const remediation = d.remediationId ? remediationById.get(d.remediationId) : undefined;
        const resolved = Boolean(d.resolvedAt);
        return (
          <li key={d.id}>
            <Card>
              <VStack gap="sm">
                <HStack gap="sm" justify="between" align="start" className="flex-wrap">
                  <Link
                    href={`/dashboard/controls/${d.controlId}`}
                    className="text-[var(--text-sm)] font-medium text-[var(--fg)] underline-offset-2 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                  >
                    {control?.name ?? d.controlId}
                  </Link>
                  <ControlStatusBadge status={resolved ? "PASS" : "DRIFTED"} size="xs" />
                </HStack>

                <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                  {resource
                    ? `${resource.label} · ${resource.service} · ${resource.regionLabel}`
                    : "Affected resource"}
                </p>

                {/* previous verified state → drift → current state */}
                <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--text-xs)] text-[var(--fg-muted)]">
                  <li className="flex items-center gap-1.5">
                    <ControlStatusBadge status="PASS" size="xs" />
                    <span>verified</span>
                  </li>
                  <li aria-hidden="true" className="text-[var(--fg-subtle)]">→</li>
                  <li className="flex items-center gap-1.5">
                    <ControlStatusBadge status="DRIFTED" size="xs" />
                    <span>
                      detected <DateTime value={d.detectedAt} variant="relative" />
                    </span>
                  </li>
                  <li aria-hidden="true" className="text-[var(--fg-subtle)]">→</li>
                  <li className="flex items-center gap-1.5">
                    {resolved ? (
                      <>
                        <ControlStatusBadge status="PASS" size="xs" />
                        <span>
                          re-verified <DateTime value={d.resolvedAt} variant="relative" />
                        </span>
                      </>
                    ) : (
                      <>
                        <ControlStatusBadge status="FAIL" size="xs" />
                        <span>still failing</span>
                      </>
                    )}
                  </li>
                </ol>

                {/* Drift is only half an answer; the fix is the other half.
                    The event records a remediationId, so the route exists —
                    it was simply never offered. The id itself is never shown. */}
                {d.remediationId ? (
                  <HStack gap="sm" align="center" className="flex-wrap">
                    <span className="text-[var(--text-xs)] text-[var(--fg-muted)] break-words">
                      {remediation ? `Fix: ${remediation.summary}` : "A fix was recorded for this drift."}
                    </span>
                    <Link
                      href="/dashboard/remediation"
                      className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                    >
                      Open the remediation queue
                    </Link>
                  </HStack>
                ) : (
                  <p className="text-[var(--text-xs)] text-[var(--fg-subtle)]">
                    {resolved
                      ? "No fix was recorded against this drift; a later verification found the control passing again."
                      : "No fix has been requested for this drift yet."}
                  </p>
                )}

                {d.notifiedRoutes && d.notifiedRoutes.length > 0 && (
                  <p className="text-[10px] text-[var(--fg-subtle)]">
                    Notified: {d.notifiedRoutes.join(", ")}
                  </p>
                )}
              </VStack>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
