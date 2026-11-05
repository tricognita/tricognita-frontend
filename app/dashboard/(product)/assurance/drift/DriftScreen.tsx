"use client";

import { Section, VStack } from "@/lib/ui";
import { DriftList } from "@/lib/product";
import { openDrift, resolvedDrift } from "@/lib/domain";
import { useControls, useDriftEvents, useRemediations, useResources } from "@/lib/data";
import { QueryBoundary, SkeletonRows } from "../QueryBoundary";

/**
 * Drift — controls that passed and later failed.
 *
 * Split in two on purpose. Open drift is work; closed drift is proof the loop
 * ran. Deleting the closed half would make the page look better and the record
 * weaker.
 */
export function DriftScreen() {
  const drift = useDriftEvents();
  const controls = useControls();
  const resources = useResources();
  const remediations = useRemediations();

  return (
    <VStack gap="xl">
      <Section
        eyebrow="Open"
        title="Still failing"
        description="A control that was verified and has since stopped meeting its expected state."
      >
        <QueryBoundary
          query={drift}
          unavailableMessage="Controls that stop meeting their expected state after passing."
          skeleton={<SkeletonRows count={2} height="h-28" />}
        >
          {(data) => (
            <DriftList
              drift={openDrift(data)}
              controls={controls.data ?? []}
              resources={resources.data ?? []}
              remediations={remediations.data ?? []}
              emptyTitle="No open drift"
              emptyDescription="Every control that drifted has been closed and re-verified."
            />
          )}
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Closed"
        title="Drift that was resolved"
        description="Kept on the record: each of these was detected, fixed and verified again."
      >
        <QueryBoundary
          query={drift}
          unavailableMessage="Drift that has been closed and re-verified."
          skeleton={<SkeletonRows count={2} height="h-28" />}
        >
          {(data) => (
            <DriftList
              drift={resolvedDrift(data)}
              controls={controls.data ?? []}
              resources={resources.data ?? []}
              remediations={remediations.data ?? []}
              emptyTitle="No drift has been closed yet"
              emptyDescription="Once a drifted control is fixed and verified again, it stays listed here."
            />
          )}
        </QueryBoundary>
      </Section>
    </VStack>
  );
}
