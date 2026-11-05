import type { Metadata } from "next";
import { ControlDetailScreen } from "./ControlDetailScreen";

export const metadata: Metadata = {
  title: "Control · Tricognita",
  description: "Control state, resources checked, verification history and evidence.",
};

export default async function ControlDetailPage({
  params,
}: {
  params: Promise<{ controlId: string }>;
}) {
  const { controlId } = await params;
  return <ControlDetailScreen controlId={controlId} />;
}
