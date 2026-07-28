import { SiteNav } from "../components/site/SiteNav";
import { Footer } from "../components/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--primary-strong)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <SiteNav />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <Footer />
    </div>
  );
}
