import { AppShell } from "@/lib/ui";
import { FixtureBanner } from "@/lib/product/FixtureBanner";
import { ForceDarkTheme } from "@/lib/ui/ForceDarkTheme";

/**
 * Managed Cloud Control Assurance shell.
 *
 * Sibling of (legacy). Route groups do not affect URLs, so /dashboard/* keeps
 * working exactly as before and middleware/ROLE_ROUTES are untouched.
 */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <ForceDarkTheme />
      <FixtureBanner />
      {children}
    </AppShell>
  );
}
