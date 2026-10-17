/**
 * The Tricognita lifecycle: Assess → Find → Fix → Verify → Re-check →
 * Detect drift → Fix again → Prove.
 *
 * A semantic ordered list, so the sequence is the content (screen readers
 * announce it as eight steps). On wide screens it reads left to right; on
 * small screens it stacks. `current` highlights where a page sits in the flow.
 */

export type LifecycleKey =
  | "assess"
  | "find"
  | "fix"
  | "verify"
  | "recheck"
  | "drift"
  | "fix-again"
  | "prove";

export const LIFECYCLE: { key: LifecycleKey; label: string; caption: string }[] = [
  { key: "assess", label: "Assess", caption: "Connect an account. Every applicable control is checked." },
  { key: "find", label: "Find", caption: "Each control lists the exact resources that fail it." },
  { key: "fix", label: "Fix", caption: "An approved, narrow change — applied by Tricognita or by your team." },
  { key: "verify", label: "Verify", caption: "The control is checked again straight after the change." },
  { key: "recheck", label: "Re-check", caption: "Every connected account is checked again every day." },
  { key: "drift", label: "Detect drift", caption: "A control that passed and now fails is marked Drifted." },
  { key: "fix-again", label: "Fix again", caption: "The same approved flow, then the same check." },
  { key: "prove", label: "Prove", caption: "Every check and every change becomes a record you can show." },
];

export function Lifecycle({ current, compact = false }: { current?: LifecycleKey; compact?: boolean }) {
  return (
    <ol
      aria-label="The Tricognita lifecycle"
      className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${compact ? "lg:grid-cols-8" : "lg:grid-cols-4"}`}
    >
      {LIFECYCLE.map((s, i) => {
        const active = s.key === current;
        return (
          <li
            key={s.key}
            aria-current={active ? "step" : undefined}
            className={`rounded-2xl border p-4 ${active ? "border-accent bg-surface" : "border-hair"}`}
          >
            <p className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</p>
            <p className={`mt-1 text-sm font-semibold ${active ? "text-accent" : "text-fg"}`}>{s.label}</p>
            {!compact && <p className="mt-2 text-xs leading-relaxed text-muted">{s.caption}</p>}
          </li>
        );
      })}
    </ol>
  );
}
