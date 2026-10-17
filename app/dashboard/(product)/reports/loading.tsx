import { Skeleton, VStack } from "@/lib/ui";

export default function ReportsLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading reports">
      <Skeleton className="h-9 w-full" />
      <VStack gap="sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </VStack>
    </VStack>
  );
}
