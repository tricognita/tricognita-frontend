import ClientLayout from "./ClientLayout";

/**
 * Legacy dashboard shell.
 *
 * Holds every pre-Phase-1 dashboard page. The shell that used to live in
 * app/dashboard/layout.tsx moved here unchanged so the new product shell in
 * (product)/ can exist alongside it. Route groups do not affect URLs, so every
 * legacy URL resolves exactly as before.
 */
export default function LegacyDashboardLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}
