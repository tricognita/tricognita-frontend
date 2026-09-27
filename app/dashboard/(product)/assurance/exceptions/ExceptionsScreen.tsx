"use client";

import { Button, Section, VStack } from "@/lib/ui";
import { ExceptionsList } from "@/lib/product";
import { activeExceptions, pastExceptions } from "@/lib/domain";
import { useControls, useExceptions, useResources } from "@/lib/data";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";
import { QueryBoundary, SkeletonRows } from "../QueryBoundary";

/**
 * Exceptions — risk the customer accepted, in writing, with an expiry.
 *
 * An exception is never a way to make a failing control disappear: the control
 * keeps its status, and the acceptance is recorded next to it with an owner and
 * a date it lapses.
 */
export function ExceptionsScreen() {
  const { role } = useSession();
  const exceptions = useExceptions();
  const controls = useControls();
  const resources = useResources();

  const canManage = canDo(role, "manageExceptions");

  return (
    <VStack gap="xl">
      <Section
        eyebrow="Active"
        title="Accepted risk"
        description="Every active exception names who accepted it, why, and when it lapses."
        actions={
          canManage ? (
            <Button
              variant="secondary"
              size="sm"
              disabled
              title="Recording an exception arrives with the exceptions API. Existing exceptions are shown as recorded."
            >
              Add exception
            </Button>
          ) : null
        }
      >
        <QueryBoundary
          query={exceptions}
          unavailableMessage="Risk your team has accepted in writing, with an expiry."
          skeleton={<SkeletonRows count={2} height="h-32" />}
        >
          {(data) => (
            <ExceptionsList
              exceptions={activeExceptions(data)}
              controls={controls.data ?? []}
              resources={resources.data ?? []}
              emptyTitle="No active exceptions"
              emptyDescription="Nothing is currently excluded from the control that covers it."
            />
          )}
        </QueryBoundary>
      </Section>

      <Section
        eyebrow="Past"
        title="Expired and revoked"
        description="Kept on the record. An auditor asks what was accepted then, not only what is accepted now."
      >
        <QueryBoundary
          query={exceptions}
          unavailableMessage="Exceptions that have expired or been revoked."
          skeleton={<SkeletonRows count={1} height="h-32" />}
        >
          {(data) => (
            <ExceptionsList
              exceptions={pastExceptions(data)}
              controls={controls.data ?? []}
              resources={resources.data ?? []}
              emptyTitle="No past exceptions"
              emptyDescription="No exception has expired or been revoked yet."
            />
          )}
        </QueryBoundary>
      </Section>
    </VStack>
  );
}
