"use client";

import Link from "next/link";
import {
  AuthorizingState,
  Card,
  HStack,
  NotAuthorizedState,
  PageHeader,
  Section,
  UnavailableState,
  VStack,
} from "@/lib/ui";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

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
        <UnavailableState willShow="Each action taken in your account — who took it, when, the object it affected, and its outcome — written to a tamper-evident record. Nothing is listed here yet because that record is not being served to the product." />
      </Section>

      <Section
        eyebrow="Available today"
        title="What is already on the record"
        description="These are real, dated records of what the product did. They do not cover what people did inside it."
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
          An audit trail is only worth anything if nothing in it was invented. This page will stay
          empty until it can show real entries.
        </p>
      </HStack>
    </VStack>
  );
}
