import { PageHeader, VStack } from "@/lib/ui";
import { AssuranceNav } from "./AssuranceNav";

/**
 * Assurance — the record behind every control result.
 *
 * One header and one tab strip for all five views: what ran, what the record
 * holds, what drifted, and what risk was accepted on purpose.
 */
export default function AssuranceLayout({ children }: { children: React.ReactNode }) {
  return (
    <VStack gap="lg">
      <PageHeader
        title="Assurance"
        description="How each control result was reached: the runs behind it, what changed after it passed, and the risk that was accepted in writing."
      />
      <AssuranceNav />
      {children}
    </VStack>
  );
}
