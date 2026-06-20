import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tricognita for MSSPs — honest fit assessment",
  description:
    "What MSSPs can do with Tricognita today, what's coming, and the honest gaps. No oversell.",
};

export default function ForMsspsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <header className="mb-12">
        <p className="mb-2 text-xs uppercase tracking-wider text-emerald-400">
          For MSSPs
        </p>
        <h1 className="text-4xl font-bold text-white">
          MSSP fit: honest today, getting better
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Tricognita is a multi-tenant CSPM. The multi-tenant primitives are
          solid; the MSSP-specific aggregation layer is the next major build.
          Here's what that means for you.
        </p>
      </header>

      <Section title="What works today">
        <ul className="space-y-2 text-zinc-300">
          <li>
            <strong className="text-white">Per-customer ADMIN access.</strong>{" "}
            An MSSP analyst can be added as ADMIN on each customer's tenant
            and operate normally within that tenant.
          </li>
          <li>
            <strong className="text-white">Per-customer integrations.</strong>{" "}
            Each customer's webhooks, Slack channels, and exports work
            independently. One Slack channel per customer, or one shared
            channel filtered customer-side.
          </li>
          <li>
            <strong className="text-white">Tenant isolation.</strong> Four
            independent layers — session, BFF, Go API, database. Your customer
            cohort's data does not commingle.
          </li>
          <li>
            <strong className="text-white">Audit isolation.</strong> Every
            action an MSSP analyst takes is logged in the customer's tenant
            with the analyst's email. Your customer can audit you.
          </li>
        </ul>
      </Section>

      <Section title="The workaround stack (for the next few quarters)">
        <p>
          Until the MSSP-specific aggregation features ship, MSSPs running 1–5
          customers can use Tricognita with these patterns:
        </p>
        <ul className="space-y-2 text-zinc-300">
          <li>
            <strong className="text-white">Browser tab per customer.</strong>{" "}
            Tedious past ~10 customers but workable for small cohorts.
          </li>
          <li>
            <strong className="text-white">SIEM as unified queue.</strong>{" "}
            Configure every customer's Tricognita to push webhooks to your
            shared SIEM with a customer-id tag. Your SIEM becomes the
            unified analyst surface.
          </li>
          <li>
            <strong className="text-white">SIEM NDJSON pull.</strong> Each
            customer's <code>/api/admin/exports/siem.ndjson</code> can be
            polled from a central aggregator. Customer id is in every event
            envelope.
          </li>
        </ul>
      </Section>

      <Section title="What's NOT there yet">
        <ul className="space-y-2 text-zinc-300">
          <li>
            <strong className="text-white">No unified multi-customer queue.</strong>{" "}
            Today you switch tenants to see each customer's queue. There's no
            "all my customers' criticals" view yet.
          </li>
          <li>
            <strong className="text-white">No cross-tenant search.</strong>{" "}
            "Which customers are affected by CVE-X?" requires logging into
            each separately.
          </li>
          <li>
            <strong className="text-white">No first-class MSSP organization.</strong>{" "}
            The MSSP itself isn't an entity above the tenant layer — yet.
          </li>
          <li>
            <strong className="text-white">No multi-customer bulk evidence.</strong>{" "}
            End-of-month reports are per-customer, not "Q1 evidence for all
            12 of my customers in one zip."
          </li>
        </ul>
      </Section>

      <Section title="Coming next">
        <p>
          The MSSP-specific Phase 18+ build, in priority order:
        </p>
        <ol className="space-y-2 text-zinc-300">
          <li>
            <strong className="text-white">1. Cross-customer unified queue</strong>{" "}
            — priority-sorted across every customer you're authorized for.
          </li>
          <li>
            <strong className="text-white">2. Customer roster</strong> —
            tabular health summary across your book.
          </li>
          <li>
            <strong className="text-white">3. Cross-tenant search</strong> —
            search across all your customers.
          </li>
          <li>
            <strong className="text-white">4. SLA aggregation</strong> — your
            book-level SLA compliance dashboard.
          </li>
          <li>
            <strong className="text-white">5. First-class MSSP entity</strong>{" "}
            — MSSP organization above tenants with roster, analysts, billing.
          </li>
        </ol>
        <p className="mt-4 text-sm text-zinc-500">
          Timeline is not committed publicly. Design partners get earlier
          access to the roadmap and can shape priority.
        </p>
      </Section>

      <Section title="The honest answer">
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-5">
          <p className="text-zinc-300">
            If you're an MSSP running 1–5 small customers and OK with browser-tab
            workflow, Tricognita can work today. If you're running 20+ customers
            and need a unified analyst surface, wait for Phase 18+ — or design-
            partner with us now to shape it.
          </p>
          <p className="mt-3 text-zinc-300">
            We will tell you directly if the fit isn't there. Overselling MSSP
            readiness would damage the trust the rest of the platform depends on.
          </p>
        </div>
      </Section>

      <div className="mt-12 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <h2 className="text-xl font-semibold text-emerald-300">
          Want to be an MSSP design partner?
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          The first MSSP design partners will shape the multi-customer
          features directly. Pre-negotiated terms for partners who graduate to
          paid.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/pilot-application"
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            Apply as MSSP partner
          </Link>
          <Link
            href="/request-demo"
            className="rounded border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-900"
          >
            See it first
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
