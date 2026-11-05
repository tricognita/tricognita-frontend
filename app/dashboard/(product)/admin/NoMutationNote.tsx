import { Card, VStack } from "@/lib/ui";

/**
 * NoMutationNote — said once, at the top, in the customer's own terms.
 *
 * Every administration action in this release is disabled because the backend
 * has no endpoint behind it. Saying so plainly is better than a row of dead
 * buttons an administrator has to discover one at a time.
 */
export function NoMutationNote({ what }: { what: string }) {
  return (
    <Card density="compact">
      <VStack gap="xs">
        <span className="text-[var(--text-sm)] text-[var(--fg)]">
          Changes are not available yet
        </span>
        <span className="text-[var(--text-xs)] text-[var(--fg-muted)] max-w-[75ch]">
          {what} Nothing on this page sends a request, and nothing here changes your account.
        </span>
      </VStack>
    </Card>
  );
}
