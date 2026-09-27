"use client";

import Link from "next/link";
import {
  AuthorizingState,
  Card,
  DateTime,
  EmptyState,
  HStack,
  NotAuthorizedState,
  Section,
  Skeleton,
  VStack,
} from "@/lib/ui";
import { ControlStatusBadge, EvidenceList, ReportCard } from "@/lib/product";
import {
  activeExceptions,
  countControls,
  driftInPeriod,
  evidenceInPeriod,
  latestReportOfKind,
  periodRecord,
  type Control,
} from "@/lib/domain";
import {
  useControls,
  useDriftEvents,
  useEvidence,
  useExceptions,
  useReports,
  useVerificationRuns,
} from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "../QueryBoundary";
import { ExportAction } from "../ExportAction";
import { PeriodFacts } from "../PeriodFacts";

/**
 * Customer review — the short answer to "how do you secure your cloud?".
 *
 * Everything here is customer-safe: control names, states, dates and counts.
 * No tenant id, no account id, no ARN, no resource identifier, no internal
 * reference. The summary is read live from the record, so it is useful even
 * while the document itself is still being produced.
 */

function ControlLine({ control }: { control: Control }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--border-subtle)] last:border-b-0">
      <span className="text-[var(--text-sm)] text-[var(--fg)] min-w-0 break-words">
        {control.name}
      </span>
      <HStack gap="sm" align="center" className="flex-wrap">
        {control.lastVerifiedAt && (
          <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
            Last verified <DateTime value={control.lastVerifiedAt} variant="relative" />
          </span>
        )}
        <ControlStatusBadge
          status={control.status}
          reason={control.notAssessedReason}
          size="xs"
        />
      </HStack>
    </li>
  );
}

export function CustomerReviewScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const reports = useReports();
  const controls = useControls();
  const runs = useVerificationRuns();
  const drift = useDriftEvents();
  const evidence = useEvidence();
  const exceptions = useExceptions();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "exportReports")) {
    return <NotAuthorizedState subject="the customer review summary" />;
  }

  return (
    <QueryBoundary
      query={reports}
      unavailableMessage="A short, customer-safe summary of your cloud control assurance."
      skeleton={<Skeleton className="h-40 w-full" />}
    >
      {(data) => {
        const report = latestReportOfKind(data, "CUSTOMER_REVIEW");
        if (!report) {
          return (
            <EmptyState
              variant="bordered"
              title="No customer review summary yet"
              description="A summary is drawn from the record whenever a customer asks about your cloud controls."
            />
          );
        }

        const start = report.periodStart;
        const end = report.periodEnd;

        const record =
          runs.data && drift.data && evidence.data
            ? periodRecord({ runs: runs.data, drift: drift.data, evidence: evidence.data, start, end })
            : undefined;

        const counts = controls.data ? countControls(controls.data) : undefined;
        const periodDrift = drift.data ? driftInPeriod(drift.data, start, end) : [];
        const periodEvidence = evidence.data ? evidenceInPeriod(evidence.data, start, end) : [];
        const active = exceptions.data ? activeExceptions(exceptions.data) : [];

        return (
          <VStack gap="xl">
            <Section
              eyebrow="The document"
              title="Customer review"
              description="What is sent outward. The summary below is the same record the document is drawn from."
              spacing="sm"
            >
              <ReportCard report={report} action={<ExportAction report={report} />} />
            </Section>

            <Section
              eyebrow="What was checked"
              title="Controls verified in this period"
              description="Every control in the baseline, by its result at the last verification."
              spacing="sm"
            >
              <QueryBoundary
                query={controls}
                unavailableMessage="Your control baseline and its current results."
                skeleton={<Skeleton className="h-40 w-full" />}
              >
                {(list) =>
                  list.length === 0 ? (
                    <EmptyState
                      variant="bordered"
                      title="No controls yet"
                      description="Your baseline is set during onboarding, then verified for the first time."
                    />
                  ) : (
                    <VStack gap="sm">
                      {counts && (
                        <p className="text-[var(--text-xs)] text-[var(--fg-muted)] tabular-nums">
                          {counts.total} controls · {counts.passing} passing · {counts.failing}{" "}
                          failing · {counts.drifted} drifted · {counts.exception} under exception ·{" "}
                          {counts.notAssessed} not assessed
                        </p>
                      )}
                      <Card>
                        <ul className="flex flex-col">
                          {list.map((c) => (
                            <ControlLine key={c.id} control={c} />
                          ))}
                        </ul>
                      </Card>
                    </VStack>
                  )
                }
              </QueryBoundary>
            </Section>

            <Section
              eyebrow="When"
              title="Verification in this period"
              description="How often the baseline was checked, and with what outcome."
              spacing="sm"
            >
              <QueryBoundary
                query={runs}
                unavailableMessage="Verification runs for this period."
                skeleton={<Skeleton className="h-28 w-full" />}
              >
                {() =>
                  record ? (
                    <PeriodFacts record={record} start={start} end={end} />
                  ) : (
                    <Skeleton className="h-28 w-full" />
                  )
                }
              </QueryBoundary>
            </Section>

            <Section
              eyebrow="What changed"
              title="Drift in this period"
              description="A control that was verified and later stopped meeting its expected state."
              spacing="sm"
            >
              <QueryBoundary
                query={drift}
                unavailableMessage="Controls that stop meeting their expected state after passing."
                skeleton={<Skeleton className="h-24 w-full" />}
              >
                {() =>
                  periodDrift.length === 0 ? (
                    <EmptyState
                      variant="bordered"
                      title="No drift in this period"
                      description="No control moved from passing to failing between these dates."
                    />
                  ) : (
                    <Card>
                      <ul className="flex flex-col gap-2">
                        {periodDrift.map((d) => {
                          const control = controls.data?.find((c) => c.id === d.controlId);
                          return (
                            <li
                              key={d.id}
                              className="flex flex-wrap items-center justify-between gap-2"
                            >
                              <span className="text-[var(--text-sm)] text-[var(--fg)] min-w-0 break-words">
                                {control?.name ?? d.controlId}
                              </span>
                              <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                                Detected <DateTime value={d.detectedAt} variant="absolute" />
                                {d.resolvedAt ? (
                                  <>
                                    {" · re-verified "}
                                    <DateTime value={d.resolvedAt} variant="absolute" />
                                  </>
                                ) : (
                                  " · still open"
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  )
                }
              </QueryBoundary>
            </Section>

            <Section
              eyebrow="Accepted risk"
              title="Exceptions"
              description="Risk accepted in writing, with the date it lapses. Named here because a customer is entitled to know."
              spacing="sm"
            >
              <QueryBoundary
                query={exceptions}
                unavailableMessage="Risk your team has accepted in writing, with an expiry."
                skeleton={<Skeleton className="h-24 w-full" />}
              >
                {() =>
                  active.length === 0 ? (
                    <EmptyState
                      variant="bordered"
                      title="No active exceptions"
                      description="Nothing is currently excluded from the control that covers it."
                    />
                  ) : (
                    <Card>
                      <ul className="flex flex-col gap-3">
                        {active.map((e) => {
                          const control = controls.data?.find((c) => c.id === e.controlId);
                          return (
                            <li key={e.id}>
                              <VStack gap="xs">
                                <span className="text-[var(--text-sm)] text-[var(--fg)] break-words">
                                  {control?.name ?? e.controlId}
                                </span>
                                <span className="text-[var(--text-xs)] text-[var(--fg-muted)] break-words">
                                  {e.reason}
                                </span>
                                <span className="text-[var(--text-xs)] text-[var(--fg-subtle)]">
                                  Expires{" "}
                                  <DateTime value={e.expiresAt} variant="absolute" withTime={false} />
                                </span>
                              </VStack>
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  )
                }
              </QueryBoundary>
            </Section>

            <Section
              eyebrow="Proof"
              title="Evidence from this period"
              description="The records a reviewer can ask to inspect."
              spacing="sm"
            >
              <QueryBoundary
                query={evidence}
                unavailableMessage="Evidence records for this period."
                skeleton={<Skeleton className="h-32 w-full" />}
              >
                {() => (
                  <VStack gap="sm">
                    <EvidenceList
                      evidence={periodEvidence.slice(0, 4)}
                      controls={controls.data ?? []}
                      runs={runs.data ?? []}
                      emptyTitle="No evidence records fall inside this period"
                      emptyDescription="Evidence currently retained was recorded outside these dates."
                    />
                    {periodEvidence.length > 4 && (
                      <Link
                        href="/dashboard/reports/evidence"
                        className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] w-fit"
                      >
                        All {periodEvidence.length} evidence records from this period
                      </Link>
                    )}
                  </VStack>
                )}
              </QueryBoundary>
            </Section>
          </VStack>
        );
      }}
    </QueryBoundary>
  );
}
