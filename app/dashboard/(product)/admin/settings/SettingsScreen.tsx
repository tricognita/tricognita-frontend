"use client";

import Link from "next/link";
import {
  AuthorizingState,
  Card,
  EmptyState,
  HStack,
  NotAuthorizedState,
  Section,
  Skeleton,
  VStack,
} from "@/lib/ui";
import { useControls, useOrganisation } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary } from "../QueryBoundary";

/**
 * Settings — what the organisation is, not a wall of switches.
 *
 * Only two facts have a contract behind them: the organisation's name and the
 * size of its control baseline. Nothing in the product is customer-editable
 * yet, so nothing is offered as editable. Inventing thresholds, schedules or
 * policy toggles would imply the customer controls behaviour they do not.
 */

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</dt>
      <dd className="text-[var(--text-sm)] text-[var(--fg)] break-words">{value}</dd>
      {note && <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">{note}</p>}
    </div>
  );
}

export function SettingsScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const org = useOrganisation();
  const controls = useControls();

  // The capability cannot be evaluated until the role is known, and the
  // protected surface must not render while the answer is outstanding.
  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "manageSettings")) {
    return <NotAuthorizedState subject="organisation settings" askWho="an administrator" />;
  }

  return (
    <VStack gap="lg">
      <Section
        eyebrow="Organisation"
        title="Your organisation"
        description="What Tricognita verifies for you."
        spacing="sm"
      >
        <QueryBoundary
          query={org}
          unavailableMessage="Your organisation's name and the size of the control baseline verified for it."
          skeleton={<Skeleton className="h-24 w-full" />}
        >
          {(data) => (
            <Card>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact label="Organisation" value={data.name} />
                <Fact
                  label="Controls in baseline"
                  value={String(data.controlsInBaseline)}
                  note={
                    controls.data && controls.data.length !== data.controlsInBaseline
                      ? `${controls.data.length} currently loaded`
                      : undefined
                  }
                />
              </dl>
            </Card>
          )}
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Configuration"
        title="Settings you can change"
        description="Anything that alters how your cloud is verified belongs here."
        spacing="sm"
      >
        <EmptyState
          variant="bordered"
          title="Nothing is customer-configurable yet"
          description="Your control baseline, verification schedule and alert behaviour are set with your Tricognita engineer. When any of them becomes self-service, it appears here — not before."
        />
      </Section>

      <nav aria-label="Related surfaces">
        <HStack gap="lg" className="flex-wrap">
          <Link
            href="/dashboard/controls"
            className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Controls — the baseline itself
          </Link>
          <Link
            href="/dashboard/cloud-accounts"
            className="text-[var(--text-xs)] underline underline-offset-2 text-[var(--fg-muted)] hover:text-[var(--fg)] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            Cloud accounts — what it is verified against
          </Link>
        </HStack>
      </nav>
    </VStack>
  );
}
