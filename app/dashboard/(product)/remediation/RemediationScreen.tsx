"use client";

import Link from "next/link";
import {
  AuthorizingState,
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
import { useControls, useFindings, useRemediations, useResources } from "@/lib/data";
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
    ? remediationsNeedingAction(remediationQueue(remediations.data))
    : undefined;

  return (
    <VStack gap="lg">
      <PageHeader
        title="Remediation"
        description="A fix is requested, approved, applied, then re-checked. Nothing is recorded as fixed until a verification run says so."
        meta={
          typeof waiting === "number" ? (
            <span>
              {waiting} waiting on someone · {remediations.data?.length ?? 0} on record
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
