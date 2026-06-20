export const metadata = { title: "Privacy Policy — Tricognita.com" };

export default function PrivacyPage() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20 text-zinc-300">
      <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-2">Legal</p>
      <h1 className="text-4xl font-bold text-zinc-50 mb-6">Privacy Policy</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: {new Date().toISOString().split('T')[0]}</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          Tricognita.com ("we", "us", or "our") is committed to protecting your personal data and your cloud telemetry. This Privacy Policy explains how we collect, use, and share information in connection with our website and our Cloud Security Posture Management (CSPM) services, ensuring compliance with global regulations including GDPR, CCPA, and the Digital Personal Data Protection Act (DPDP), India.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">1. Data We Process</h2>
        <p>
          <strong>Website Visitors:</strong> We collect IP addresses, browser metadata, and essential cookies to ensure security and analyze traffic patterns. <br />
          <strong>Platform Tenants:</strong> We ingest only the cloud configuration telemetry you authorize (via AWS IAM read-only roles). We **never** access your customer databases, PII within your buckets, or application source code.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">2. Purpose of Processing & Localization</h2>
        <p>
          Telemetry data is processed strictly to provide security posture scoring, threat detection, and ARIA remediation. For customers in the UAE, Saudi Arabia, and India, your data is processed and stored locally within your designated sovereign region to comply with local data residency laws.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">3. Data Sharing & Sub-processors</h2>
        <p>
          We do not sell your personal or telemetry data. We share data only with trusted infrastructure sub-processors (e.g., AWS) necessary to operate the platform. For a full list of sub-processors, refer to our Data Processing Agreement (DPA).
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">4. Your Global Privacy Rights (GDPR / CCPA / DPDP)</h2>
        <p>
          Depending on your location, you have the right to request access, correction, deletion, or portability of your data. You may also have the right to opt out of certain processing. To exercise these rights, email us at <strong>privacy@tricognita.com</strong>. We commit to responding within the statutory 30-day window.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">5. Contact Information</h2>
        <p>
          If you have questions regarding this policy or our data practices, please contact our Data Protection Officer (DPO) at:<br/><br/>
          <strong>Legal Entity:</strong> [INSERT LEGAL COMPANY NAME]<br/>
          <strong>Address:</strong> [INSERT CORPORATE ADDRESS]<br/>
          <strong>Email:</strong> privacy@tricognita.com
        </p>
      </div>
    </section>
  );
}
