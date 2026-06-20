import type { Metadata } from "next";
import { LeadForm } from "../components/LeadForm";

export const metadata: Metadata = {
  title: "Request a demo — Tricognita",
  description:
    "See how Tricognita scans your cloud, surfaces attack paths, and runs human-approved remediation. 30-minute walkthrough with the founder.",
};

export default function RequestDemoPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white">See Tricognita in action</h1>
        <p className="mt-3 text-zinc-400">
          A 30-minute walkthrough with the founder. We'll cover posture
          scanning, attack-path analysis, the incident workflow, and the
          ARIA AI-assisted remediation flow. No slides — live product.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8">
        <LeadForm
          kind="request_demo"
          title="Tell us a little about you"
          subtitle="We respond within 1–2 business days with a calendar link."
          fieldSet="qualified"
          submitLabel="Request demo"
          preamble="The more context you share, the more tailored the walkthrough. Optional fields skip with no penalty."
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 text-sm text-zinc-400 md:grid-cols-3">
        <Bullet>
          <strong className="text-zinc-200">What you'll see</strong>
          <p className="mt-1">
            Real workflows against synthetic demo data. Findings, attack graph,
            incident workflow, executive reporting, exports.
          </p>
        </Bullet>
        <Bullet>
          <strong className="text-zinc-200">What we'll ask</strong>
          <p className="mt-1">
            How your team operates today, what's broken, where Tricognita
            could realistically help. Honest, not pitchy.
          </p>
        </Bullet>
        <Bullet>
          <strong className="text-zinc-200">What's next</strong>
          <p className="mt-1">
            If there's mutual fit, we'll discuss a pilot. If not, we'll
            tell you so — and likely point you somewhere better.
          </p>
        </Bullet>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-zinc-800 p-4">{children}</div>;
}
