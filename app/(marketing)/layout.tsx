import { MarketingNav } from "../components/MarketingNav";
import { Footer } from "../components/Footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
