import { Skeleton, VStack } from "@/lib/ui";

export default function AssuranceLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading assurance">
      <Skeleton className="h-9 w-full" />
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <VStack gap="sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </VStack>
    </VStack>
  );
}
