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
  Skeleton,
  VStack,
} from "@/lib/ui";
import { RemediationQueueView } from "@/lib/product";
import {
  remediationQueue,
  remediationsNeedingAction,
  type Remediation,
} from "@/lib/domain";
import { useControls, useFindings, useManualRemediations, useRemediations, useResources } from "@/lib/data";
import { RECORD_OUTCOME, isManualRemediationOpen, manualNextStep, type ManualRemediation } from "@/lib/domain";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary, SkeletonRows } from "./QueryBoundary";
import { RemediationActions } from "./RemediationActions";

/**
 * Remediation — the controlled change, from request to confirmation.
 *
 * Request → approve → apply → verify → prove. The page never claims a step
 * that the record does not hold: approve, reject and apply call the real
 * remediation API and revalidate the control, verification and evidence data
 * they touch, not a local guess at the outcome.
 */
export function RemediationScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const remediations = useRemediations();
  const manual = useManualRemediations();
  const controls = useControls();
  const findings = useFindings();
  const resources = useResources();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "requestRemediation")) {
    return (
      <VStack gap="lg">
        <PageHeader
          title="Remediation"
          description="Changes requested against your cloud, and what confirmed them."
        />
        <NotAuthorizedState subject="the remediation queue" askWho="an administrator" />
      </VStack>
    );
  }

  const waiting = remediations.data
    ? remediationsNeedingAction(remediationQueue(remediations.data)) +
      (manual.data ? manual.data.filter(isManualRemediationOpen).length : 0)
    : undefined;
  const onRecord = (remediations.data?.length ?? 0) + (manual.data?.length ?? 0);

  return (
    <VStack gap="lg">
      <PageHeader
        title="Remediation"
        description="A fix is requested, approved, applied, then re-checked. Nothing is recorded as fixed until a verification run says so."
        meta={
          typeof waiting === "number" ? (
            <span>
              {waiting} waiting on someone · {onRecord} on record
            </span>
          ) : null
        }
      />

      <QueryBoundary
        query={remediations}
        unavailableMessage="Changes requested against your cloud, with their approval, execution and verification state."
        skeleton={<SkeletonRows count={3} />}
      >
        {(data: Remediation[]) => (
          <VStack gap="lg">
            {controls.isLoading || findings.isLoading || resources.isLoading ? (
              <Skeleton className="h-4 w-64" />
            ) : null}
            <RemediationQueueView
              remediations={data}
              controls={controls.data ?? []}
              findings={findings.data ?? []}
              resources={resources.data ?? []}
              renderActions={(r) => <RemediationActions remediation={r} />}
            />
          </VStack>
        )}
      </QueryBoundary>

      <ManualList manual={manual} />

      <nav aria-label="Related surfaces">
        <HStack gap="lg" className="flex-wrap">
          <Link
            href="/dashboard/findings"
            className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Findings — where a fix is requested
          </Link>
          <Link
            href="/dashboard/assurance/verification"
            className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Verification — what confirms one
          </Link>
        </HStack>
      </nav>
    </VStack>
  );
}

const NEXT_LABEL: Record<NonNullable<ReturnType<typeof manualNextStep>>, string> = {
  approve: "Waiting for a second person to approve",
  applied: "Approved: waiting for the change to be applied and recorded",
  verify: "Applied: waiting for Tricognita's check",
};

/** Fixes the customer applies themselves, from the real record. Shown beside the automated queue. */
function ManualList({ manual }: { manual: ReturnType<typeof useManualRemediations> }) {
  if (manual.unavailable) return null;
  if (manual.isLoading) return <Skeleton className="h-16 w-full" />;
  if (manual.error) {
    return (
      <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
        The fixes you apply yourself could not be loaded: {manual.error.message}
      </p>
    );
  }
  const items: ManualRemediation[] = manual.data ?? [];
  return (
    <VStack gap="sm">
      <h2 className="text-[var(--text-sm)] font-medium text-[var(--fg)]">Fixes you apply yourself</h2>
      {items.length === 0 ? (
        <EmptyState
          variant="bordered"
          title="No customer-applied fix on record"
          description="Propose one from a failing control. It is approved by a second person, applied by your team, then checked by Tricognita."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((r) => {
            const next = manualNextStep(r);
            return (
              <li key={r.id}>
                <Card>
                  <VStack gap="xs">
                    <HStack gap="sm" justify="between" align="start" className="flex-wrap">
                      <Link
                        href={`/dashboard/controls/${r.controlId}`}
                        className="text-[var(--text-sm)] font-medium text-[var(--fg)] underline underline-offset-2"
                      >
                        {r.controlId} · {r.resourceLabel}
                      </Link>
                      <span className="text-[var(--text-xs)] text-[var(--fg)]">{RECORD_OUTCOME[r.outcome].label}</span>
                    </HStack>
                    <p className="text-[var(--text-xs)] text-[var(--fg-muted)] break-words">{r.proposal.change}</p>
                    <p className="text-[var(--text-xs)] text-[var(--fg)]">
                      {next ? NEXT_LABEL[next] : "Checked by Tricognita."} · proposed by {r.proposal.proposedBy},{" "}
                      <DateTime value={r.proposal.proposedAt} variant="both" />
                    </p>
                  </VStack>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </VStack>
  );
}
