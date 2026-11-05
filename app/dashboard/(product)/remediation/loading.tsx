import { Skeleton, VStack } from "@/lib/ui";

export default function RemediationLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading remediation">
      <VStack gap="sm">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </VStack>
      <Skeleton className="h-20 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </VStack>
  );
}
