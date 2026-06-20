import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tricognita for cloud security teams",
  description:
    "How Tricognita fits the workflow of an in-house cloud security team — from scan to remediation to executive reporting.",
};

export default function ForCloudTeamsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <header className="mb-12">
        <p className="mb-2 text-xs uppercase tracking-wider text-emerald-400">
          For cloud security teams
        </p>
        <h1 className="text-4xl font-bold text-white">
          One control plane for your cloud posture
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          You're running security across AWS / Azure / GCP. You want fewer
          dashboards, less manual triage, and a defensible audit trail.
          Tricognita is built for that.
        </p>
      </header>

      <Section title="The day-to-day">
        <Two>
          <Bullet
            title="Morning triage"
            body="Open the SOC view. See active incidents, critical findings, and the SLA chips that tell you what's aging. Triage in priority order; assign or escalate from the same surface."
          />
          <Bullet
            title="Mid-day approvals"
            body="ARIA proposals land in your queue. Review the proposed action, predicted impact, and rollback plan. Approve, modify, or reject in two clicks."
          />
          <Bullet
            title="Weekly review"
            body="Run the executive PDF for your CISO. Schedule next week's scans. Review remediation throughput and incident MTTR trends."
          />
          <Bullet
            title="Monthly compliance"
            body="Pull the SOC 2 evidence pack for your auditor. Export findings to your SIEM. Close the loop on compliance controls."
          />
        </Two>
      </Section>

      <Section title="What you bring">
        <ul className="space-y-2 text-zinc-300">
          <li>
            <strong className="text-white">Cloud accounts.</strong> Read-only
            cross-account IAM access. We provide the CloudFormation template;
            you apply it and paste the role ARN.
          </li>
          <li>
            <strong className="text-white">Team members.</strong> Up to 75 on
            Professional; up to 500 on Enterprise. Each with a role from the
            built-in matrix (admin / SecOps / auditor / SOC lead / DevSecOps /
            cloud engineer / red teamer / FinOps / client / viewer).
          </li>
          <li>
            <strong className="text-white">Integration endpoints.</strong>{" "}
            Slack channels, SIEM ingest URLs, ticketing system webhooks. We
            sign everything with HMAC; you verify on your end.
          </li>
        </ul>
      </Section>

      <Section title="What Tricognita brings">
        <Two>
          <Bullet
            title="Posture scanning"
            body="CIS Benchmarks, AWS Well-Architected, NIST CSF, custom controls. Initial scan in 5–15 minutes; ongoing on schedule."
          />
          <Bullet
            title="Attack-path analysis"
            body="Findings chain into reachable attack graphs. A public bucket is concerning; the same bucket reachable through admin IAM is an incident."
          />
          <Bullet
            title="Incident workflow"
            body="Declare, assign, escalate, note, resolve. Activity timeline is the canonical handoff record."
          />
          <Bullet
            title="AI-assisted remediation"
            body="ARIA proposes fixes with rollback plans. Human-approved by default; autonomous mode for narrow well-understood patterns only."
          />
        </Two>
      </Section>

      <Section title="What's NOT a Tricognita workflow">
        <ul className="space-y-2 text-zinc-300">
          <li>
            <strong className="text-white">Endpoint security.</strong> EDR /
            XDR live in a different layer. We focus on cloud control plane.
          </li>
          <li>
            <strong className="text-white">Runtime workload security.</strong>{" "}
            We do not install agents on your workloads. Configuration drift
            and posture only.
          </li>
          <li>
            <strong className="text-white">SAST / DAST.</strong> Code-level
            scanning is its own product category. We integrate with your
            existing tools via webhooks.
          </li>
        </ul>
      </Section>

      <div className="mt-12 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <h2 className="text-xl font-semibold text-emerald-300">
          See if Tricognita fits your team
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          A 30-minute walkthrough with the founder. Live product, not slides.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/request-demo"
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Request a demo
          </Link>
          <Link
            href="/pilot-application"
            className="rounded border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          >
            Apply for a pilot
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 border-t border-zinc-800 pt-8">
      <h2 className="mb-4 text-2xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-zinc-300">{children}</div>
    </section>
  );
}

function Two({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="mb-1.5 font-semibold text-white">{title}</h3>
      <p className="text-sm text-zinc-400">{body}</p>
    </div>
  );
}
