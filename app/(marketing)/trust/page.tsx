import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trust Center — Tricognita",
  description:
    "Tricognita's security posture: tenant isolation, encryption, authentication, audit, telemetry boundaries, and the honest gaps.",
};

export default function TrustCenterPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <header className="mb-12">
        <p className="mb-2 text-xs uppercase tracking-wider text-emerald-400">
          Trust Center
        </p>
        <h1 className="text-4xl font-bold text-white">Security and operational posture</h1>
        <p className="mt-4 text-lg text-zinc-400">
          Tricognita is a multi-tenant security platform. This page summarizes
          what we do, what we don't yet do, and how you can verify both.
        </p>
      </header>

      <Section title="At a glance">
        <Grid>
          <Cell label="Hosting" value="Vercel (BFF) + Fly.io (Go API)" />
          <Cell label="Database" value="Neon Postgres" />
          <Cell label="Cache / queue" value="Upstash Redis" />
          <Cell label="Data region" value="Configurable per deployment (Asia-Pacific default)" />
          <Cell label="Encryption at rest" value="AES-256 across Postgres, Redis, S3" />
          <Cell label="Encryption in transit" value="TLS 1.2+, HSTS preload-eligible" />
        </Grid>
      </Section>

      <Section title="Authentication and authorization">
        <p>
          Tricognita uses HMAC-SHA256 signed session cookies with a 15-minute
          lifetime and a 7-day refresh token scoped to the refresh endpoint.
          Tokens are bound to the user agent at issuance time and include a
          per-issuance unique identifier that participates in server-side
          revocation.
        </p>
        <p>
          Authorization runs through three independent layers — edge middleware
          on path prefixes, per-handler role checks in every BFF route, and
          page-level capability guards. A privilege-escalation bug would
          require simultaneous failures in all three.
        </p>
      </Section>

      <Section title="Tenant isolation">
        <p>
          Every customer-data row carries a tenant id. The tenant id is part of
          the signed session, part of the JIT token minted for upstream calls,
          and part of every database query. The browser-side cache is flushed
          on tenant transitions.
        </p>
        <p>
          Cross-tenant access for support purposes goes through a documented
          admin flow that is audit-logged. We do not allow silent
          impersonation.
        </p>
      </Section>

      <Section title="Audit logs">
        <p>
          Every state-changing action — login, scan, remediation approval,
          credential change, policy edit, incident transition, export — is
          recorded in an append-only audit log with hash-linked tamper
          evidence. Audit logs are never deleted, and customers can export
          their full audit trail at any time.
        </p>
      </Section>

      <Section title="Webhook security">
        <p>
          Outbound webhooks are signed with HMAC-SHA256 using a per-subscription
          secret. Signature header follows the Stripe convention
          (<code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs">t=…,v1=…</code>) and
          customers should verify with a constant-time comparison and reject
          signatures older than 5 minutes.
        </p>
        <p>
          We send webhooks; we do not receive them. There is no inbound webhook
          endpoint to attack.
        </p>
      </Section>

      <Section title="Telemetry posture">
        <p>
          We collect product usage signals (which pages are visited, which
          workflows complete) for internal product decisions. We do not load
          any third-party analytics SDK. Telemetry events carry a one-way
          truncated SHA-256 of the user's email — never the email itself. We
          do not capture IPs, cookies, form contents, mouse movement, or
          scroll depth.
        </p>
        <p>
          Telemetry is fail-open: a Redis outage drops events silently rather
          than blocking user actions. Detailed schema and retention policy are
          documented in <code>docs/TELEMETRY_GOVERNANCE.md</code>.
        </p>
      </Section>

      <Section title="Vulnerability disclosure">
        <p>
          We follow coordinated disclosure. Security reports go to{" "}
          <code>security@tricognita.com</code> or via private GitHub Security
          Advisory. We acknowledge within 2 business days and respond
          substantively within 7. Reporters are credited in resulting
          advisories, with permission.
        </p>
      </Section>

      <Section title="What we do not yet certify">
        <Grid>
          <Cell label="SOC 2 Type II" value="In progress with external auditor. Type I evidence available under NDA." />
          <Cell label="ISO 27001" value="Not certified. Many underlying controls are documented." />
          <Cell label="HIPAA" value="Not in scope. Platform does not process PHI." />
          <Cell label="PCI DSS" value="Not in scope. Platform does not process cardholder data." />
          <Cell label="FedRAMP" value="Not planned today." />
          <Cell label="BYOK / Customer-managed KMS" value="Platform-managed KMS today. BYOK on roadmap." />
        </Grid>
        <p className="mt-4 text-sm text-zinc-500">
          Stating these gaps directly is part of the trust posture. Pretending
          to certifications we don't have would be the larger problem.
        </p>
      </Section>

      <Section title="Verifying these claims">
        <p>
          The public OSS frontend repository contains the BFF middleware,
          session signing, tenant boundary, and audit logging code. Most
          claims on this page can be verified by reading{" "}
          <code>lib/auth.ts</code>, <code>middleware.ts</code>, and the docs
          under <code>docs/</code>.
        </p>
        <p>
          For enterprise customers, we provide a full security review pack
          covering the threat model, control mappings, and the security
          architecture in detail. Request via{" "}
          <Link href="/contact" className="text-emerald-400 hover:underline">
            contact
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 border-t border-zinc-800 pt-8">
      <h2 className="mb-4 text-2xl font-semibold text-white">{title}</h2>
      <div className="space-y-3 text-zinc-300 [&_p]:leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>;
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-zinc-200">{value}</div>
    </div>
  );
}
