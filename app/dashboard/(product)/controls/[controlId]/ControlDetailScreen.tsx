"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  DateTime,
  EmptyState,
  ErrorState,
  HStack,
  PageHeader,
  Section,
  Skeleton,
  UnavailableState,
  VStack,
} from "@/lib/ui";
import {
  ControlHistory,
  ControlResultList,
  ControlStatusBadge,
  FindingStatusBadge,
  SeverityBadge,
} from "@/lib/product";
import {
  CONTROL_DOMAIN_LABEL,
  CONTROL_STATUS,
  NOT_ASSESSED_REASON,
  controlHistory,
  findingsForControl,
  lastCompletedRun,
} from "@/lib/domain";
import {
  useCloudAccounts,
  useControl,
  useControlHistory,
  useControlResults,
  useDriftEvents,
  useEvidence,
  useExceptions,
  useFindings,
  useRemediationOffers,
  useRemediations,
  useResources,
  useVerificationRuns,
} from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { RequestRemediationForm } from "./RequestRemediationForm";
import { VerifyNowAction } from "./VerifyNowAction";
import { ManualRemediationSection } from "./ManualRemediationSection";

/**
 * Control detail — the canonical pattern for one control.
 *
 * The page is ordered the way the customer reasons about it: what state is it
 * in, what is actually required, which resources it covers, when that was last
 * checked, what has happened to it over time, and what proves any of it.
 *
 * Actions are shown only where the product genuinely supports them. Where a
 * capability is not wired yet, the control is visible and disabled with the
 * reason, rather than a button that pretends.
 */
export function ControlDetailScreen({ controlId }: { controlId: string }) {
  const { role } = useSession();
  const control = useControl(controlId);
  const results = useControlResults(controlId);
  const history = useControlHistory(controlId);
  const runs = useVerificationRuns();
  const drift = useDriftEvents();
  const remediations = useRemediations();
  const exceptions = useExceptions();
  const evidence = useEvidence();
  const findings = useFindings();
  const resources = useResources();
  const offers = useRemediationOffers(controlId);
  const [requestOpen, setRequestOpen] = useState(false);
  const accounts = useCloudAccounts();

  if (control.unavailable) {
    return <UnavailableState willShow="This control, the resources it covers and its verification history." />;
  }
  if (control.isLoading) {
    return (
      <VStack gap="lg" aria-busy="true" aria-label="Loading control">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </VStack>
    );
  }
  if (control.error) {
    return (
      <ErrorState
        title="We could not load this control"
        description="The request did not complete. Nothing in your cloud changed."
        detail={control.error.message}
        action={
          <Button variant="secondary" size="sm" onClick={control.refresh}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!control.data) {
    return (
      <EmptyState
        variant="bordered"
        title="Control not found"
        description="This control is not part of your baseline."
        action={
          <Link
            href="/dashboard/controls"
            className="text-[var(--text-sm)] underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Back to controls
          </Link>
        }
      />
    );
  }

  const c = control.data;
  const presentation = CONTROL_STATUS[c.status];
  const exception = exceptions.data?.find((e) => e.controlId === c.id && e.state === "ACTIVE");
  const controlRemediations = remediations.data?.filter((r) => r.controlId === c.id) ?? [];
  const openRemediation = controlRemediations.find(
    (r) => r.state === "PENDING_APPROVAL" || r.state === "APPROVED" || r.state === "EXECUTING",
  );
  const controlEvidence = evidence.data?.filter((e) => e.controlId === c.id) ?? [];
  const lastRun = runs.data ? lastCompletedRun(runs.data) : undefined;
  const controlFindings = findings.data ? findingsForControl(findings.data, c.id) : [];
  const needsAttention = c.status === "FAIL" || c.status === "DRIFTED";

  const events =
    history.data && runs.data && drift.data && remediations.data
      ? controlHistory({
          controlId: c.id,
          results: history.data,
          runs: runs.data,
          drift: drift.data,
          remediations: remediations.data,
        })
      : [];

  return (
    <VStack gap="lg">
      <PageHeader
        breadcrumbs={[
          { label: "Controls", href: "/dashboard/controls" },
          { label: c.id },
        ]}
        title={c.name}
        description={c.description}
        meta={
          <>
            <span>{CONTROL_DOMAIN_LABEL[c.domain]}</span>
            <span className="font-mono">{c.id}</span>
            {c.lastVerifiedAt && (
              <span>
                Last verified <DateTime value={c.lastVerifiedAt} variant="relative" />
              </span>
            )}
            {c.nextVerificationAt && (
              <span>
                Next <DateTime value={c.nextVerificationAt} variant="relative" />
              </span>
            )}
          </>
        }
        actions={
          <HStack gap="sm" align="center">
            {canDo(role, "requestRemediation") && needsAttention && c.remediationAvailable && (
              <Button
                variant="primary"
                size="sm"
                disabled={Boolean(openRemediation) || offers.isLoading}
                title={
                  openRemediation
                    ? "A fix is already in progress for this control."
                    : "Name the resource and pick one of this control's allow-listed fixes."
                }
                onClick={() => setRequestOpen(true)}
              >
                Request a fix
              </Button>
            )}
          </HStack>
        }
      />

      <Section eyebrow="Current state" title="State">
        <Card>
          <VStack gap="sm">
            <HStack gap="sm" align="center" className="flex-wrap">
              <ControlStatusBadge status={c.status} reason={c.notAssessedReason} size="md" />
              <span className="text-[var(--text-sm)] text-[var(--fg-muted)]">{presentation.meaning}</span>
            </HStack>

            {c.status === "NOT_ASSESSED" && c.notAssessedReason && (
              <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                {NOT_ASSESSED_REASON[c.notAssessedReason]}. It is not counted as passing.
              </p>
            )}

            {needsAttention && (
              <p className="text-[var(--text-sm)] text-[var(--fg)]">
                {c.resourcesFailing} of {c.resourcesInScope}{" "}
                {c.resourcesInScope === 1 ? "resource does" : "resources do"} not meet this control.
              </p>
            )}

            {exception && (
              <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                Accepted as an exception by {exception.owner}, expiring{" "}
                <DateTime value={exception.expiresAt} variant="absolute" withTime={false} />. Reason:{" "}
                {exception.reason}
              </p>
            )}

            {openRemediation && (
              <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                A fix is in progress: {openRemediation.summary}
              </p>
            )}
          </VStack>
        </Card>
      </Section>

      <Section
        eyebrow="Requirement"
        title="What is being verified"
        description="The expectation this control checks, and why it matters."
      >
        <Card>
          <VStack gap="sm">
            <div>
              <h3 className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
                Expected state
              </h3>
              <p className="text-[var(--text-sm)] text-[var(--fg)]">{c.expectedState}</p>
            </div>
            <div>
              <h3 className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
                Why it matters
              </h3>
              <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">{c.whyItMatters}</p>
            </div>
            {c.frameworkRefs.length > 0 && (
              <div>
                <h3 className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)] mb-1">
                  Referenced by
                </h3>
                <HStack gap="xs" className="flex-wrap">
                  {c.frameworkRefs.map((f) => (
                    <Badge key={`${f.framework}-${f.ref}`} intent="neutral" size="sm" mono>
                      {f.framework.replace("_", " ")} {f.ref}
                    </Badge>
                  ))}
                </HStack>
              </div>
            )}
          </VStack>
        </Card>
      </Section>

      <Section
        eyebrow="Resources"
        title="Resources checked"
        description="Every resource this control applies to, at the last verification."
      >
        {results.unavailable ? (
          <UnavailableState willShow="The result of this control for each resource in scope." />
        ) : results.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : results.error ? (
          <ErrorState title="Results could not be loaded" detail={results.error.message} />
        ) : (
          <ControlResultList
            results={results.data ?? []}
            resources={resources.data ?? []}
            accounts={accounts.data ?? []}
            renderActions={
              canDo(role, "runVerification")
                ? (r) => <VerifyNowAction controlId={c.id} result={r} />
                : undefined
            }
          />
        )}
      </Section>

      <ManualRemediationSection
        controlId={c.id}
        expectedState={c.expectedState}
        results={results.data ?? []}
        resources={resources.data ?? []}
      />

      <Section
        eyebrow="Findings"
        title="Findings"
        description="Each finding is one resource failing this control."
      >
        {findings.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : controlFindings.length === 0 ? (
          <EmptyState
            variant="compact"
            title="No findings recorded for this control"
            description="A finding is raised when a resource stops meeting the control."
          />
        ) : (
          <VStack gap="xs">
            {controlFindings.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/findings/${f.id}`}
                className="block rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                <Card density="compact" interactive>
                  <HStack gap="sm" justify="between" align="start" className="flex-wrap">
                    <span className="text-[var(--text-sm)] text-[var(--fg)] min-w-0">{f.title}</span>
                    <HStack gap="xs" align="center" className="shrink-0">
                      <SeverityBadge severity={f.severity} size="xs" />
                      <FindingStatusBadge status={f.status} size="xs" />
                    </HStack>
                  </HStack>
                </Card>
              </Link>
            ))}
          </VStack>
        )}
      </Section>

      <Section eyebrow="Verification" title="Verification">
        <Card density="compact">
          <VStack gap="xs">
            {lastRun ? (
              <>
                <HStack gap="sm" align="center" className="flex-wrap">
                  <span className="text-[var(--text-sm)] text-[var(--fg)]">
                    Last run <DateTime value={lastRun.finishedAt ?? lastRun.startedAt} variant="both" />
                  </span>
                </HStack>
                <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                  {c.verification === "VERIFYING"
                    ? "A verification run is checking this control now."
                    : "This control is re-checked on schedule; a fix triggers an immediate re-check."}
                </span>
              </>
            ) : (
              <span className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                No verification run has completed yet.
              </span>
            )}
          </VStack>
        </Card>
      </Section>

      <Section
        eyebrow="History"
        title="History"
        description="Verification results, drift and fixes for this control, newest first."
      >
        {history.unavailable ? (
          <UnavailableState willShow="Every recorded result for this control, with the drift and fixes between them." />
        ) : history.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : history.error ? (
          <ErrorState title="History could not be loaded" detail={history.error.message} />
        ) : (
          <ControlHistory events={events} limit={12} />
        )}
      </Section>

      <Section
        eyebrow="Proof"
        title="Evidence"
        description="What was recorded each time this control was checked."
      >
        {controlEvidence.length === 0 ? (
          <EmptyState
            variant="bordered"
            title="No evidence records for this control yet"
            description="A record is written every time the control is verified."
          />
        ) : (
          <VStack gap="xs">
            {controlEvidence.slice(0, 5).map((e) => (
              <Card key={e.id} density="compact">
                <HStack gap="sm" justify="between" align="center" className="flex-wrap">
                  <span className="text-[var(--text-sm)] text-[var(--fg)]">{e.summary}</span>
                  <HStack gap="xs" align="center">
                    <Badge
                      intent={e.integrity === "VERIFIED" ? "success" : e.integrity === "FAILED" ? "danger" : "neutral"}
                      size="xs"
                    >
                      {e.integrity === "VERIFIED"
                        ? "Integrity check passed"
                        : e.integrity === "FAILED"
                          ? "Integrity check failed"
                          : "Not yet checked"}
                    </Badge>
                    <span className="font-mono text-[10px] text-[var(--fg-subtle)]">{e.id}</span>
                  </HStack>
                </HStack>
                <span className="text-[var(--text-xs)] text-[var(--fg-subtle)]">
                  <DateTime value={e.recordedAt} variant="both" />
                </span>
              </Card>
            ))}
          </VStack>
        )}
      </Section>

      <RequestRemediationForm
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        controlId={c.id}
        offers={offers.data ?? []}
      />
    </VStack>
  );
}
