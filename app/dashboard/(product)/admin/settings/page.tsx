import type { Metadata } from "next";
import { SettingsScreen } from "./SettingsScreen";

export const metadata: Metadata = {
  title: "Settings · Administration · Tricognita",
  description: "Your organisation and the control baseline Tricognita verifies for it.",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
