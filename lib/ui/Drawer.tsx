"use client";

import * as React from "react";
import { Overlay } from "./Overlay";
import { cn } from "./cn";

/**
 * Drawer — side panel for resource and remediation detail.
 *
 * Responsive rule (FRONTEND_ARCHITECTURE.md §7): a 480px side panel from md up,
 * a full-screen sheet below. Deep-linkable content belongs in a route, not here.
 */

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg";
}

export function Drawer({ open, onClose, title, children, footer, width = "md" }: DrawerProps) {
  const id = React.useId();
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      labelledBy={id}
      panelClassName={cn(
        "ml-auto h-full w-full rounded-none border-y-0 border-r-0",
        width === "md" ? "md:w-[480px]" : "md:w-[640px]",
      )}
    >
      {children}
    </Overlay>
  );
}
