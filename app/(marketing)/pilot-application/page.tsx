import type { Metadata } from "next";
import { LeadForm } from "../components/LeadForm";

export const metadata: Metadata = {
  title: "Apply for a pilot — Tricognita",
  description:
    "Tricognita is in active pilot phase with selected design partners. Apply to join the next cohort.",
};

export default function PilotApplicationPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white">Apply for a pilot</h1>
        <p className="mt-3 text-zinc-400">
          Tricognita runs structured pilots with a small number of design
          partners each quarter. Pilots are 4–12 weeks, no charge, with
          direct founder access.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8">
        <LeadForm
          kind="pilot_application"
          title="Pilot application"
          subtitle="We respond within 3 business days with a fit assessment."
          fieldSet="qualified"
          submitLabel="Submit application"
          preamble="We accept pilots based on fit, not pipeline. Honest answers help us route you correctly — even if that means declining."
        />
      </div>

      <div className="mt-12 space-y-6 text-sm text-zinc-300">
        <Section title="What pilots get">
          <ul className="space-y-1.5 text-zinc-400">
            <li>• Full platform access for 4–12 weeks at no charge.</li>
            <li>• Direct Slack / email channel with the founder.</li>
            <li>• Bi-weekly check-ins. Your feedback shapes the roadmap.</li>
            <li>• Pre-negotiated paid-conversion terms for graduating pilots.</li>
          </ul>
        </Section>
        <Section title="What pilots commit to">
          <ul className="space-y-1.5 text-zinc-400">
            <li>• 30 minutes every other week with the founder.</li>
            <li>• Honest feedback — what works, what doesn't, what's missing.</li>
            <li>• At least one team member willing to use the platform weekly.</li>
            <li>• At least one connected cloud account (read-only is fine).</li>
          </ul>
        </Section>
        <Section title="When we decline">
          <p className="text-zinc-400">
            We sometimes decline because the fit isn't there yet — usually
            because a customer needs MSSP multi-customer features, hard SOC 2
            Type II, or BYOK, all of which we're transparent about not
            shipping yet. If that's you, we'll say so and revisit when the
            platform catches up.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-zinc-800 p-5">
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}
