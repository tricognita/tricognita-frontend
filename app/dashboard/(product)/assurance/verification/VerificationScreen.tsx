"use client";

import Link from "next/link";
import { Button, Card, DateTime, EmptyState, Section, Skeleton, VStack } from "@/lib/ui";
import { VerificationSummary } from "@/lib/product";
import { NOT_ASSESSED_REASON, nextVerificationAt, type NotAssessedReason } from "@/lib/domain";
import { useControls, useVerificationRuns } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary, SkeletonRows } from "../QueryBoundary";

/**
 * Verification — what ran, what is running, and what was not checked.
 *
 * The last section is the one customers rarely get: the controls the product
 * could not assess, and why. A screen that hides those reads cleaner and
 * proves less.
 */
export function VerificationScreen() {
  const { role } = useSession();
  const runs = useVerificationRuns();
  const controls = useControls();

  const canRun = canDo(role, "runVerification");
  const next = controls.data ? nextVerificationAt(controls.data) : undefined;

  return (
    <VStack gap="xl">
      <Section
        eyebrow="Now"
        title="Verification"
        description="A control result carries the time of the run that produced it."
        actions={
          canRun ? (
            <Button
              variant="secondary"
              size="sm"
              disabled
              title="On-demand verification arrives with the verification API. Controls are re-checked on schedule."
            >
              Run verification
            </Button>
          ) : null
        }
      >
        <VStack gap="md">
          {next && (
            <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              Next scheduled verification <DateTime value={next} variant="both" />.
            </p>
          )}
          <QueryBoundary
            query={runs}
            unavailableMessage="Scheduled and on-demand verification runs."
            skeleton={<SkeletonRows count={2} height="h-20" />}
          >
            {(data) => <VerificationSummary runs={data} />}
          </QueryBoundary>
        </VStack>
      </Section>

      <Section
        eyebrow="Coverage"
        title="Not assessed"
        description="Controls the last run could not evaluate, and the reason each one was skipped."
      >
        <QueryBoundary
          query={controls}
          unavailableMessage="Which controls were evaluated and which were skipped."
          skeleton={<Skeleton className="h-24 w-full" />}
        >
          {(data) => {
            const skipped = data.filter((c) => c.status === "NOT_ASSESSED");
            if (skipped.length === 0) {
              return (
                <EmptyState
                  variant="bordered"
                  title="Every control was assessed"
                  description="The last run returned a result for each control in your baseline."
                />
              );
            }
            const byReason = new Map<NotAssessedReason | "UNKNOWN", typeof skipped>();
            for (const c of skipped) {
              const key = c.notAssessedReason ?? "UNKNOWN";
              byReason.set(key, [...(byReason.get(key) ?? []), c]);
            }
            return (
              <VStack gap="sm">
                {[...byReason.entries()].map(([reason, group]) => (
                  <Card key={reason} density="compact">
                    <VStack gap="xs">
                      <span className="text-[var(--text-sm)] text-[var(--fg)]">
                        {reason === "UNKNOWN"
                          ? "Reason not recorded"
                          : NOT_ASSESSED_REASON[reason]}
                      </span>
                      <ul className="flex flex-wrap gap-x-3 gap-y-1">
                        {group.map((c) => (
                          <li key={c.id}>
                            <Link
                              href={`/dashboard/controls/${c.id}`}
                              className="text-[var(--text-xs)] text-[var(--fg-muted)] underline underline-offset-2 hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                            >
                              {c.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </VStack>
                  </Card>
                ))}
              </VStack>
            );
          }}
        </QueryBoundary>
      </Section>
    </VStack>
  );
}
