"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * CopyableId — masked identifier with reveal-on-demand.
 *
 * Customer screens show friendly labels and masked identifiers. The full value
 * (an ARN, an account id) is available only where an engineer needs it to make
 * a change, and only when the caller passes canReveal (a capability check).
 *
 * Never render the full value by default, and never in a shared report.
 */

interface CopyableIdProps extends React.HTMLAttributes<HTMLSpanElement> {
  masked: string;
  full?: string;
  canReveal?: boolean;
  label?: string;
}

export function CopyableId({
  masked,
  full,
  canReveal = false,
  label = "identifier",
  className,
  ...rest
}: CopyableIdProps) {
  const [revealed, setRevealed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const canShow = canReveal && Boolean(full);
  const shown = revealed && canShow ? (full as string) : masked;

  async function copy() {
    if (!canShow) return;
    try {
      await navigator.clipboard.writeText(full as string);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px]", className)} {...rest}>
      <span className="text-[var(--fg-muted)] break-all">{shown}</span>
      {canShow && (
        <>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="text-[var(--fg-subtle)] hover:text-[var(--fg)] underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            {revealed ? "Hide" : "Reveal"}
            <span className="sr-only"> full {label}</span>
          </button>
          <button
            type="button"
            onClick={copy}
            className="text-[var(--fg-subtle)] hover:text-[var(--fg)] underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </>
      )}
    </span>
  );
}
