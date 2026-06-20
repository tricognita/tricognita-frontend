import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Tricognita works — Tricognita",
  description:
    "From cloud connection to remediation in five steps. The plain-English version of the architecture.",
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <header className="mb-12">
        <p className="mb-2 text-xs uppercase tracking-wider text-emerald-400">
          How it works
        </p>
        <h1 className="text-4xl font-bold text-white">From cloud to remediation in five steps</h1>
        <p className="mt-4 text-lg text-zinc-400">
          Tricognita is a security control plane, not a runtime agent. You
          grant read-only IAM access; we do the rest.
        </p>
      </header>

      <Step
        number={1}
        title="Connect your cloud accounts"
        body={
          <>
            <p>
              You apply a CloudFormation template (provided) that creates a
              cross-account IAM role with the read-only permissions Tricognita
              needs. We assume that role via AWS STS — no long-lived
              credentials cross the boundary.
            </p>
            <p>
              Equivalent flows exist for Azure (OIDC federation) and GCP
              (workload identity federation).
            </p>
          </>
        }
      />

      <Step
        number={2}
        title="We scan your environment"
        body={
          <>
            <p>
              Tricognita scans your cloud inventory against the
              CIS Benchmarks, AWS Well-Architected, NIST CSF, and a curated
              set of attack-relevant misconfigurations. Initial scans typically
              complete in 5–15 minutes; ongoing scans are scheduled or
              triggered manually.
            </p>
            <p>
              Findings populate your dashboard progressively as the scan runs.
              You don't wait for completion to start triaging.
            </p>
          </>
        }
      />

      <Step
        number={3}
        title="See findings in context"
        body={
          <>
            <p>
              Findings appear with severity, affected resource, and the
              evidence behind the verdict. The attack graph shows how
              individual findings chain into reachable attack paths — a public
              S3 bucket alone is concerning; the same bucket reachable through
              a Lambda with admin IAM is an incident.
            </p>
            <p>
              The SOC and queue views surface what to triage next, sorted by
              priority across incidents and high-severity findings.
            </p>
          </>
        }
      />

      <Step
        number={4}
        title="Approve remediation"
        body={
          <>
            <p>
              ARIA (our AI-assisted remediation engine) proposes a fix for
              each finding: the action, the target resource, the predicted
              impact, and the rollback plan. The approver — typically you —
              reviews and either approves, modifies, or rejects.
            </p>
            <p>
              By default, no action runs without human approval. The
              autonomous mode exists for narrow well-understood patterns and
              is opt-in per tenant. Most pilots run in manual-approval mode
              for their entire engagement.
            </p>
          </>
        }
      />

      <Step
        number={5}
        title="Report and improve"
        body={
          <>
            <p>
              The executive dashboard gives a CISO-level read of posture
              trend, active incidents, and remediation throughput. Exports
              cover compliance evidence (PDF, CSV, SOC 2 evidence pack) and
              SIEM ingest (NDJSON).
            </p>
            <p>
              Webhook subscriptions push the same event stream to your Slack,
              SIEM, ticketing system, or custom infrastructure.
            </p>
          </>
        }
      />

      <div className="mt-12 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8">
        <h2 className="text-xl font-semibold text-emerald-300">
          What this means operationally
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-300">
          <li>
            <strong className="text-white">Day 1:</strong> Connect one cloud
            account. See your real posture within the hour.
          </li>
          <li>
            <strong className="text-white">Week 1:</strong> Triage the first
            wave of critical and high findings. Run your first remediation
            approvals.
          </li>
          <li>
            <strong className="text-white">Month 1:</strong> Integrate with
            Slack and your SIEM. Schedule weekly scans. Run your first
            executive review.
          </li>
          <li>
            <strong className="text-white">Month 3:</strong> Posture score
            trending up. Most critical findings either remediated or
            consciously accepted with documented exception.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/request-demo"
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Request a demo
          </Link>
          <Link
            href="/trust"
            className="rounded border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          >
            See the trust center
          </Link>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <section className="mb-10 border-t border-zinc-800 pt-8">
      <div className="flex items-start gap-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-sm font-semibold text-emerald-300">
          {number}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <div className="mt-3 space-y-3 text-zinc-300 [&_p]:leading-relaxed">
            {body}
          </div>
        </div>
      </div>
    </section>
  );
}
