"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";
import { HStack } from "./Stack";
import { cn } from "./cn";

/**
 * ConfirmDangerous — modal dialog for irreversible / destructive actions.
 *
 * Forces the user to TYPE a confirmation phrase (default "DELETE") before
 * the destructive button enables. Stops accidental clicks dead — a single
 * misclick on a "Revoke" link never destroys a credential.
 *
 * Used for:
 *   - API key revocation
 *   - Cloud account removal
 *   - User deletion (admin)
 *   - Healing mode → AUTONOMOUS (this is a security-posture change worth
 *     a typed confirmation)
 *
 * Props:
 *   open            — boolean; render the modal when true
 *   onClose         — called when the user clicks Cancel or presses Esc
 *   onConfirm       — called when the user clicks the destructive button
 *   title           — e.g. "Revoke API key?"
 *   description     — short paragraph explaining what will happen
 *   confirmPhrase   — defaults to "DELETE"; the user must type this exactly
 *   confirmLabel    — defaults to "Permanently delete"
 *   detail          — optional <pre>-style block (e.g. ARN being affected)
 *   loading         — disables both buttons while the destructive op is in flight
 *
 * Accessibility:
 *   - role="alertdialog" + aria-modal + aria-labelledby + aria-describedby
 *   - Esc closes
 *   - Focus moved to the typing input on open
 *   - Confirm button disabled until phrase matches
 */

interface ConfirmDangerousProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmPhrase?: string;
  confirmLabel?: string;
  detail?: React.ReactNode;
  loading?: boolean;
}

export function ConfirmDangerous({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase = "DELETE",
  confirmLabel = "Permanently delete",
  detail,
  loading = false,
}: ConfirmDangerousProps) {
  const [typed, setTyped] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  // Reset typed phrase whenever the dialog opens/closes.
  React.useEffect(() => {
    if (open) {
      setTyped("");
      // Focus the input on the next frame so the modal is fully mounted.
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  // Esc closes.
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canConfirm = typed === confirmPhrase && !loading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <Card
        variant="elevated"
        density="spacious"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md border-[var(--ember)]/60 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <HStack gap="sm" align="center" className="mb-4">
          <span className="w-8 h-8 rounded-full bg-[var(--ember)]/20 flex items-center justify-center text-[var(--ember-glow)] shrink-0">
            <AlertTriangle size={16} />
          </span>
          <h3
            id={titleId}
            className="text-sm font-semibold text-[var(--ember-glow)] uppercase tracking-wide"
          >
            {title}
          </h3>
        </HStack>

        <div id={descId} className="text-[var(--stone-300)] text-sm mb-4 leading-relaxed">
          {description}
        </div>

        {detail && (
          <pre
            className={cn(
              "rounded bg-[var(--ink-deep)] border border-[var(--sage-soft)]",
              "px-3 py-2 text-[11px] font-mono text-[var(--stone-300)] mb-4",
              "overflow-x-auto whitespace-pre-wrap break-all",
            )}
          >
            {detail}
          </pre>
        )}

        <label
          htmlFor={`${titleId}-input`}
          className="block text-xs text-[var(--stone-400)] mb-2"
        >
          Type{" "}
          <span className="font-mono text-[var(--ember-glow)]">
            {confirmPhrase}
          </span>{" "}
          to confirm.
        </label>
        <input
          id={`${titleId}-input`}
          ref={inputRef}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={`Type ${confirmPhrase} to confirm`}
          autoComplete="off"
          spellCheck={false}
          className="w-full px-3 py-2 rounded bg-[var(--ink-deep)] border border-[var(--sage-soft)] text-[var(--stone-100)] text-sm font-mono mb-4 focus:outline-none focus:border-[var(--ember)] focus:ring-1 focus:ring-[var(--ember)]/40 transition-colors"
        />

        <HStack gap="sm" justify="end">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            loading={loading}
            disabled={!canConfirm}
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </HStack>
      </Card>
    </div>
  );
}
