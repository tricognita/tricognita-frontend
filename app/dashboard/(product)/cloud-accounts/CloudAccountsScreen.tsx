"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthorizingState,
  Button,
  Card,
  ConfirmDangerous,
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
import { disconnectAccount, runAssessment, testConnection } from "@/lib/api/cloud-onboarding";
import { ConnectAccountPanel } from "./ConnectAccountPanel";

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

function AccountRow({
  account,
  mayManage,
  onChanged,
}: {
  account: CloudAccount;
  mayManage: boolean;
  onChanged: () => void;
}) {
  const healthy = account.connection === "CONNECTED";
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(what: string, fn: () => Promise<{ ok: boolean; text: string }>) {
    setBusy(what);
    setOutcome(null);
    try {
      setOutcome(await fn());
    } catch (e) {
      setOutcome({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
      onChanged();
    }
  }

  const recheck = () =>
    run("Re-checking", async () => {
      const t = await testConnection(account.id);
      return t.ok
        ? { ok: true, text: `The connection works${t.identity ? ` (${t.identity})` : ""}.` }
        : { ok: false, text: `The provider refused the connection: ${t.error ?? "no reason given"}` };
    });
  const verify = () =>
    run("Verifying", async () => {
      const r = await runAssessment(account.id);
      return r.state === "VERIFIED"
        ? {
            ok: true,
            text: `Verified: ${r.controlsEvaluated} controls evaluated across ${r.resourcesDiscovered} resources (${r.passed} passing, ${r.failed} failing, ${r.drifted} drifted, ${r.notAssessed} not assessed).${r.discoveryWarning ? " " + r.discoveryWarning : ""}`,
          }
        : { ok: false, text: `The verification did not complete: ${r.failureReason ?? "no reason given"}.` };
    });
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
          <VStack gap="xs">
            <HStack gap="sm" align="center" className="flex-wrap">
              <Button size="sm" disabled={busy !== null} onClick={() => void verify()}>
                Verify now
              </Button>
              <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => void recheck()}>
                Re-check connection
              </Button>
              <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => setConfirming(true)}>
                Disconnect
              </Button>
            </HStack>
            <div aria-live="polite" className="text-[var(--text-xs)]">
              {busy && <p className="text-[var(--fg-muted)]">{busy}…</p>}
              {outcome && (
                <p role={outcome.ok ? "status" : "alert"} className="text-[var(--fg)] break-words">
                  {outcome.text}
                </p>
              )}
            </div>
            <ConfirmDangerous
              open={confirming}
              onClose={() => setConfirming(false)}
              title={`Disconnect ${account.alias}`}
              description="Tricognita stops reading this account and deletes the stored connection. Existing results and evidence are kept."
              confirmPhrase="DISCONNECT"
              confirmLabel="Disconnect"
              onConfirm={async () => {
                setConfirming(false);
                await run("Disconnecting", async () => {
                  await disconnectAccount(account.id);
                  return { ok: true, text: "Disconnected." };
                });
              }}
            />
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

export function CloudAccountsScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const accounts = useCloudAccounts();
  const [connecting, setConnecting] = useState(false);

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

      {mayManage && !connecting && (
        <HStack gap="sm">
          <Button size="sm" onClick={() => setConnecting(true)}>
            Connect an account
          </Button>
        </HStack>
      )}
      {mayManage && connecting && (
        <ConnectAccountPanel onChanged={accounts.refresh} onClose={() => setConnecting(false)} />
      )}

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
                description={
                  mayManage
                    ? "Tricognita verifies nothing until an account is connected. Use Connect an account."
                    : "Tricognita verifies nothing until an administrator connects an account."
                }
              />
            ) : (
              <ul className="flex flex-col gap-2">
                {accountsByAttention(data).map((a) => (
                  <li key={a.id}>
                    <AccountRow account={a} mayManage={mayManage} onChanged={accounts.refresh} />
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
