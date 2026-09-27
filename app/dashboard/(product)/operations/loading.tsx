import { Skeleton, VStack } from "@/lib/ui";

export default function OperationsLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading operations">
      <VStack gap="sm">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </VStack>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </VStack>
  );
}
