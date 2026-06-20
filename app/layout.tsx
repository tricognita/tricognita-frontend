import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Variable serif — used only for display headings. Keep axes, omit weight
// (next/font rejects combining explicit weight[] with axes[]).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tricognita.com"),
  title: {
    default: "Tricognita — Autonomous Cloud Resilience",
    template: "%s | Tricognita",
  },
  description:
    "Tricognita delivers autonomous cloud security with ARIA — predictive risk, self-healing remediation, and zero-trust enforcement for enterprise teams.",
  openGraph: {
    title: "Tricognita — Autonomous Cloud Resilience",
    description: "Predictive risk, self-healing remediation, and zero-trust enforcement for enterprise teams.",
    url: "https://tricognita.com",
    siteName: "Tricognita",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tricognita — Autonomous Cloud Resilience",
    description: "Predictive risk, self-healing remediation, and zero-trust enforcement for enterprise teams.",
    creator: "@tricognita",
    site: "@tricognita",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased cursor-leaf`}
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col text-stone-50">
        {children}
      </body>
    </html>
  );
}
