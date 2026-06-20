import type { Metadata } from "next";
import { LeadForm } from "../components/LeadForm";

export const metadata: Metadata = {
  title: "Join the waitlist — Tricognita",
  description:
    "Get notified when self-serve Tricognita opens up. We're in pilot phase today; the waitlist is the way to be early for general availability.",
};

export default function WaitlistPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white">Join the waitlist</h1>
        <p className="mt-3 text-zinc-400">
          We're working with a small number of design partners today. The
          waitlist is the way to be early when we open up self-serve access.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8">
        <LeadForm
          kind="waitlist"
          title="Get on the list"
          fieldSet="minimal"
          submitLabel="Join waitlist"
        />
      </div>

      <p className="mt-8 text-center text-xs text-zinc-500">
        Want a demo or a pilot sooner?{" "}
        <a className="text-emerald-400 hover:underline" href="/request-demo">
          Request a demo
        </a>{" "}
        or{" "}
        <a className="text-emerald-400 hover:underline" href="/pilot-application">
          apply for a pilot
        </a>
        .
      </p>
    </div>
  );
}
