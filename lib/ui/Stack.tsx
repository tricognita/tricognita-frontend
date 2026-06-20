"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * Stack — vertical or horizontal layout container with consistent gap rhythm.
 *
 * Replaces inline flex utilities like `<div className="flex flex-col gap-4">`
 * with a typed, gap-token-bound API.
 *
 * Examples:
 *   <VStack gap="md"> ... </VStack>          // gap-4 (16px)
 *   <HStack gap="sm" align="center"> ... </HStack>
 *   <Stack direction="row" gap="lg" wrap>...</Stack>
 *
 * Gap tokens map to Tailwind spacing: xs=1, sm=2, md=4, lg=6, xl=8, 2xl=12.
 */

export type StackGap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "column";
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  /** When true, divides children with a thin border (column direction only). */
  divide?: boolean;
}

const GAP_CLASSES: Record<StackGap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
  "2xl": "gap-12",
};

const ALIGN_CLASSES: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const JUSTIFY_CLASSES: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    direction = "column",
    gap = "md",
    align,
    justify,
    wrap = false,
    divide = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex",
        direction === "column" ? "flex-col" : "flex-row",
        GAP_CLASSES[gap],
        align && ALIGN_CLASSES[align],
        justify && JUSTIFY_CLASSES[justify],
        wrap && "flex-wrap",
        divide &&
          direction === "column" &&
          "[&>*+*]:pt-4 [&>*+*]:border-t [&>*+*]:border-[var(--sage-soft)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

// ─── Convenience exports ──────────────────────────────────────────────────────

export const VStack = React.forwardRef<
  HTMLDivElement,
  Omit<StackProps, "direction">
>(function VStack(props, ref) {
  return <Stack ref={ref} direction="column" {...props} />;
});

export const HStack = React.forwardRef<
  HTMLDivElement,
  Omit<StackProps, "direction">
>(function HStack(props, ref) {
  return <Stack ref={ref} direction="row" {...props} />;
});
