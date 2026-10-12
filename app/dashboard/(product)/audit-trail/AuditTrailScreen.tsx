"use client";

import Link from "next/link";
import { useState } from "react";
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
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  VStack,
} from "@/lib/ui";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { useAuditEvents } from "@/lib/data";
import { fetchAuditEvents } from "@/lib/api/audit";
import type { AuditEvent } from "@/lib/domain";
import { QueryBoundary } from "../admin/QueryBoundary";

function detailText(e: AuditEvent): string {
  const parts = Object.entries(e.details).map(([k, v]) => `${k}: ${String(v)}`);
  return parts.length ? parts.join(" · ") : "—";
}

function EventsTable({ first, nextBefore }: { first: AuditEvent[]; nextBefore: number | null }) {
  const [older, setOlder] = useState<AuditEvent[]>([]);
  const [cursor, setCursor] = useState<number | null>(nextBefore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const events = [...first, ...older];

  async function loadMore() {
    if (!cursor) return;
    setBusy(true);
    setError(null);
    try {
      const page = await fetchAuditEvents(cursor);
      setOlder((o) => [...o, ...page.events]);
      setCursor(page.nextBefore);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (events.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        title="No actions recorded yet"
        description="Actions appear here as people connect accounts, run verifications and change settings."
      />
    );
  }
  return (
    <VStack gap="sm">
      <Table>
        <THead>
          <TR>
            <TH>When</TH>
            <TH>Who</TH>
            <TH>Action</TH>
            <TH>Object</TH>
            <TH>Details</TH>
          </TR>
        </THead>
        <TBody>
          {events.map((e) => (
            <TR key={e.seq}>
              <TD>
                <DateTime value={e.occurredAt} variant="both" />
              </TD>
              <TD className="break-all">{e.actor}</TD>
              <TD>
                <code className="text-[var(--text-xs)]">{e.action}</code>
              </TD>
              <TD className="break-all">{e.resource}</TD>
              <TD className="break-words text-[var(--fg-muted)]">{detailText(e)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {error && (
        <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
          Could not load older actions: {error}
        </p>
      )}
      {cursor && (
        <HStack>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void loadMore()}>
            {busy ? "Loading…" : "Load older actions"}
          </Button>
        </HStack>
      )}
    </VStack>
  );
}

/**
 * Audit trail — who did what, when.
 *
 * There is no audit-event entity in the domain, no fixture and no data
 * contract, so this page lists nothing. Fabricating entries here would be the
 * worst possible place to do it: an audit trail whose contents were invented is
 * not a weaker audit trail, it is a false one, and it would be read by exactly
 * the people who must be able to rely on it.
 *
 * What does exist is pointed at honestly. The evidence chain and verification
 * history are real, hash-linked records covering what the product itself did;
 * what they do not yet cover is what people did inside it.
 */
export function AuditTrailScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const audit = useAuditEvents();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "viewAuditTrail")) {
    return (
      <VStack gap="lg">
        <PageHeader title="Audit trail" description="Who did what, when." />
        <NotAuthorizedState subject="the audit trail" askWho="an administrator" />
      </VStack>
    );
  }

  return (
    <VStack gap="lg">
      <PageHeader
        title="Audit trail"
        description="Every action taken inside Tricognita for your organisation: who took it, when, against what, and what happened."
      />

      <Section
        eyebrow="Actions"
        title="Recorded actions"
        description="Sign-ins, approvals, exceptions, configuration changes and exports."
        spacing="sm"
      >
        <QueryBoundary
          query={audit}
          unavailableMessage="Each action taken in your account: who took it, when, the object it affected and its outcome."
        >
          {(data) => <EventsTable first={data.events} nextBefore={data.nextBefore} />}
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Available today"
        title="What is already on the record"
        description="Related records of what the product itself did: evidence, verification runs and remediation."
        spacing="sm"
      >
        <Card>
          <VStack gap="sm">
            <div>
              <Link
                href="/dashboard/reports/evidence"
                className="text-[var(--text-sm)] text-[var(--fg)] underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                Evidence
              </Link>
              <p className="text-[var(--text-xs)] text-[var(--fg-muted)] max-w-[70ch]">
                What each verification and each change recorded, with an integrity check against the
                hash written when it was taken.
              </p>
            </div>
            <div>
              <Link
                href="/dashboard/assurance/history"
                className="text-[var(--text-sm)] text-[var(--fg)] underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                Verification history
              </Link>
              <p className="text-[var(--text-xs)] text-[var(--fg-muted)] max-w-[70ch]">
                Every run, including the ones that did not complete.
              </p>
            </div>
            <div>
              <Link
                href="/dashboard/remediation"
                className="text-[var(--text-sm)] text-[var(--fg)] underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
              >
                Remediation
              </Link>
              <p className="text-[var(--text-xs)] text-[var(--fg-muted)] max-w-[70ch]">
                Each change requested against your cloud, who asked for it, who approved it, and the
                run that confirmed it.
              </p>
            </div>
          </VStack>
        </Card>
      </Section>

      <HStack>
        <p className="text-[var(--text-xs)] text-[var(--fg-subtle)] max-w-[75ch]">
          Every entry above was written by the platform when the action happened, in an
          organisation-specific chain; nothing here is reconstructed or estimated. Sign-ins and
          actions taken only in the browser are recorded where they reach the platform.
        </p>
      </HStack>
    </VStack>
  );
}
