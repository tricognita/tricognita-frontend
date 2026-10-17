"use client";

import * as React from "react";
import { Overlay } from "./Overlay";
import { cn } from "./cn";

/**
 * Modal — confirmations and short forms (exceptions, approvals).
 *
 * For irreversible or cloud-changing actions use <ConfirmDangerous> instead:
 * it requires deliberate confirmation rather than a single click.
 */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md";
}

export function Modal({ open, onClose, title, children, footer, size = "sm" }: ModalProps) {
  const id = React.useId();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      labelledBy={id}
      panelClassName={cn(
        "m-auto w-full max-h-[85vh] rounded-[var(--radius)]",
        size === "sm" ? "sm:max-w-[420px]" : "sm:max-w-[640px]",
      )}
    >
      {children}
    </Overlay>
  );
}
