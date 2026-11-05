"use client";

import { Card, HStack, Section, Skeleton, VStack } from "@/lib/ui";
import { VerificationRunsTable } from "@/lib/product";
import { verificationTotals } from "@/lib/domain";
import { useVerificationRuns } from "@/lib/data";
import { QueryBoundary, SkeletonRows } from "../QueryBoundary";

/**
 * History — every run the product has recorded.
 *
 * Totals are counts, never rates. A percentage here would quietly assert
 * something about the resources nobody checked.
 */

function Total({ label, value }: { label: string; value: number }) {
  return (
    <VStack gap="xs" className="min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</span>
      <span className="text-[var(--text-lg)] tabular-nums text-[var(--fg)]">{value}</span>
    </VStack>
  );
}

export function HistoryScreen() {
  const runs = useVerificationRuns();

  return (
    <VStack gap="xl">
      <Section
        eyebrow="Totals"
        title="What the record holds"
        description="Counts across every run, including runs that did not complete."
      >
        <QueryBoundary
          query={runs}
          unavailableMessage="The full history of verification runs."
          skeleton={<Skeleton className="h-24 w-full" />}
        >
          {(data) => {
            const t = verificationTotals(data);
            return (
              <Card>
                <HStack gap="xl" className="flex-wrap">
                  <Total label="Runs recorded" value={t.runs} />
                  <Total label="Completed" value={t.completed} />
                  <Total label="Did not complete" value={t.failedRuns} />
                  <Total label="In progress" value={t.inFlight} />
                  <Total label="Control results" value={t.results} />
                  <Total label="Passed" value={t.passed} />
                  <Total label="Failed" value={t.failed} />
                  <Total label="Not assessed" value={t.notAssessed} />
                </HStack>
              </Card>
            );
          }}
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Runs"
        title="Verification history"
        description="Most recent first. A run that failed shows why it failed."
      >
        <QueryBoundary
          query={runs}
          unavailableMessage="The full history of verification runs."
          skeleton={<SkeletonRows count={6} height="h-12" />}
        >
          {(data) => <VerificationRunsTable runs={data} />}
        </QueryBoundary>
      </Section>
    </VStack>
  );
}
