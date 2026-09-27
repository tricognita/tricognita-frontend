import Link from "next/link";
import type { ReactNode } from "react";
import { SCOPING_CALL_HREF } from "@/lib/marketing/site";

/**
 * Marketing building blocks.
 *
 * Functional structure for the public site, built on the existing Brand
 * tokens (bg, surface, hair, fg, muted, accent, btn-2026) — no new design
 * system. The visual makeup is a later, designer-led phase; these blocks fix
 * the content hierarchy, semantics and responsive structure it will dress.
 *
 * Every product visual is a labelled placeholder until real screenshots from a
 * demo organisation exist (Content Master §21.4). Placeholders never show
 * invented data.
 */

export interface Cta {
  href: string;
  label: string;
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow mb-3">{children}</p>;
}

export function CtaButtons({ primary, secondary }: { primary?: Cta; secondary?: Cta }) {
  if (!primary && !secondary) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {primary && (
        <Link href={primary.href} className="btn-2026 btn-primary">
          {primary.label}
        </Link>
      )}
      {secondary && (
        <Link href={secondary.href} className="btn-2026 btn-ghost">
          {secondary.label}
        </Link>
      )}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  sub,
  primary,
  secondary,
  note,
  children,
}: {
  eyebrow?: string;
  title: string;
  sub: ReactNode;
  primary?: Cta;
  secondary?: Cta;
  /** Short trust line under the calls to action. */
  note?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-hair">
      <Container className="py-16 sm:py-24">
        <div className="max-w-3xl">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="text-3xl font-semibold tracking-tight text-fg [overflow-wrap:break-word] sm:text-5xl">{title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">{sub}</p>
          <div className="mt-8">
            <CtaButtons primary={primary} secondary={secondary} />
          </div>
          {note && <p className="mt-5 text-sm text-muted">{note}</p>}
        </div>
        {children && <div className="mt-12">{children}</div>}
      </Container>
    </section>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  tone = "plain",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children?: ReactNode;
  tone?: "plain" | "raised";
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 border-b border-hair ${tone === "raised" ? "bg-surface2" : ""}`}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 id={id ? `${id}-title` : undefined} className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {title}
          </h2>
          {intro && <div className="mt-4 space-y-4 text-base leading-relaxed text-muted">{intro}</div>}
        </div>
        {children && <div className="mt-10">{children}</div>}
      </Container>
    </section>
  );
}

export interface CardItem {
  title: string;
  body: ReactNode;
  href?: string;
  linkLabel?: string;
}

export function CardGrid({ items, columns = 3 }: { items: CardItem[]; columns?: 2 | 3 | 4 }) {
  const cols = columns === 2 ? "md:grid-cols-2" : columns === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3";
  return (
    <ul className={`grid grid-cols-1 gap-4 ${cols}`}>
      {items.map((it) => (
        <li key={it.title} className="flex flex-col rounded-2xl border border-hair bg-surface p-6">
          <h3 className="text-base font-semibold text-fg">{it.title}</h3>
          <div className="mt-2 flex-1 text-sm leading-relaxed text-muted">{it.body}</div>
          {it.href && (
            <Link href={it.href} className="mt-4 text-sm font-medium text-accent underline-offset-4 hover:underline">
              {it.linkLabel ?? "Learn more"} <span aria-hidden="true">→</span>
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export interface Step {
  title: string;
  body: ReactNode;
}

/** Numbered steps — a real ordered list, so the order is announced. */
export function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="rounded-2xl border border-hair bg-surface p-6">
          <p className="font-mono text-xs text-muted">Step {i + 1}</p>
          <h3 className="mt-2 text-base font-semibold text-fg">{s.title}</h3>
          <div className="mt-2 text-sm leading-relaxed text-muted">{s.body}</div>
        </li>
      ))}
    </ol>
  );
}

/** Two-column comparison. Stacks to cards on small screens; no sideways scroll. */
export function Compare({
  leftTitle,
  rightTitle,
  rows,
}: {
  leftTitle: string;
  rightTitle: string;
  rows: [ReactNode, ReactNode][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hair">
      <div className="hidden grid-cols-2 border-b border-hair bg-surface2 text-sm font-semibold text-fg md:grid">
        <p className="p-4">{leftTitle}</p>
        <p className="border-l border-hair p-4">{rightTitle}</p>
      </div>
      <ul>
        {rows.map(([l, r], i) => (
          <li key={i} className="grid grid-cols-1 border-b border-hair last:border-b-0 md:grid-cols-2">
            <div className="p-4 text-sm text-muted">
              <span className="mb-1 block text-xs font-semibold text-fg md:hidden">{leftTitle}</span>
              {l}
            </div>
            <div className="p-4 text-sm text-fg md:border-l md:border-hair">
              <span className="mb-1 block text-xs font-semibold text-fg md:hidden">{rightTitle}</span>
              {r}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BulletList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-hair bg-surface p-4 text-sm leading-relaxed text-muted">
          <span aria-hidden="true" className="mt-0.5 text-accent">
            ◆
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Principles and product boundaries — what Tricognita deliberately does not do. */
export function Boundaries({ title = "What Tricognita does not do", items }: { title?: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-hair p-6">
      <h3 className="text-base font-semibold text-fg">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span aria-hidden="true">–</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A slot for a product screenshot or diagram. Named after the visual it will
 * hold (Content Master §21.4) so a designer knows exactly what goes here.
 */
export function VisualPlaceholder({ label, description }: { label: string; description?: string }) {
  return (
    <figure
      role="img"
      aria-label={`${label}${description ? `: ${description}` : ""}`}
      className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-hair bg-surface2 p-8 text-center"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-muted">Product visual</p>
      <p className="mt-2 text-sm font-medium text-fg">{label}</p>
      {description && <p className="mt-1 max-w-md text-xs text-muted">{description}</p>}
    </figure>
  );
}

export type ChipStatus = "passing" | "failing" | "drifted" | "not-assessed" | "fixed" | "did-not-fix" | "not-verified";

const CHIP: Record<ChipStatus, { label: string; color: string; mark: string }> = {
  passing: { label: "Passing", color: "var(--status-success)", mark: "●" },
  fixed: { label: "Fixed", color: "var(--status-success)", mark: "●" },
  failing: { label: "Failing", color: "var(--status-danger)", mark: "■" },
  "did-not-fix": { label: "Did not fix it", color: "var(--status-danger)", mark: "■" },
  drifted: { label: "Drifted", color: "var(--status-warning)", mark: "◧" },
  "not-assessed": { label: "Not assessed", color: "var(--muted)", mark: "–" },
  "not-verified": { label: "Not verified", color: "var(--status-warning)", mark: "○" },
};

/** The product's own status words, with a shape so colour never carries meaning alone. */
export function StatusChip({ status }: { status: ChipStatus }) {
  const c = CHIP[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-hair px-2.5 py-0.5 text-xs font-medium"
      style={{ color: c.color }}
    >
      <span aria-hidden="true">{c.mark}</span>
      {c.label}
    </span>
  );
}

export function CtaBand({
  title = "Start with a scoping call.",
  body = "Tell us about your cloud and what you need to fix or prove. You receive a written scope before any work starts.",
  primary = { href: SCOPING_CALL_HREF, label: "Book a scoping call" },
  secondary = { href: "/faq", label: "Read the FAQ" },
}: {
  title?: string;
  body?: string;
  primary?: Cta;
  secondary?: Cta;
}) {
  return (
    <section aria-labelledby="cta-band-title">
      <Container className="py-16 sm:py-24">
        <div className="rounded-3xl border border-hair bg-surface p-8 sm:p-12">
          <h2 id="cta-band-title" className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-base text-muted">{body}</p>
          <div className="mt-8">
            <CtaButtons primary={primary} secondary={secondary} />
          </div>
        </div>
      </Container>
    </section>
  );
}

export function RelatedLinks({ links }: { links: Cta[] }) {
  return (
    <nav aria-label="Related pages" className="border-b border-hair">
      <Container className="flex flex-wrap gap-x-6 gap-y-2 py-8 text-sm">
        <span className="text-muted">Related:</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="text-accent underline-offset-4 hover:underline">
            {l.label}
          </Link>
        ))}
      </Container>
    </nav>
  );
}
