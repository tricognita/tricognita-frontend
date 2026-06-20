"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Button — typed action button with consistent intent/size/variant semantics.
 *
 * Replaces the .btn-matcha / .btn-ghost CSS classes from app/globals.css plus
 * the ad-hoc <button className="px-3 py-1.5 rounded ..."> patterns scattered
 * through dashboard pages. The CSS classes still exist for backward compat
 * during migration; new code should use this primitive.
 *
 * Variants:
 *   primary    — solid matcha (brand accent); for primary CTAs
 *   secondary  — solid neutral; for confirm/save actions without primary weight
 *   ghost      — transparent w/ border; for cancel / secondary actions
 *   danger     — solid ember; for destructive actions (revoke, delete, kill)
 *   subtle     — subtle bg, no border; for inline / tertiary actions
 *
 * Sizes:
 *   xs  — 10px text, p-1   (table-row inline)
 *   sm  — 11px text, px-2.5 py-1   (default for compact UIs)
 *   md  — 12px text, px-3   py-1.5  (cards, forms)
 *   lg  — 14px text, px-4   py-2    (page CTAs, modals)
 *
 * Features:
 *   - loading=true   shows a spinner, disables the button, preserves width
 *   - icon prop      renders before children with consistent gap
 *   - iconRight prop renders after children (e.g., chevron)
 *   - asChild        renders the styled className on a child element (no <button> wrap)
 *
 * Always:
 *   - includes focus-visible ring (a11y)
 *   - disabled state dims and removes pointer events
 *   - type defaults to "button" so it never accidentally submits a form
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "subtle";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Only applies as <button>; explicit override of the default "button" type. */
  type?: "button" | "submit" | "reset";
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--matcha-600)] text-white hover:bg-[var(--matcha-700)] " +
    "border border-[var(--matcha-700)] shadow-[var(--shadow-glow)] " +
    "active:translate-y-px",
  secondary:
    "bg-[var(--moss-hi)] text-[var(--stone-50)] hover:bg-[var(--sage)] " +
    "border border-[var(--sage-soft)]",
  ghost:
    "bg-transparent text-[var(--stone-300)] hover:text-[var(--stone-50)] " +
    "hover:bg-[var(--moss-rise)] border border-[var(--sage-soft)]",
  danger:
    "bg-[var(--ember)] text-white hover:opacity-90 " +
    "border border-[var(--ember)] active:translate-y-px",
  subtle:
    "bg-[var(--matcha-300)]/10 text-[var(--matcha-200)] " +
    "hover:bg-[var(--matcha-300)]/15 border border-transparent " +
    "ring-1 ring-inset ring-[var(--matcha-300)]/20",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "text-[10px] px-2 py-1 gap-1 rounded",
  sm: "text-[11px] px-2.5 py-1 gap-1.5 rounded",
  md: "text-xs px-3 py-1.5 gap-1.5 rounded-md",
  lg: "text-sm px-4 py-2 gap-2 rounded-md",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center font-medium font-mono tracking-wider uppercase " +
  "transition-all duration-150 select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/50 " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "whitespace-nowrap";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "sm",
    loading = false,
    disabled,
    icon,
    iconRight,
    type = "button",
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden
          className="inline-block size-3 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : (
        icon
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
});
