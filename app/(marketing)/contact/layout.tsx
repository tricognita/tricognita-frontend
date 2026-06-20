import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Sales",
  description: "Talk to a Tricognita security architect to scope your cloud resilience implementation.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
