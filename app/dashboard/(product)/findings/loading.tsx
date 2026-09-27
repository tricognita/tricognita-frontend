import { Skeleton, VStack } from "@/lib/ui";

export default function FindingsLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading findings">
      <VStack gap="sm">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </VStack>
      <Skeleton className="h-9 w-full" />
      <VStack gap="sm">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </VStack>
    </VStack>
  );
}
