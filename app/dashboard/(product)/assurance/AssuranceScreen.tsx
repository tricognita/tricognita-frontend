"use client";

import * as React from "react";
import Link from "next/link";
import { Card, DateTime, Section, Skeleton, VStack } from "@/lib/ui";
import {
  activeExceptions,
  activeRun,
  lastCompletedRun,
  nextVerificationAt,
  openDrift,
  verificationTotals,
} from "@/lib/domain";
import { useControls, useDriftEvents, useExceptions, useVerificationRuns } from "@/lib/data";
import { QueryBoundary } from "./QueryBoundary";

/**
 * Assurance summary — one line of fact per view, then the way in.
 *
 * Counts only. "734 results across 8 completed runs" is something the customer
 * can check against the record; a percentage would be a claim about the part
 * of their cloud we did not see.
 */

function SummaryCard({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
    >
      <Card interactive className="h-full">
        <VStack gap="xs">
          <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</span>
          {children}
        </VStack>
      </Card>
    </Link>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--text-sm)] text-[var(--fg)]">{children}</span>;
}

function Supporting({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">{children}</span>;
}

export function AssuranceScreen() {
  const runs = useVerificationRuns();
  const controls = useControls();
  const drift = useDriftEvents();
  const exceptions = useExceptions();

  return (
    <VStack gap="xl">
      <Section
        eyebrow="The record"
        title="What assurance holds"
        description="Each card is a count from the record itself, not a summary of it."
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <QueryBoundary
            query={runs}
            unavailableMessage="Scheduled and on-demand verification runs."
            skeleton={<Skeleton className="h-28 w-full" />}
          >
            {(data) => {
              const running = activeRun(data);
              const last = lastCompletedRun(data);
              const next = controls.data ? nextVerificationAt(controls.data) : undefined;
              return (
                <SummaryCard href="/dashboard/assurance/verification" label="Verification">
                  <Headline>
                    {running
                      ? "A verification is running"
                      : last
                        ? <>Last verified <DateTime value={last.finishedAt ?? last.startedAt} variant="relative" /></>
                        : "No completed run yet"}
                  </Headline>
                  <Supporting>
                    {next ? (
                      <>Next verification <DateTime value={next} variant="relative" /></>
                    ) : (
                      "Controls are re-checked on schedule."
                    )}
                  </Supporting>
                </SummaryCard>
              );
            }}
          </QueryBoundary>

          <QueryBoundary
            query={runs}
            unavailableMessage="The full history of verification runs."
            skeleton={<Skeleton className="h-28 w-full" />}
          >
            {(data) => {
              const t = verificationTotals(data);
              return (
                <SummaryCard href="/dashboard/assurance/history" label="History">
                  <Headline>
                    {t.runs} run{t.runs === 1 ? "" : "s"} recorded
                  </Headline>
                  <Supporting>
                    {t.results} control result{t.results === 1 ? "" : "s"}
                    {t.failedRuns > 0
                      ? ` · ${t.failedRuns} run${t.failedRuns === 1 ? "" : "s"} did not complete`
                      : ""}
                  </Supporting>
                </SummaryCard>
              );
            }}
          </QueryBoundary>

          <QueryBoundary
            query={drift}
            unavailableMessage="Controls that stop meeting their expected state after passing."
            skeleton={<Skeleton className="h-28 w-full" />}
          >
            {(data) => {
              const open = openDrift(data).length;
              return (
                <SummaryCard href="/dashboard/assurance/drift" label="Drift">
                  <Headline>
                    {data.length === 0
                      ? "No drift recorded"
                      : `${open} open drift event${open === 1 ? "" : "s"}`}
                  </Headline>
                  <Supporting>
                    {data.length === 0
                      ? "No control has moved from passing to failing."
                      : `${data.length} recorded in total, open and closed.`}
                  </Supporting>
                </SummaryCard>
              );
            }}
          </QueryBoundary>

          <QueryBoundary
            query={exceptions}
            unavailableMessage="Risk your team has accepted in writing, with an expiry."
            skeleton={<Skeleton className="h-28 w-full" />}
          >
            {(data) => {
              const active = activeExceptions(data);
              return (
                <SummaryCard href="/dashboard/assurance/exceptions" label="Exceptions">
                  <Headline>
                    {active.length === 0
                      ? "No active exceptions"
                      : `${active.length} active exception${active.length === 1 ? "" : "s"}`}
                  </Headline>
                  <Supporting>
                    {active.length === 0
                      ? "Nothing is currently excluded from its control."
                      : <>Next expires <DateTime value={active[0].expiresAt} variant="relative" /></>}
                  </Supporting>
                </SummaryCard>
              );
            }}
          </QueryBoundary>
        </div>
      </Section>

      <Section
        eyebrow="How to read this"
        title="Why the record exists"
        description="A control result is a claim. These four views are what makes it checkable."
      >
        <Card>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[var(--text-sm)] text-[var(--fg)]">Verification</dt>
              <dd className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                A control is only as current as the run that last checked it. This view shows what
                ran, what is running, and what has not been checked.
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-sm)] text-[var(--fg)]">History</dt>
              <dd className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                Every run, including the ones that failed. A history without failures would not be
                a record.
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-sm)] text-[var(--fg)]">Drift</dt>
              <dd className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                A control that passed and later failed. Closed drift stays listed — it is the part
                that shows the loop worked.
              </dd>
            </div>
            <div>
              <dt className="text-[var(--text-sm)] text-[var(--fg)]">Exceptions</dt>
              <dd className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                Risk someone accepted on purpose, with a name against it and a date it lapses. An
                exception is a decision, not a silence.
              </dd>
            </div>
          </dl>
        </Card>
      </Section>
    </VStack>
  );
}
