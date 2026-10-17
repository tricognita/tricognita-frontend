import type { Metadata } from "next";
import { Container } from "../../components/marketing/Blocks";
import { ContactForm } from "../../components/marketing/ContactForm";
import { PRODUCT_DISPLAY_NAME } from "@/lib/marketing/capabilities";
import { DATA_HANDLING } from "@/lib/marketing/company";
import { CONTACT_PATH, parseContactParams } from "@/lib/marketing/contact";

// Copy: MARKETING_CONTENT_MASTER.md §19, updated for the scoping-call model
// (Rev B.1). One form for scoping calls, registrations of interest, security
// questions and general enquiries. Query parameters (intent, service, cloud,
// source) only prefill the form and are validated in lib/marketing/contact.ts.
export const metadata: Metadata = {
  title: "Contact",
  description: `Book a scoping call with Tricognita, register interest in a launching service or ${PRODUCT_DISPLAY_NAME}, or ask our security team a question.`,
  alternates: { canonical: CONTACT_PATH },
};

const SCOPING_COVERS = [
  "Your cloud environment",
  "The security problem you need solved",
  "The outcome you need, and by when",
  "The scope of a first engagement",
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const prefill = parseContactParams(await searchParams);

  return (
    <Container className="py-16 sm:py-24">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="eyebrow mb-3">Contact</p>
          <h1 className="text-3xl font-semibold tracking-tight text-fg [overflow-wrap:break-word] sm:text-5xl">
            Tell us what you need secured.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Most conversations start with a scoping call. We reply by email to arrange it, and you receive a written scope
            before any work starts.
          </p>
          <div className="mt-10">
            <ContactForm prefill={prefill} />
          </div>
        </div>
        <aside className="space-y-6 rounded-2xl border border-hair bg-surface p-6 text-sm lg:self-start">
          <div>
            <h2 className="font-semibold text-fg">A scoping call establishes</h2>
            <ul className="mt-2 space-y-1.5 text-muted">
              {SCOPING_COVERS.map((c) => (
                <li key={c} className="flex gap-2">
                  <span aria-hidden="true">–</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-fg">Security questions</h2>
            <a href="mailto:security@tricognita.com" className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
              security@tricognita.com
            </a>
          </div>
          <div>
            <h2 className="font-semibold text-fg">General</h2>
            <a href="mailto:contact@tricognita.com" className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline">
              contact@tricognita.com
            </a>
          </div>
          <div>
            <h2 className="font-semibold text-fg">Your data</h2>
            <ul className="mt-2 space-y-1.5 text-muted">
              {DATA_HANDLING.map((d) => (
                <li key={d} className="flex gap-2">
                  <span aria-hidden="true">–</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}
