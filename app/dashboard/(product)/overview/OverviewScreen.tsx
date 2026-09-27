"use client";

import * as React from "react";
import {
  Button,
  DateTime,
  EmptyState,
  ErrorState,
  PageHeader,
  Section,
  Skeleton,
  UnavailableState,
  VStack,
} from "@/lib/ui";
import {
  AssuranceCounts,
  AttentionList,
  DriftSummary,
  ProofLinks,
  VerificationSummary,
} from "@/lib/product";
import { attentionItems, lastCompletedRun, nextVerificationAt } from "@/lib/domain";
import type { Query } from "@/lib/data";
import {
  useCloudAccounts,
  useControls,
  useDriftEvents,
  useEvidence,
  useExceptions,
  useRemediations,
  useReports,
  useResources,
  useVerificationRuns,
} from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * Overview — the customer's operational starting point.
 *
 * Answers six questions in order: what is the current state, what needs
 * attention, when was this last checked, what is running, has anything
 * drifted, and can I prove it. Everything below is a fact the product already
 * holds — no score, no projection, no invented metric.
 */

/** Renders the non-happy states every section shares, or its children. */
function SectionBody<T>({
  query,
  skeleton,
  children,
  unavailableMessage,
}: {
  query: Query<T>;
  skeleton: React.ReactNode;
  children: (data: T) => React.ReactNode;
  unavailableMessage: string;
}) {
  if (query.unavailable) return <UnavailableState willShow={unavailableMessage} />;
  if (query.isLoading) return <>{skeleton}</>;
  if (query.error) {
    return (
      <ErrorState
        title="We could not load this"
        description="The request did not complete. Nothing in your cloud changed."
        detail={query.error.message}
        action={
          <Button variant="secondary" size="sm" onClick={query.refresh}>
            Try again
          </Button>
        }
      />
    );
  }
  if (query.data === undefined) return <>{skeleton}</>;
  return <>{children(query.data)}</>;
}

function SkeletonRow({ count = 3, height = "h-16" }: { count?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  );
}

export function OverviewScreen() {
  const { role } = useSession();
  const controls = useControls();
  const runs = useVerificationRuns();
  const drift = useDriftEvents();
  const exceptions = useExceptions();
  const remediations = useRemediations();
  const accounts = useCloudAccounts();
  const resources = useResources();
  const reports = useReports();
  const evidence = useEvidence();

  const canRunVerification = canDo(role, "runVerification");

  const lastRun = runs.data ? lastCompletedRun(runs.data) : undefined;
  const nextAt = controls.data ? nextVerificationAt(controls.data) : undefined;
  const connectedAccounts = accounts.data?.filter((a) => a.connection === "CONNECTED").length ?? 0;

  const attention =
    controls.data && drift.data && exceptions.data && remediations.data
      ? attentionItems({
          controls: controls.data,
          drift: drift.data,
          exceptions: exceptions.data,
          remediations: remediations.data,
          accounts: accounts.data,
          resources: resources.data,
        })
      : [];

  return (
    <VStack gap="xl">
      <PageHeader
        title="Overview"
        description="What is passing, what needs attention, and what proves it."
        meta={
          <>
            <span>
              {connectedAccounts} cloud account{connectedAccounts === 1 ? "" : "s"} connected
            </span>
            {lastRun && (
              <span>
                Last verified{" "}
                <DateTime value={lastRun.finishedAt ?? lastRun.startedAt} variant="relative" />
              </span>
            )}
            {nextAt && (
              <span>
                Next verification <DateTime value={nextAt} variant="relative" />
              </span>
            )}
          </>
        }
        actions={
          canRunVerification ? (
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
      />

      <Section
        eyebrow="Current state"
        title="Controls"
        description="Every control in your baseline, by its result at the last verification."
      >
        <SectionBody
          query={controls}
          unavailableMessage="Your control baseline and its current results."
          skeleton={
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          }
        >
          {(data) =>
            data.length === 0 ? (
              <EmptyState
                variant="bordered"
                title="No controls yet"
                description="Your baseline is set during onboarding, then verified for the first time."
              />
            ) : (
              <AssuranceCounts controls={data} />
            )
          }
        </SectionBody>
      </Section>

      <Section
        eyebrow="Attention"
        title="Needs attention"
        description="Ranked by urgency: a control that broke again comes before one that never passed."
      >
        <SectionBody
          query={controls}
          unavailableMessage="Controls and drift that need someone to act."
          skeleton={<SkeletonRow />}
        >
          {() => <AttentionList items={attention} />}
        </SectionBody>
      </Section>

      <Section
        eyebrow="Verification"
        title="Verification"
        description="A control's result is only as current as the run behind it."
      >
        <SectionBody
          query={runs}
          unavailableMessage="Scheduled and on-demand verification runs."
          skeleton={<SkeletonRow count={2} height="h-20" />}
        >
          {(data) => <VerificationSummary runs={data} />}
        </SectionBody>
      </Section>

      <Section
        eyebrow="Drift"
        title="Drift"
        description="Controls that were verified and later failed again."
      >
        <SectionBody
          query={drift}
          unavailableMessage="Controls that stop meeting their expected state after being fixed."
          skeleton={<SkeletonRow count={2} />}
        >
          {(data) => (
            <DriftSummary
              drift={data}
              controls={controls.data ?? []}
              resources={resources.data ?? []}
            />
          )}
        </SectionBody>
      </Section>

      <Section
        eyebrow="Proof"
        title="Reports and evidence"
        description="What you can show a customer, an auditor or your board."
      >
        <SectionBody
          query={reports}
          unavailableMessage="Monthly assurance reports, customer review summaries and evidence records."
          skeleton={<SkeletonRow count={1} height="h-24" />}
        >
          {(data) => <ProofLinks reports={data} evidence={evidence.data ?? []} />}
        </SectionBody>
      </Section>
    </VStack>
  );
}
