import { Card, EmptyState, VStack } from "@/lib/ui";
import type { RemediationStep } from "@/lib/domain";

/**
 * RemediationSteps — how to fix it, in order.
 *
 * The steps come from the finding itself. Where a console path, a CLI command
 * or an infrastructure-as-code change is recorded, it is shown verbatim so an
 * engineer can copy it rather than translate prose into a command.
 */
export function RemediationSteps({ steps }: { steps: RemediationStep[] }) {
  if (steps.length === 0) {
    return (
      <EmptyState
        variant="bordered"
        title="No remediation steps recorded"
        description="Your Tricognita engineer will add the steps for this finding."
      />
    );
  }

  return (
    <Card>
      <ol className="flex flex-col gap-4">
        {[...steps]
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <li key={step.order} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 shrink-0 font-mono text-[11px] text-[var(--fg-subtle)] tabular-nums"
              >
                {String(step.order).padStart(2, "0")}
              </span>
              <VStack gap="xs" className="min-w-0">
                <p className="text-[var(--text-sm)] text-[var(--fg)]">{step.instruction}</p>
                {step.console && (
                  <CodeLine label="Console">{step.console}</CodeLine>
                )}
                {step.cli && <CodeLine label="CLI">{step.cli}</CodeLine>}
                {step.iac && <CodeLine label="Infrastructure as code">{step.iac}</CodeLine>}
              </VStack>
            </li>
          ))}
      </ol>
    </Card>
  );
}

function CodeLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]">{label}</span>
      <pre className="mt-1 overflow-x-auto rounded-[var(--radius-tight)] border border-[var(--border-subtle)] bg-[var(--surface-overlay)] px-2.5 py-2 text-[11px] text-[var(--fg-muted)]">
        <code>{children}</code>
      </pre>
    </div>
  );
}
