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

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">2. Sovereign Data Residency</h2>
        <p>
          To comply with national data sovereignty laws, data processing and storage shall strictly occur within the geographical region selected during tenant onboarding:
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong>India Deployments:</strong> Hosted entirely within AWS `ap-south-1` (Mumbai) in compliance with the DPDP Act.</li>
          <li><strong>UAE / Saudi Arabia:</strong> Hosted entirely within AWS `me-south-1` (Bahrain) or `me-central-1` (UAE) to align with NESA and NCA frameworks.</li>
          <li><strong>EU / UK:</strong> Hosted entirely within `eu-central-1` or `eu-west-2` complying with GDPR / UK-GDPR.</li>
        </ul>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">3. Security of Processing</h2>
        <p>
          We implement technical and organizational measures to ensure a level of security appropriate to the risk, including encryption of data at rest (AES-256) and in transit (TLS 1.3), role-based access control, and strict least-privilege principles for all Tricognita engineers.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">4. Sub-processors</h2>
        <p>
          You provide general authorization for us to engage sub-processors to deliver the Service. Our current primary sub-processor is **Amazon Web Services (AWS)** for infrastructure hosting. We will notify you of any intended changes concerning the addition or replacement of sub-processors.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">5. Audit Rights</h2>
        <p>
          Upon written request, the Data Processor will make available all information necessary to demonstrate compliance with this DPA and allow for and contribute to audits conducted by the Data Controller or an independent auditor mandated by the Data Controller.
        </p>
      </div>
    </section>
  );
}
