import { PageHeader, VStack } from "@/lib/ui";
import { AdminNav } from "./AdminNav";

/**
 * Administration — configuring the product, not assuring the cloud.
 *
 * Deliberately quieter than Overview, Controls and Assurance: this is where
 * someone sets the product up, not where they read what it found.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <VStack gap="lg">
      <PageHeader
        title="Administration"
        description="Who has access, where alerts go, which integrations exist, and what your organisation is set up to verify."
      />
      <AdminNav />
      {children}
    </VStack>
  );
}
