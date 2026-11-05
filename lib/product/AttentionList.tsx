import Link from "next/link";
import { Card, DateTime, EmptyState, HStack, VStack } from "@/lib/ui";
import type { AttentionItem } from "@/lib/domain";
import { ControlStatusBadge } from "./StatusBadges";

/**
 * AttentionList — "what needs attention?", ranked.
 *
 * Drift sits above a control that never passed: a regression means something
 * changed in a cloud someone believed was in order. Exceptions come last —
 * they are decisions already taken, shown so they cannot be forgotten.
 */

const KIND_LABEL: Record<AttentionItem["kind"], string> = {
  DRIFT: "Drift",
  FAILING_CONTROL: "Failing control",
  REMEDIATION_FAILED: "Fix failed",
  REMEDIATION_AWAITING_APPROVAL: "Awaiting approval",
  NOT_ASSESSED: "Not assessed",
  ACCOUNT: "Cloud account",
  EXCEPTION: "Exception",
};

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        title="Nothing needs attention"
        description="Every control in the baseline is passing or covered by an exception."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="block rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <Card density="compact" interactive>
              <VStack gap="xs">
                <HStack gap="sm" align="start" justify="between" className="flex-wrap">
                  <span className="text-[var(--text-sm)] font-medium text-[var(--fg)] min-w-0">
                    {item.title}
                  </span>
                  <HStack gap="xs" align="center" className="shrink-0">
                    {item.status ? (
                      <ControlStatusBadge status={item.status} size="xs" />
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">
                        {KIND_LABEL[item.kind]}
                      </span>
                    )}
                  </HStack>
                </HStack>
                <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
                  {item.detail}
                  {item.occurredAt && (
                    <>
                      {" "}
                      <DateTime
                        value={item.occurredAt}
                        variant="relative"
                        className="text-[var(--fg-subtle)]"
                      />
                    </>
                  )}
                </p>
              </VStack>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
