"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Overlay — shared behaviour behind <Drawer> and <Modal>.
 *
 * Handles the parts that are easy to get wrong and must not be re-implemented
 * per surface: Escape to close, focus moved into the panel on open and restored
 * on close, background scroll lock, and a labelled dialog role.
 *
 * Not a full focus trap: the product has no nested overlays, and a trap that
 * fights the browser is worse than none. Revisit if that changes.
 */

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name; rendered as the panel heading by Drawer/Modal. */
  title: string;
  children: React.ReactNode;
  /** Panel classes — position and size come from the caller. */
  panelClassName?: string;
  /** Rendered under the children, pinned to the bottom of the panel. */
  footer?: React.ReactNode;
  labelledBy: string;
}

export function Overlay({
  open,
  onClose,
  title,
  children,
  panelClassName,
  footer,
  labelledBy,
}: OverlayProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-overlay)] flex" role="presentation">
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--surface-canvas)]/70 backdrop-blur-[2px] cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          "relative bg-[var(--surface-raised)] border border-[var(--border-default)]",
          "shadow-[var(--elevation-raised)] flex flex-col outline-none",
          "motion-safe:transition-transform motion-safe:duration-[var(--dur-reveal)] motion-safe:ease-[var(--ease-standard)]",
          panelClassName,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-4 border-b border-[var(--border-subtle)]">
          <h2 id={labelledBy} className="text-[var(--text-md)] font-semibold text-[var(--fg)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--fg-muted)] hover:text-[var(--fg)] text-lg leading-none px-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="border-t border-[var(--border-subtle)] p-4 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
