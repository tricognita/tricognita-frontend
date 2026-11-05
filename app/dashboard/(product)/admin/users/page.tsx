import type { Metadata } from "next";
import { UsersScreen } from "./UsersScreen";

export const metadata: Metadata = {
  title: "Users · Administration · Tricognita",
  description: "Everyone who can sign in to your organisation, and what each of them may do.",
};

export default function UsersPage() {
  return <UsersScreen />;
}
