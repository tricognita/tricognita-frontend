import type { Metadata } from "next";
import Link from "next/link";
import {
  Code2,
  Cpu,
  Globe2,
  Lock,
  ShieldCheck,
  Workflow,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About — Tricognita",
  description:
    "Operating principles, leadership, and operational guarantees behind Tricognita's AI-native cloud security platform.",
};

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: "Compliance as a growth lever",
    body: "Security should help you close enterprise deals, not just prevent breaches. We treat SOC 2, ISO 27001, and PCI evidence as first-class artifacts of running infrastructure — produced continuously, not assembled annually.",
  },
  {
    icon: Workflow,
    title: "Automation over headcount",
    body: "Small teams shouldn't hire a dedicated SecOps engineer just to maintain cloud hygiene. ARIA automates the repetitive work — least-privilege drift, public-asset detection, evidence collection — that small teams keep skipping.",
  },
  {
    icon: Globe2,
    title: "Sovereign by architecture",
    body: "Telemetry stays in the customer's chosen cloud region. We operate in your account, on your terms — built specifically for India and UAE data-residency requirements but applicable everywhere.",
  },
];

const OPERATIONAL_GUARANTEES = [
  { label: "Default posture", value: "Read-only" },
  { label: "Healing default", value: "OPERATOR approval" },
  { label: "Tokens", value: "HMAC-SHA256 JIT · 15-min TTL" },
  { label: "Audit chain", value: "Hash-linked, tamper-evident" },
  { label: "Data residency", value: "Customer AWS account" },
  { label: "Telemetry retention", value: "Customer-controlled" },
];

const LEADERSHIP = [
  {
    icon: Cpu,
    name: "Nithish Kumar S",
    role: "Founder · Chief Architect",
    bio: "Principal architect of the ARIA control plane and Tricognita's AWS-native sovereign-cloud framework. Owns the security model, BFF↔Go contract, and the JIT token system.",
  },
  {
    icon: Code2,
    name: "ARIA Detection Library",
    role: "Engineered in",
    bio: "MITRE ATT&CK mapping, CIS benchmarks, NIST 800-53 controls, and CVE telemetry built into the engine — no external research subscription required.",
  },
  {
    icon: Lock,
    name: "Founding-cohort engineering",
    role: "Hands-on support",
    bio: "Customers work directly with the engineering team for onboarding, policy definition, and incident triage during the founding cohort.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <div
        className="relative min-h-[44vh] flex flex-col justify-center"
        style={{ background: "var(--ink)" }}
      >
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-4 uppercase">
            Operating Principles
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-[var(--stone-50)] tracking-tight leading-[1.1] serif-display">
            The security platform <br className="hidden sm:block" />
            we wished we had.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base text-[var(--stone-400)] leading-relaxed">
            Tricognita exists because legacy enterprise security tools slow
            down the teams they protect. Startups and mid-market SecOps teams
            need to pass SOC 2 and scale fast — without hiring a dedicated
            engineer on day one. ARIA closes that gap.
          </p>
        </section>
      </div>

      {/* Operating principles */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-5">
        {PRINCIPLES.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className="rounded-[var(--radius)] border border-[var(--sage-soft)] bg-[var(--moss-rise)] p-6 flex flex-col"
            >
              <Icon
                size={20}
                className="text-[var(--matcha-300)] mb-3"
                aria-hidden
              />
              <h3 className="text-base font-semibold text-[var(--stone-50)] mb-2 tracking-tight">
                {p.title}
              </h3>
              <p className="text-sm text-[var(--stone-400)] leading-relaxed flex-1">
                {p.body}
              </p>
            </div>
          );
        })}
      </section>

      {/* Operational guarantees */}
      <section
        className="border-y"
        style={{
          background: "var(--moss)",
          borderColor: "var(--sage-soft)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-14">
          <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-3 uppercase">
            Operational guarantees
          </p>
          <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-2 tracking-tight">
            What we commit to, baked into the architecture.
          </h2>
          <p className="text-sm text-[var(--stone-400)] mb-8 max-w-2xl leading-relaxed">
            These aren't promises in a marketing deck — they're enforced by
            the code that runs in your account. Every guarantee here is
            verifiable from CloudTrail or the Tricognita audit chain.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {OPERATIONAL_GUARANTEES.map((g) => (
              <div
                key={g.label}
                className="rounded-md border border-[var(--sage-soft)] bg-[var(--ink-deep)] px-4 py-3"
              >
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)]">
                  {g.label}
                </p>
                <p className="text-sm text-[var(--stone-100)] font-medium mt-1">
                  {g.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-[10px] font-mono tracking-widest text-[var(--matcha-300)] font-semibold mb-3 uppercase">
          Leadership
        </p>
        <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-8 tracking-tight">
          Who you'll work with.
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {LEADERSHIP.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.name}
                className="rounded-[var(--radius)] border border-[var(--sage-soft)] bg-[var(--moss-rise)] p-6"
              >
                <div
                  className="w-10 h-10 rounded-md flex items-center justify-center mb-4"
                  style={{
                    background: "color-mix(in oklch, var(--matcha-600) 18%, var(--moss))",
                  }}
                  aria-hidden
                >
                  <Icon size={18} className="text-[var(--matcha-200)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--stone-50)]">
                  {p.name}
                </p>
                <p className="text-xs text-[var(--matcha-300)] mb-2">{p.role}</p>
                <p className="text-xs text-[var(--stone-500)] leading-relaxed">
                  {p.bio}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section
        className="border-t"
        style={{
          background: "var(--moss)",
          borderColor: "var(--sage-soft)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-[var(--stone-50)] mb-3 tracking-tight">
            Want to go deeper?
          </h2>
          <p className="text-sm text-[var(--stone-400)] mb-6 max-w-xl mx-auto leading-relaxed">
            Talk to an architect about your specific threat model, sovereignty
            requirements, or onboarding path.
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 rounded-md text-sm font-semibold text-white transition-colors"
            style={{ background: "var(--matcha-600)" }}
          >
            Contact us
          </Link>
        </div>
      </section>
    </>
  );
}
