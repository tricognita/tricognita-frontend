"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Card, DateTime, EmptyState, HStack, VStack } from "@/lib/ui";
import { daysUntil, type Control, type Exception, type Resource } from "@/lib/domain";

/**
 * ExceptionsList — risk the customer decided to accept, with an expiry.
 *
 * An exception is a decision, not a silence: it names the owner, the reason and
 * the date it lapses. The remaining time is computed after mount so the server
 * and client render the same markup.
 */
export function ExceptionsList({
  exceptions,
  controls,
  resources,
  emptyTitle = "No exceptions",
  emptyDescription = "No control is currently covered by an accepted risk.",
}: {
  exceptions: Exception[];
  controls: Control[];
  resources: Resource[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => setNow(Date.now()), []);

  if (exceptions.length === 0) {
    return <EmptyState variant="bordered" title={emptyTitle} description={emptyDescription} />;
  }

  const controlById = new Map(controls.map((c) => [c.id, c]));
  const resourceById = new Map(resources.map((r) => [r.id, r]));

  return (
    <ul className="flex flex-col gap-2">
      {exceptions.map((e) => {
        const control = controlById.get(e.controlId);
        const remaining = now === null ? null : daysUntil(e.expiresAt, now);
        const expiringSoon = remaining !== null && remaining >= 0 && remaining <= 14;
        return (
          <li key={e.id}>
            <Card>
              <VStack gap="sm">
                <HStack gap="sm" justify="between" align="start" className="flex-wrap">
                  <Link
                    href={`/dashboard/controls/${e.controlId}`}
                    className="text-[var(--text-sm)] font-medium text-[var(--fg)] underline-offset-2 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
                  >
                    {control?.name ?? e.controlId}
                  </Link>
                  <HStack gap="xs" align="center">
                    <Badge intent={e.state === "ACTIVE" ? "neutral" : "neutral"} variant="outline" size="xs">
                      ◈ {e.state === "ACTIVE" ? "Active" : e.state === "EXPIRED" ? "Expired" : "Revoked"}
                    </Badge>
                    {expiringSoon && (
                      <Badge intent="warning" size="xs">
                        Expires in {remaining} day{remaining === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </HStack>
                </HStack>

                <p className="text-[var(--text-sm)] text-[var(--fg-muted)]">{e.reason}</p>

                <dl className="grid gap-2 sm:grid-cols-3 text-[var(--text-xs)]">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Accepted by</dt>
                    <dd className="text-[var(--fg)]">{e.owner}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Applies to</dt>
                    <dd className="text-[var(--fg)]">
                      {e.resourceIds
                        .map((id) => resourceById.get(id)?.label ?? "a resource")
                        .join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">Expires</dt>
                    <dd className="text-[var(--fg)]">
                      <DateTime value={e.expiresAt} variant="absolute" withTime={false} />
                    </dd>
                  </div>
                </dl>
              </VStack>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
