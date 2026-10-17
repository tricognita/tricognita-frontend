import { Skeleton, VStack } from "@/lib/ui";

export default function FindingDetailLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading finding">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </VStack>
  );
}
