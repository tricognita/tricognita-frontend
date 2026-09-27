import { Skeleton, VStack } from "@/lib/ui";

export default function AuditTrailLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading audit trail">
      <VStack gap="sm">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </VStack>
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </VStack>
  );
}
