import { PageHeader, VStack } from "@/lib/ui";
import { ReportsNav } from "./ReportsNav";

/**
 * Reports — the proof layer.
 *
 * Three outputs, one record behind them: the recurring monthly report, the
 * short summary a customer asks for, and the evidence both are drawn from.
 */
export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <VStack gap="lg">
      <PageHeader
        title="Reports"
        description="What you can show a customer or an auditor: what was checked, when, what was found, and the evidence behind it."
      />
      <ReportsNav />
      {children}
    </VStack>
  );
}
