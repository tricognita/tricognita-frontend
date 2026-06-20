import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description: "Explore the capabilities of the ARIA control plane, including CSPM, CIEM, and workload protection.",
};

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
