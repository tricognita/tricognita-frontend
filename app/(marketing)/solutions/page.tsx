import type { Metadata } from "next";
import SolutionsContent from "./SolutionsContent";

export const metadata: Metadata = {
  title: "Solutions",
  description:
    "Cloud security and compliance built for fintech, GenAI SaaS, healthcare, public-sector, and Web3 teams — with India and UAE data sovereignty as a first-class priority.",
  alternates: { canonical: "/solutions" },
};

export default function SolutionsPage() {
  return <SolutionsContent />;
}
