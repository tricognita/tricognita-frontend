import Link from "next/link";
import { Card, Stat } from "@/lib/ui";
import { CONTROL_STATUS, countControls, type Control, type ControlStatus } from "@/lib/domain";

/**
 * AssuranceCounts — the factual answer to "what is the current state?".
 *
 * Counts only. No score, no percentage, no gauge: 22 of 27 controls passing is
 * a fact a customer can check, while "81% secure" is a claim nobody can.
 */

const CELLS: { key: keyof ReturnType<typeof countControls>; status?: ControlStatus; label: string }[] = [
  { key: "total", label: "Controls" },
  { key: "passing", status: "PASS", label: "Passing" },
  { key: "failing", status: "FAIL", label: "Failing" },
  { key: "drifted", status: "DRIFTED", label: "Drifted" },
  { key: "exception", status: "EXCEPTION", label: "Exception" },
  { key: "notAssessed", status: "NOT_ASSESSED", label: "Not assessed" },
];

const INTENT: Partial<Record<ControlStatus, "success" | "danger" | "warning" | "neutral">> = {
  PASS: "success",
  FAIL: "danger",
  DRIFTED: "warning",
  EXCEPTION: "neutral",
  NOT_ASSESSED: "neutral",
};

export function AssuranceCounts({ controls }: { controls: Control[] }) {
  const counts = countControls(controls);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {CELLS.map(({ key, status, label }) => {
        const value = counts[key];
        const presentation = status ? CONTROL_STATUS[status] : undefined;
        const href = status ? `/dashboard/controls?status=${status.toLowerCase()}` : "/dashboard/controls";
        return (
          <Link
            key={key}
            href={href}
            className="rounded-[var(--radius)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            <Card density="compact" interactive className="h-full">
              <Stat
                size="sm"
                label={
                  <span className="flex items-center gap-1.5">
                    {presentation && (
                      <span aria-hidden="true" className="text-[var(--fg-subtle)]">
                        {SHAPE[presentation.shape]}
                      </span>
                    )}
                    {label}
                  </span>
                }
                value={value}
                intent={status ? INTENT[status] : "neutral"}
                mono
              />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

const SHAPE: Record<string, string> = {
  dot: "●",
  square: "■",
  half: "◧",
  ring: "◎",
  hollow: "○",
  diamond: "◈",
  dash: "–",
};
