import { Skeleton, VStack } from "@/lib/ui";

export default function CloudAccountsLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading cloud accounts">
      <VStack gap="sm">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </VStack>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </VStack>
  );
}
