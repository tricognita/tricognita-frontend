"use client";

import Link from "next/link";
import {
  AuthorizingState,
  Button,
  Card,
  DateTime,
  EmptyState,
  HStack,
  NotAuthorizedState,
  PageHeader,
  Section,
  VStack,
} from "@/lib/ui";
import { AccountConnectionBadge, ProviderBadge } from "@/lib/product";
import { ACCOUNT_CONNECTION, accountsByAttention, type CloudAccount } from "@/lib/domain";
import { useCloudAccounts } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "../admin/QueryBoundary";
import { NoMutationNote } from "../admin/NoMutationNote";

/**
 * Cloud accounts — what Tricognita can read, and what it cannot.
 *
 * The account identifier is shown in the masked form the domain stores; the
 * full number is never rendered, and no credential exists in this model to
 * render by accident.
 *
 * An account we cannot read fully is the important row on this page, so it
 * leads, carries the exact missing permission, and says what that does to the
 * customer's results: those controls come back Not assessed, never Passing.
 */

const NO_API =
  "Connecting, disconnecting and re-checking an account arrive with the cloud-account API.";

function AccountRow({ account, mayManage }: { account: CloudAccount; mayManage: boolean }) {
  const healthy = account.connection === "CONNECTED";
  return (
    <Card>
      <VStack gap="sm">
        <HStack gap="sm" justify="between" align="start" className="flex-wrap">
          <VStack gap="xs" className="min-w-0">
            <span className="text-[var(--text-sm)] font-medium text-[var(--fg)] break-words">
              {account.alias}
            </span>
            <span className="font-mono text-[var(--text-xs)] text-[var(--fg-muted)]">
              {account.accountIdMasked}
            </span>
          </VStack>
          <HStack gap="xs" align="center" className="flex-wrap">
            <ProviderBadge provider={account.provider} size="xs" />
            <AccountConnectionBadge connection={account.connection} size="xs" />
          </HStack>
        </HStack>

        <dl className="grid gap-2 sm:grid-cols-3 text-[var(--text-xs)]">
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Regions</dt>
            <dd className="text-[var(--fg)] break-words">
              {account.regions.length > 0 ? account.regions.join(", ") : "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Connected</dt>
            <dd className="text-[var(--fg)]">
              {account.connectedAt ? (
                <DateTime value={account.connectedAt} variant="absolute" withTime={false} />
              ) : (
                <span className="text-[var(--fg-subtle)]">Not connected</span>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
              Last verified
            </dt>
            <dd className="text-[var(--fg)]">
              {account.lastVerifiedAt ? (
                <DateTime value={account.lastVerifiedAt} variant="both" />
              ) : (
                <span className="text-[var(--fg-subtle)]">Never</span>
              )}
            </dd>
          </div>
        </dl>

        {!healthy && (
          <VStack gap="xs">
            <p className="text-[var(--text-xs)] text-[var(--fg-muted)] break-words">
              {ACCOUNT_CONNECTION[account.connection].meaning}
            </p>
            {account.message && (
              <p className="text-[var(--text-sm)] text-[var(--fg)] break-words">{account.message}</p>
            )}
          </VStack>
        )}

        {mayManage && (
          <HStack gap="sm" align="center" className="flex-wrap">
            <Button variant="secondary" size="sm" disabled title={NO_API}>
              Re-check connection
            </Button>
            <Button variant="ghost" size="sm" disabled title={NO_API}>
              Disconnect
            </Button>
          </HStack>
        )}
      </VStack>
    </Card>
  );
}

export function CloudAccountsScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const accounts = useCloudAccounts();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "viewCloudResources")) {
    return (
      <VStack gap="lg">
        <PageHeader title="Cloud accounts" description="The accounts Tricognita reads." />
        <NotAuthorizedState subject="connected cloud accounts" askWho="an administrator" />
      </VStack>
    );
  }

  const mayManage = canDo(role, "manageCloudAccounts");

  return (
    <VStack gap="lg">
      <PageHeader
        title="Cloud accounts"
        description="The accounts Tricognita reads to verify your controls, and how cleanly it can read each one."
      />

      {mayManage && <NoMutationNote what={NO_API} />}

      <Section
        eyebrow="Connected"
        title="Accounts"
        description="An account we cannot read fully leaves its controls Not assessed — never Passing."
        spacing="sm"
      >
        <QueryBoundary
          query={accounts}
          unavailableMessage="The cloud accounts connected to your organisation and their connection state."
        >
          {(data) =>
            data.length === 0 ? (
              <EmptyState
                variant="bordered"
                title="No cloud account connected"
                description="Tricognita verifies nothing until an account is connected during onboarding."
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {accountsByAttention(data).map((a) => (
                  <li key={a.id}>
                    <AccountRow account={a} mayManage={mayManage} />
                  </li>
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </Section>

      <nav aria-label="Related surfaces">
        <HStack gap="lg" className="flex-wrap">
          <Link
            href="/dashboard/operations"
            className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Operations — accounts that need attention
          </Link>
          <Link
            href="/dashboard/assurance/verification"
            className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Verification — what could not be assessed
          </Link>
        </HStack>
      </nav>
    </VStack>
  );
}
