import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resources",
  description: "Research, technical briefs, and field notes on autonomous cloud resilience.",
};

type ResourceStatus = "Available" | "Coming Soon";
type Resource = { kind: string; title: string; sub: string; status: ResourceStatus };

const ITEMS: Resource[] = [
  { kind: "Whitepaper",      title: "The ARIA Doctrine: Autonomous Resilience in Modern Cloud", sub: "How policy-bound remediation collapses MTTR while staying inside cryptographic guardrails.",                       status: "Coming Soon" },
  { kind: "Technical Brief", title: "Attack Graph Theory for Cloud Blast-Radius Modeling",      sub: "Graph primitives, lateral movement inference, and why BFS is not enough for blast-radius analysis.",                  status: "Coming Soon" },
  { kind: "Technical Brief", title: "Tenant Isolation in a Multi-Tenant Control Plane",        sub: "How Tricognita scopes data and remediations per tenant — including the API-layer rejections that back it up.",         status: "Coming Soon" },
  { kind: "Blog",            title: "Prompt Injection Is a Cloud Security Problem",            sub: "Defending Bedrock, Anthropic, and OpenAI workloads with runtime policy via ARIA Guard.",                                status: "Coming Soon" },
  { kind: "Blog",            title: "Read-only Onboarding: Why Day-One Audits Should Be Free", sub: "The case for a 14-day, no-writes audit as the default first contact between a security platform and a customer.",       status: "Coming Soon" },
  { kind: "Field Note",      title: "What We Learned in the Founding Cohort",                  sub: "Patterns we've seen across the founding cohort — and what we changed in the product because of them.",      status: "Coming Soon" },
];

export default function ResourcesPage() {
  return (
    <>
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-3">Resources</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-50 tracking-tight">Research, briefs, and field notes.</h1>
        <p className="mt-5 max-w-2xl mx-auto text-base text-zinc-400 leading-relaxed">
          How we think about policy-bound cloud resilience — and the field notes from
          building it with our founding cohort.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-2 gap-4">
        {ITEMS.map((i) => (
          <article key={i.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-violet-800/60 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[10px] uppercase tracking-widest text-violet-400 font-semibold">{i.kind}</p>
              {i.status === "Coming Soon" && (
                <span className="text-[10px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
                  Coming Soon
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-zinc-100 mb-2">{i.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed mb-4">{i.sub}</p>
            <Link
              href="/contact"
              className="text-xs font-semibold text-violet-400 hover:text-violet-300"
            >
              {i.status === "Available" ? "Request copy →" : "Notify me when published →"}
            </Link>
          </article>
        ))}
      </section>
    </>
  );
}
