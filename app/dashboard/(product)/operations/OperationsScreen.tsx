"use client";

import Link from "next/link";
import {
  AuthorizingState,
  Card,
  DateTime,
  EmptyState,
  HStack,
  NotAuthorizedState,
  PageHeader,
  Section,
  Skeleton,
  VStack,
} from "@/lib/ui";
import { VerificationStatusBadge } from "@/lib/product";
import {
  ACCOUNT_CONNECTION_LABEL,
  failedRuns,
  remediationQueue,
  remediationsNeedingAction,
  unhealthyAccounts,
  type RemediationQueue,
} from "@/lib/domain";
import { useCloudAccounts, useRemediations, useVerificationRuns } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "../remediation/QueryBoundary";

/**
 * Operations — what needs a person today.
 *
 * Deliberately thin. It is a queue, not a second dashboard: three questions
 * (what is waiting on someone, what did not run, what cannot be reached) and
 * a way through to the work. Every number here is a count of records that
 * exist; none is a metric assembled for the page.
 */

const QUEUE_ROWS: { key: keyof RemediationQueue; label: string; hint: string }[] = [
  { key: "awaitingApproval", label: "Waiting for approval", hint: "Nothing changes until someone approves." },
  { key: "needsAttention", label: "Did not apply", hint: "The control is still failing." },
  { key: "awaitingVerification", label: "Applied, not yet verified", hint: "Not recorded as fixed yet." },
  { key: "inFlight", label: "Approved or running", hint: "In progress." },
];

export function OperationsScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const remediations = useRemediations();
  const runs = useVerificationRuns();
  const accounts = useCloudAccounts();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "viewOperations")) {
    return (
      <VStack gap="lg">
        <PageHeader title="Operations" description="Work that needs someone today." />
        <NotAuthorizedState subject="the operations queue" askWho="an administrator" />
      </VStack>
    );
  }

  return (
    <VStack gap="lg">
      <PageHeader
        title="Operations"
        description="What is waiting on a person: changes to decide, runs that did not complete, and accounts we cannot read."
      />

      <Section
        eyebrow="Queue"
        title="Remediation waiting on someone"
        description="Counted from the remediation record, not estimated."
        spacing="sm"
      >
        <QueryBoundary
          query={remediations}
          unavailableMessage="Changes requested against your cloud and their approval state."
          skeleton={<Skeleton className="h-32 w-full" />}
        >
          {(data) => {
            const queue = remediationQueue(data);
            const waiting = remediationsNeedingAction(queue);
            return (
              <Card>
                <VStack gap="md">
                  {waiting === 0 ? (
                    <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                      No remediation is waiting on a person.
                    </p>
                  ) : (
                    <ul className="flex flex-col">
                      {QUEUE_ROWS.map((row) => (
                        <li
                          key={row.key}
                          className="flex flex-wrap items-baseline justify-between gap-2 py-2 border-b border-[var(--border-subtle)] last:border-b-0"
                        >
                          <VStack gap="xs" className="min-w-0">
                            <span className="text-[var(--text-sm)] text-[var(--fg)]">
                              {row.label}
                            </span>
                            <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                              {row.hint}
                            </span>
                          </VStack>
                          <span className="text-[var(--text-lg)] tabular-nums text-[var(--fg)]">
                            {queue[row.key].length}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href="/dashboard/remediation"
                    className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] w-fit"
                  >
                    Open the remediation queue
                  </Link>
                </VStack>
              </Card>
            );
          }}
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Verification"
        title="Runs that did not complete"
        description="A run that failed leaves controls unchecked. It is not a control result."
        spacing="sm"
      >
        <QueryBoundary
          query={runs}
          unavailableMessage="Scheduled and on-demand verification runs."
          skeleton={<Skeleton className="h-24 w-full" />}
        >
          {(data) => {
            const failed = failedRuns(data);
            return failed.length === 0 ? (
              <EmptyState
                variant="bordered"
                title="Every run completed"
                description="No verification run on record failed to finish."
              />
            ) : (
              <Card>
                <ul className="flex flex-col gap-2">
                  {failed.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                      <VStack gap="xs" className="min-w-0">
                        <HStack gap="sm" align="center" className="flex-wrap">
                          <DateTime
                            value={r.startedAt}
                            variant="both"
                            className="text-[var(--text-sm)] text-[var(--fg)]"
                          />
                          <VerificationStatusBadge state={r.state} size="xs" />
                        </HStack>
                        <span className="text-[var(--text-xs)] text-[var(--fg-muted)] break-words">
                          {r.error?.message ?? "The run did not complete."}
                        </span>
                      </VStack>
                      <Link
                        href="/dashboard/assurance/history"
                        className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                      >
                        History
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          }}
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Access"
        title="Accounts we cannot read cleanly"
        description="A control cannot be checked on an account the connected role cannot reach."
        spacing="sm"
      >
        <QueryBoundary
          query={accounts}
          unavailableMessage="The cloud accounts connected to your tenant and their connection state."
          skeleton={<Skeleton className="h-24 w-full" />}
        >
          {(data) => {
            const unhealthy = unhealthyAccounts(data);
            return unhealthy.length === 0 ? (
              <EmptyState
                variant="bordered"
                title="Every account is connected"
                description="All connected accounts can be read by the role you granted."
              />
            ) : (
              <Card>
                <ul className="flex flex-col gap-2">
                  {unhealthy.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[var(--text-sm)] text-[var(--fg)] break-words">
                        {a.alias}
                      </span>
                      <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                        {ACCOUNT_CONNECTION_LABEL[a.connection]}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          }}
        </QueryBoundary>
      </Section>
    </VStack>
  );
}
