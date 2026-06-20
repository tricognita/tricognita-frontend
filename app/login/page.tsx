import { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Login | Tricognita",
  description: "Sign in to the Tricognita control plane.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function LoginPage() {
  return <ClientPage />;
}
