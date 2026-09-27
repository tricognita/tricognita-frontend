import { Skeleton, VStack } from "@/lib/ui";

export default function AdminLoading() {
  return (
    <VStack gap="lg" aria-busy="true" aria-label="Loading administration">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </VStack>
  );
}
