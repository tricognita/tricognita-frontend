export const metadata = { title: "Terms of Service — Tricognita.com" };

export default function TermsPage() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20 text-zinc-300">
      <p className="text-[10px] uppercase tracking-widest text-violet-500 font-semibold mb-2">Legal</p>
      <h1 className="text-4xl font-bold text-zinc-50 mb-6">Terms of Service</h1>
      <p className="text-sm text-zinc-500 mb-8">Last updated: {new Date().toISOString().split('T')[0]}</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          Welcome to Tricognita.com ("we", "our", or "us"). By accessing or using our Cloud Security Posture Management (CSPM) and associated ARIA services (the "Service"), you ("Customer" or "you") agree to be bound by these Terms of Service (this "Agreement"). 
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">1. Enterprise Subscription & Scope</h2>
        <p>
          Subject to the payment of all applicable fees (including our Pioneer Tier regional pricing), we grant you a limited, non-exclusive, non-transferable right to access and use the Service for your internal cloud security operations. You agree not to resell or lease the Service to any third party.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">2. ARIA Remediation & Liability</h2>
        <p>
          Tricognita provides automated remediation features via the "ARIA" engine. While ARIA is designed to enforce security best practices, **you are solely responsible** for reviewing and approving autonomous changes (Human-in-the-Loop) unless you explicitly enable Autonomous mode. We are not liable for system downtime caused by automated configuration changes.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">3. Data Residency & Processing</h2>
        <p>
          Tricognita uses a control-plane architecture: your raw cloud resources and state data remain in your own cloud account and designated region, while the Tricognita control plane stores the posture findings, remediation logs, and tamper-evident audit chain it generates — along with account metadata — on the sub-processors named in our DPA. Regional control-plane residency options for sovereign deployments (including UAE / Saudi Arabia) are available for enterprise tiers and confirmed in your Order Form before provisioning. By using the Service, you execute our standard Data Processing Agreement (DPA).
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">4. Intellectual Property</h2>
        <p>
          All rights, title, and interest in and to the Service, including the ARIA engine, algorithms, and threat detection signatures, remain the exclusive property of Tricognita. You grant us a license to use the telemetry you provide solely for the purpose of delivering the Service to you.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">5. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRICOGNITA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES. OUR AGGREGATE LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>

        <h2 className="text-lg font-semibold text-zinc-100 pt-4">6. Contact & Governing Law</h2>
        <p>
          These Terms are governed by the laws of [INSERT JURISDICTION]. For legal inquiries, please contact: <br/><br/>
          <strong>Legal Entity:</strong> [INSERT LEGAL COMPANY NAME]<br/>
          <strong>Address:</strong> [INSERT CORPORATE ADDRESS]<br/>
          <strong>Email:</strong> legal@tricognita.com
        </p>
      </div>
    </section>
  );
}
