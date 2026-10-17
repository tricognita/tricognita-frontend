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
  // A finding id is "<control>::<resource>"; the colons reach the route percent-encoded
  // and would never equal the id the list holds, so every finding opened as "not found".
  let id = findingId;
  try {
    id = decodeURIComponent(findingId);
  } catch {
    // a malformed escape stays as given and resolves to "not found"
  }
  return <FindingDetailScreen findingId={id} />;
}
