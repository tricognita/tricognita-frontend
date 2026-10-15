"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { auditFilterProblem, fetchAuditEvents, type AuditFilters } from "@/lib/api/audit";
import type { AuditEvent } from "@/lib/domain";
import { QueryBoundary } from "../admin/QueryBoundary";

function detailText(e: AuditEvent): string {
  const parts = Object.entries(e.details).map(([k, v]) => `${k}: ${String(v)}`);
  return parts.length ? parts.join(" · ") : "—";
}

function EventsTable({
  first,
  nextBefore,
  filters,
}: {
  first: AuditEvent[];
  nextBefore: number | null;
  filters: AuditFilters;
}) {
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
      const page = await fetchAuditEvents(filters, cursor);
      setOlder((o) => [...o, ...page.events]);
      setCursor(page.nextBefore);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (events.length === 0 && Object.values(filters).some(Boolean)) {
    return (
      <EmptyState
        variant="bordered"
        title="No recorded actions match these filters"
        description="Nothing for your organisation matches. Widen the dates or clear a filter."
      />
    );
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

const INPUT =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)] w-full";
const LABEL = "text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]";
const KEYS = ["actor", "action", "from", "to"] as const;

/**
 * Filters live in the address (?actor=&action=&from=&to=) so a reload or a shared link shows the same
 * view. Input that cannot be valid is explained here and never sent; the API checks it again.
 */
function FilterForm({ applied }: { applied: AuditFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<AuditFilters>(applied);
  const [problem, setProblem] = useState<string | null>(null);
  const set = (k: (typeof KEYS)[number]) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  function go(f: AuditFilters) {
    const p = new URLSearchParams();
    for (const k of KEYS) if (f[k]?.trim()) p.set(k, f[k]!.trim());
    router.replace(p.size ? `${pathname}?${p.toString()}` : pathname);
  }
  function apply(e: React.FormEvent) {
    e.preventDefault();
    const why = auditFilterProblem(draft);
    setProblem(why);
    if (!why) go(draft);
  }
  function clear() {
    setDraft({});
    setProblem(null);
    go({});
  }
  return (
    <form onSubmit={apply} aria-label="Filter recorded actions" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block">
        <span className={LABEL}>Who (email contains)</span>
        <input name="actor" className={INPUT} value={draft.actor ?? ""} onChange={set("actor")} autoComplete="off" />
      </label>
      <label className="block">
        <span className={LABEL}>Action (contains)</span>
        <input name="action" className={INPUT} value={draft.action ?? ""} onChange={set("action")} autoComplete="off" placeholder="e.g. auth." />
      </label>
      <label className="block">
        <span className={LABEL}>From (YYYY-MM-DD)</span>
        <input name="from" type="date" className={INPUT} value={draft.from ?? ""} onChange={set("from")} />
      </label>
      <label className="block">
        <span className={LABEL}>To (YYYY-MM-DD)</span>
        <input name="to" type="date" className={INPUT} value={draft.to ?? ""} onChange={set("to")} />
      </label>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" variant="secondary" size="sm">
          Apply filters
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={clear}>
          Clear
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)] sm:col-span-2 lg:col-span-4">
          {problem}
        </p>
      )}
    </form>
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
  const search = useSearchParams();
  // Hand-edited addresses are not trusted: anything that fails the same rules as the form is ignored.
  const fromUrl: AuditFilters = {};
  for (const k of KEYS) fromUrl[k] = search.get(k) ?? "";
  const applied = auditFilterProblem(fromUrl) ? {} : fromUrl;
  const urlProblem = auditFilterProblem(fromUrl);
  const audit = useAuditEvents(applied);

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
        <FilterForm key={JSON.stringify(applied)} applied={applied} />
        {urlProblem && (
          <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
            The filters in the address were not valid ({urlProblem}) so they were ignored.
          </p>
        )}
        <QueryBoundary
          query={audit}
          unavailableMessage="Each action taken in your account: who took it, when, the object it affected and its outcome."
        >
          {(data) => <EventsTable key={JSON.stringify(applied)} first={data.events} nextBefore={data.nextBefore} filters={applied} />}
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
