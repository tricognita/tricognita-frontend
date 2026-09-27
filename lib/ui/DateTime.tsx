"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * DateTime — the single timestamp renderer.
 *
 * One rule for the whole product: absolute time is authoritative, relative time
 * is the hint. Evidence is dated, so a timestamp is never ambiguous: the
 * absolute value is always available in the title attribute.
 *
 * Renders deterministically on server and client (no Date.now() during render)
 * to avoid hydration mismatches: the relative part is computed after mount.
 */

type DateTimeVariant = "absolute" | "relative" | "both";

interface DateTimeProps extends Omit<React.HTMLAttributes<HTMLTimeElement>, "children"> {
  value: string | null | undefined;
  variant?: DateTimeVariant;
  /** Shown when value is null/undefined. */
  fallback?: string;
  /** Include the time of day. */
  withTime?: boolean;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatAbsolute(iso: string, withTime = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export function formatRelative(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = now - t;
  const future = diff < 0;
  const abs = Math.abs(diff);
  let text: string;
  if (abs < MINUTE) text = "just now";
  else if (abs < HOUR) text = `${Math.floor(abs / MINUTE)}m`;
  else if (abs < DAY) text = `${Math.floor(abs / HOUR)}h`;
  else if (abs < 30 * DAY) text = `${Math.floor(abs / DAY)}d`;
  else text = formatAbsolute(iso, false);
  if (text === "just now") return text;
  return future ? `in ${text}` : `${text} ago`;
}

export function DateTime({
  value,
  variant = "absolute",
  fallback = "—",
  withTime = true,
  className,
  ...rest
}: DateTimeProps) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
  }, [value]);

  if (!value) {
    return (
      <span className={cn("text-[var(--fg-subtle)]", className)} aria-label={fallback}>
        {fallback}
      </span>
    );
  }

  const absolute = formatAbsolute(value, withTime);
  const relative = now === null ? null : formatRelative(value, now);

  let content: React.ReactNode = absolute;
  if (variant === "relative") content = relative ?? absolute;
  if (variant === "both") {
    content = (
      <>
        {absolute}
        {relative ? <span className="ml-1.5 text-[var(--fg-subtle)]">({relative})</span> : null}
      </>
    );
  }

  return (
    <time
      dateTime={value}
      title={absolute}
      className={cn("tabular-nums", className)}
      {...rest}
    >
      {content}
    </time>
  );
}
