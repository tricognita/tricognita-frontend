import type { Metadata } from "next";
import { FindingDetailScreen } from "./FindingDetailScreen";

export const metadata: Metadata = {
  title: "Finding · Tricognita",
  description: "What is failing, on which resource, and the steps that resolve it.",
};

export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ findingId: string }>;
}) {
  const { findingId } = await params;
  return <FindingDetailScreen findingId={findingId} />;
}
