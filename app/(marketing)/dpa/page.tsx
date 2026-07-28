export const metadata = { title: "Data Processing Agreement — Tricognita.com" };

export default function DPAPage() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20 text-zinc-300">
      <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-2">Legal</p>
      <h1 className="text-4xl font-bold text-zinc-50 mb-6">Data Processing Agreement (DPA)</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: {new Date().toISOString().split('T')[0]}</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          This Data Processing Agreement ("DPA") forms part of the Terms of Service between Tricognita.com ("Data Processor") and the Customer ("Data Controller"). It governs the processing of personal data in connection with your use of the Tricognita Cloud Security Posture Management (CSPM) and ARIA platform.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">1. Scope of Processing</h2>
        <p>
          The Data Processor will process personal data solely on behalf of the Data Controller for the purpose of providing security monitoring, misconfiguration detection, and automated remediation (the "Services"). Processing will be limited strictly to the duration of the Master Agreement.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">2. Data Residency (Control-Plane Architecture)</h2>
        <p>
          Tricognita operates on a control-plane architecture. Your raw cloud resources and configuration data remain within <strong>your own cloud account and the region you designate</strong>; the Tricognita control plane reads them in place to deliver the Services and does <strong>not</strong> warehouse your customer data. The posture findings, remediation logs, and tamper-evident audit chain that the Services generate are stored by the control plane on the sub-processors listed in Section 4, in the control-plane region recorded in your Order Form.
        </p>
        <p>
          The control plane itself stores account metadata, operational state, and the tamper-evident audit chain on the sub-processors listed in Section 4. The control-plane processing region is selected during onboarding and recorded in your Order Form. Regional residency options aligned to the DPDP Act (India), NESA / NCA frameworks (UAE / Saudi Arabia), and GDPR / UK-GDPR (EU / UK) are available for enterprise and sovereign deployments and are confirmed contractually before provisioning.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">3. Security of Processing</h2>
        <p>
          We implement technical and organizational measures to ensure a level of security appropriate to the risk, including encryption of data at rest (AES-256) and in transit (TLS 1.3), role-based access control, and strict least-privilege principles for all Tricognita engineers.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">4. Sub-processors</h2>
        <p>
          You provide general authorization for us to engage sub-processors to deliver the Service. Our current control-plane sub-processors are <strong>Vercel</strong> (application / BFF hosting), <strong>Fly.io</strong> (API compute), <strong>Neon</strong> (managed Postgres), and <strong>Upstash</strong> (managed Redis). Your own cloud provider account (e.g. AWS) — where your raw cloud resources and configuration data remain — is under your control, not ours. We will notify you of any intended changes concerning the addition or replacement of sub-processors.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">5. Audit Rights</h2>
        <p>
          Upon written request, the Data Processor will make available all information necessary to demonstrate compliance with this DPA and allow for and contribute to audits conducted by the Data Controller or an independent auditor mandated by the Data Controller.
        </p>
      </div>
    </section>
  );
}
