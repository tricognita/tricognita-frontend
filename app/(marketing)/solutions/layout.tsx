import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solutions",
  description: "Tricognita solutions tailored for Fintech, AI-Native operators, Web3 protocols, and Government agencies.",
};

export default function SolutionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
