import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent, predictable pricing for Tricognita's autonomous cloud resilience platform.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
