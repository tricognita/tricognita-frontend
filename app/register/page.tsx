import { Metadata } from "next";
import ClientPage from "./ClientPage";

export const metadata: Metadata = {
  title: "Register | Tricognita",
  description: "Request an account for the Tricognita control plane.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RegisterPage() {
  return <ClientPage />;
}
