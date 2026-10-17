import { Skeleton, VStack } from "@/lib/ui";

/**
 * Route-level skeleton in the shape of the final page — header, counts row,
 * then four sections — so the layout does not jump when data arrives.
 */
export default function OverviewLoading() {
  return (
    <VStack gap="xl" aria-busy="true" aria-label="Loading overview">
      <VStack gap="sm">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </VStack>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <VStack key={i} gap="sm">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </VStack>
      ))}
    </VStack>
  );
}
