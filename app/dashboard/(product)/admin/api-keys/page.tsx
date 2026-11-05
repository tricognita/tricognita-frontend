import type { Metadata } from "next";
import { ApiKeysScreen } from "./ApiKeysScreen";

export const metadata: Metadata = {
  title: "API keys · Administration · Tricognita",
  description: "Keys that let your own systems read your assurance data.",
};

export default function ApiKeysPage() {
  return <ApiKeysScreen />;
}
