"use client";

import Link from "next/link";
import {
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
  ControlStatusBadge,
  FindingStatusBadge,
  RemediationSteps,
  RemediationStatusBadge,
  SeverityBadge,
} from "@/lib/product";
import { CONTROL_DOMAIN_LABEL, FINDING_STATUS, lastCompletedRun } from "@/lib/domain";
import {
  useCloudAccounts,
  useControl,
  useFinding,
  useRemediations,
  useResources,
  useVerificationRuns,
} from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * Finding detail — why one control is failing on one resource, and what closes it.
 *
 * Ordered as the reader asks: what is wrong, which control this belongs to,
 * which resource is affected, why it matters, how to fix it, and whether the
 * fix has been verified. The control link closes the loop back to the catalogue.
 */
export function FindingDetailScreen({ findingId }: { findingId: string }) {
  const { role } = useSession();
  const finding = useFinding(findingId);
  const control = useControl(finding.data?.controlId ?? "");
  const resources = useResources();
  const accounts = useCloudAccounts();
  const remediations = useRemediations();
  const runs = useVerificationRuns();

  if (finding.unavailable) {
    return <UnavailableState willShow="This finding, the resource it affects and the steps that resolve it." />;
  }
  if (finding.isLoading) {
    return (
      <VStack gap="lg" aria-busy="true" aria-label="Loading finding">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-40 w-full" />
      </VStack>
    );
  }
  if (finding.error) {
    return (
      <ErrorState
        title="We could not load this finding"
        description="The request did not complete. Nothing in your cloud changed."
        detail={finding.error.message}
        action={
          <Button variant="secondary" size="sm" onClick={finding.refresh}>
            Try again
          </Button>
        }
      />
    );
  }
  if (!finding.data) {
    return (
      <EmptyState
        variant="bordered"
        title="Finding not found"
        description="This finding is not recorded for your organisation. It may have been resolved and removed."
        action={
          <Link
            href="/dashboard/findings"
            className="text-[var(--text-sm)] underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Back to findings
          </Link>
        }
      />
    );
  }

  const f = finding.data;
  const c = control.data;
  const resource = resources.data?.find((r) => r.id === f.resourceId);
  const account = accounts.data?.find((a) => a.id === resource?.accountId);
  const remediation = remediations.data?.find((r) => r.id === f.remediation?.id);
  const lastRun = runs.data ? lastCompletedRun(runs.data) : undefined;
  const isOpen = f.status !== "RESOLVED" && f.status !== "EXCEPTION";
  const automatedFixAvailable = Boolean(c?.remediationAvailable);

  return (
    <VStack gap="lg">
      <PageHeader
        breadcrumbs={[{ label: "Findings", href: "/dashboard/findings" }, { label: f.title }]}
        title={f.title}
        meta={
          <>
            {c && <span>{CONTROL_DOMAIN_LABEL[c.domain]}</span>}
            <span>
              First seen <DateTime value={f.firstSeenAt} variant="relative" />
            </span>
            <span>
              Last seen <DateTime value={f.lastSeenAt} variant="relative" />
            </span>
            {f.resolvedAt && (
              <span>
                Resolved <DateTime value={f.resolvedAt} variant="relative" />
              </span>
            )}
          </>
        }
        actions={
          canDo(role, "requestRemediation") && isOpen && automatedFixAvailable ? (
            <Link
              href={`/dashboard/controls/${encodeURIComponent(f.controlId)}`}
              className="inline-flex items-center rounded-[var(--radius-tight)] bg-[var(--brand-primary)] px-3 py-1.5 text-[var(--text-xs)] text-[var(--on-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              title="Requests are made on the control: you name the resource and pick one of its allow-listed fixes."
            >
              Request a fix
            </Link>
          ) : null
        }
      />

      <Section eyebrow="What is wrong" title="Status">
        <Card>
          <VStack gap="sm">
            <HStack gap="sm" align="center" className="flex-wrap">
              <FindingStatusBadge status={f.status} size="md" />
              <SeverityBadge severity={f.severity} size="sm" />
            </HStack>
            <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
              {FINDING_STATUS[f.status].meaning}
            </p>
            {f.status === "AWAITING_VERIFICATION" && (
              <p className="text-[var(--text-sm)] text-[var(--fg)]">
                A change has been applied. The next verification decides whether this closes — nothing
                is marked resolved until a check passes.
              </p>
            )}
            {/* A finding is where someone decides to act; the queue is where the
                action lives. Without this the only route between them was the
                sidebar. The remediation is named by its summary, never by its
                id — the reader does not need an internal reference to find it. */}
            {remediation ? (
              <VStack gap="xs">
                <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">
                  Fix: {remediation.summary}
                  {remediation.outcome?.[0]?.message ? ` — ${remediation.outcome[0].message}` : ""}
                </p>
                <HStack gap="sm" align="center" className="flex-wrap">
                  <RemediationStatusBadge state={remediation.state} size="xs" />
                  <Link
                    href="/dashboard/remediation"
                    className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                  >
                    Track this fix in the remediation queue
                  </Link>
                </HStack>
              </VStack>
            ) : (
              <p className="text-[var(--text-xs)] text-[var(--fg-subtle)]">
                {isOpen
                  ? automatedFixAvailable
                    ? "No fix has been requested for this finding yet. The steps below apply it by hand in the meantime."
                    : "No automated fix exists for this control. Follow the steps below, or ask your Tricognita engineer."
                  : "No fix was recorded against this finding."}
              </p>
            )}
          </VStack>
        </Card>
      </Section>

      <Section
        eyebrow="Control"
        title="The control this belongs to"
        description="A finding is one resource failing one control."
      >
        {control.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : c ? (
          <Link
            href={`/dashboard/controls/${c.id}`}
            className="block rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <Card interactive>
              <VStack gap="xs">
                <HStack gap="sm" justify="between" align="start" className="flex-wrap">
                  <span className="text-[var(--text-sm)] font-medium text-[var(--fg)]">{c.name}</span>
                  <ControlStatusBadge status={c.status} reason={c.notAssessedReason} size="xs" />
                </HStack>
                <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">{c.expectedState}</p>
                <span className="font-mono text-[10px] text-[var(--fg-subtle)]">{c.id}</span>
              </VStack>
            </Card>
          </Link>
        ) : (
          <EmptyState variant="compact" title="Control not available" />
        )}
      </Section>

      <Section eyebrow="Affected resource" title="Resource">
        {resource ? (
          <Card>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Field label="Resource">{resource.label}</Field>
              <Field label="Type">{`${resource.type} · ${resource.service}`}</Field>
              <Field label="Region">{resource.regionLabel}</Field>
              <Field label="Cloud account">
                {account ? `${account.alias} · ${account.accountIdMasked}` : "—"}
              </Field>
            </dl>
          </Card>
        ) : (
          <EmptyState variant="compact" title="Resource details not available" />
        )}
      </Section>

      {c && (
        <Section eyebrow="Why it matters" title="Why it matters">
          <Card>
            <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">{c.whyItMatters}</p>
          </Card>
        </Section>
      )}

      <Section
        eyebrow="Remediation"
        title="How to fix it"
        description="Apply these steps, then the control is checked again."
      >
        <VStack gap="sm">
          <RemediationSteps steps={f.remediationSteps} />
          {automatedFixAvailable && (
            <p className="text-[var(--text-xs)] text-[var(--fg-subtle)]">
              An automated fix exists for this control. It is requested on the control&rsquo;s page, needs a
              second person&rsquo;s approval, and only works if an administrator has switched that fix on
              under Remediation.
            </p>
          )}
        </VStack>
      </Section>

      <Section eyebrow="Verification" title="Verification">
        <Card density="compact">
          {runs.unavailable ? (
            <span className="text-[var(--text-sm)] text-[var(--fg-muted)]">
              Verification information is not available yet.
            </span>
          ) : runs.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : lastRun ? (
            <VStack gap="xs">
              <span className="text-[var(--text-sm)] text-[var(--fg)]">
                Last verification <DateTime value={lastRun.finishedAt ?? lastRun.startedAt} variant="both" />
              </span>
              <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                {f.status === "RESOLVED"
                  ? "This finding closed when the control passed again."
                  : "This finding closes only when the control passes a verification run."}
              </span>
              {c && (
                <Link
                  href={`/dashboard/controls/${c.id}`}
                  className="text-[var(--text-xs)] underline underline-offset-2 rounded-sm w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                >
                  See this control&rsquo;s history
                </Link>
              )}
            </VStack>
          ) : (
            <span className="text-[var(--text-sm)] text-[var(--fg-muted)]">
              No verification run has completed yet.
            </span>
          )}
        </Card>
      </Section>
    </VStack>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</dt>
      <dd className="text-[var(--text-sm)] text-[var(--fg)]">{children}</dd>
    </div>
  );
}
