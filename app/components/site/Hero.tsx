import Link from "next/link";
import { EvidenceGraph } from "./EvidenceGraph";

/**
 * 2026 landing hero. Emotional-first: the visitor should feel "an AI defends
 * my cloud and proves it" before any feature is named. Editorial serif display
 * (Fraunces) + the living Evidence Graph carry the message.
 */
export function Hero() {
  return (
    <section className="grain relative isolate overflow-hidden">
      <div aria-hidden className="hero-aura" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.04fr_1fr] lg:gap-10 lg:pb-28 lg:pt-24">
        {/* Left — message */}
        <div className="max-w-xl">
          <span className="sr sr-1 inline-flex items-center gap-2 rounded-full border border-hair bg-surface/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            Default-deny cloud security
          </span>

          <h1 className="sr sr-2 serif-display mt-6 text-[clamp(2.6rem,6vw,4.6rem)] font-medium leading-[1.03] tracking-[-0.02em] text-fg">
            An AI that guards your cloud —{" "}
            <span className="text-brand">and shows its work.</span>
          </h1>

          <p className="sr sr-3 mt-6 max-w-lg text-[17px] leading-relaxed text-muted">
            Tricognita detects risk, proposes policy-bound remediations, and signs
            tamper-evident proof of every action. Default-deny and human approval come
            first: nothing changes in your cloud until you authorize it.
          </p>

          <div className="sr sr-4 mt-8 flex flex-wrap items-center gap-3">
            <Link href="/request-demo" className="btn-2026 btn-primary">
              Get a demo
            </Link>
            <Link href="/security" className="btn-2026 btn-ghost">
              See the architecture
              <span aria-hidden>→</span>
            </Link>
          </div>

          <ul className="sr sr-5 mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-subtle">
            {["SOC 2 in progress", "ISO 27001-aligned", "We don't warehouse your data"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-[var(--primary)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10.5l3.5 3.5L16 5.5" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — living evidence graph */}
        <div className="sr sr-3 relative">
          <EvidenceGraph />
        </div>
      </div>
    </section>
  );
}
