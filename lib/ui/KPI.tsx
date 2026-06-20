"use client";

import * as React from "react";
import { Card } from "./Card";
import { Badge, type BadgeIntent } from "./Badge";
import { cn } from "./cn";

/**
 * KPI — Card-wrapped metric panel. Used for dashboard hero metrics (finding
 * counts, posture score, ARIA latency, etc.).
 *
 * Composition: Card(elevated) + label + big number + optional trend badge +
 * optional source citation. Designed for grids — set the wrapping container's
 * grid columns and KPI will fill its cell.
 *
 * For a standalone big number without the Card wrapper, use <Stat> instead.
 *
 * Examples:
 *   <KPI label="Open findings" value={42} />
 *
 *   <KPI
 *     label="Critical"
 *     value={3}
 *     intent="danger"
 *     trend={{ value: "+2 since last scan", direction: "up" }}
 *     hint="Last scan: 4 min ago"
 *   />
 *
 *   <KPI
 *     label="Mean time to remediation"
 *     value="4h 12m"
 *     intent="success"
 *     trend={{ value: "-38min · 7d", direction: "down" }}
 *     source="ARIA telemetry"
 *   />
 */

export type KPIIntent = "neutral" | "success" | "warning" | "danger" | "info";

interface KPITrend {
  /** Display label, e.g. "+12%" or "+2 since last scan" */
  value: React.ReactNode;
  /** up = good when intent=success; bad when intent=danger; visual arrow only */
  direction: "up" | "down" | "flat";
}

interface KPIProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: KPITrend;
  /** Footer line — e.g. "Source: Gartner 2025" */
  source?: React.ReactNode;
  intent?: KPIIntent;
  /** Render the value in mono (good for IDs, durations like "4h 12m"). */
  mono?: boolean;
  /** Optional click handler — when set, the whole card becomes interactive. */
  onClick?: () => void;
  className?: string;
}

const INTENT_VALUE_COLOR: Record<KPIIntent, string> = {
  neutral: "text-[var(--stone-50)]",
  success: "text-[var(--matcha-300)]",
  warning: "text-[var(--amber-clay)]",
  danger: "text-[var(--ember)]",
  info: "text-[var(--mist)]",
};

const TREND_INTENT_BY_DIRECTION: Record<KPITrend["direction"], BadgeIntent> = {
  up: "success",
  down: "danger",
  flat: "neutral",
};

const TREND_ARROW: Record<KPITrend["direction"], string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

export function KPI({
  label,
  value,
  hint,
  trend,
  source,
  intent = "neutral",
  mono = false,
  onClick,
  className,
}: KPIProps) {
  const interactive = !!onClick;

  const handleKeyDown = interactive
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }
    : undefined;

  return (
    <Card
      variant="default"
      density="comfortable"
      interactive={interactive}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive && typeof label === "string" ? `${label} — open details` : undefined}
      className={cn(interactive && "cursor-pointer", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow text-[var(--stone-400)] truncate min-w-0">
          {label}
        </span>
        {trend && (
          <Badge
            intent={TREND_INTENT_BY_DIRECTION[trend.direction]}
            variant="subtle"
            size="xs"
            mono
          >
            <span aria-hidden className="mr-0.5">
              {TREND_ARROW[trend.direction]}
            </span>
            {trend.value}
          </Badge>
        )}
      </div>

      <div
        className={cn(
          "text-3xl lg:text-4xl font-bold tabular-nums leading-tight mt-2 tracking-tight",
          INTENT_VALUE_COLOR[intent],
          mono && "font-mono tracking-normal",
        )}
      >
        {value}
      </div>

      {hint && (
        <p className="text-[11px] text-[var(--stone-500)] mt-1 leading-snug">
          {hint}
        </p>
      )}
      {source && (
        <p className="text-[10px] text-[var(--stone-600)] mt-2 font-mono">
          {source}
        </p>
      )}
    </Card>
  );
}
