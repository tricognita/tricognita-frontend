"use client";

import * as React from "react";
import { cn } from "./cn";
import type { BadgeIntent } from "./Badge";

/**
 * Timeline — vertical activity stream primitive.
 *
 * Use this for audit event streams, incident feeds, ARIA action history,
 * scan-progress logs, and any other chronological list of events. Each entry
 * is a TimelineItem with an intent-tinted dot, a timestamp, a title, and
 * optional rich content.
 *
 * The component is intentionally NOT virtualized — keep render counts modest
 * (≤200 items at a time) and paginate or window externally if you need more.
 *
 * Density tokens:
 *   compact      — 8px between items, smallest dot       (audit log)
 *   comfortable  — 14px between items                    (default — incident feed)
 *   spacious     — 24px between items, biggest dot       (executive timeline)
 *
 * Example:
 *   <Timeline>
 *     <TimelineItem
 *       intent="danger"
 *       time="14:32:08"
 *       title="ARIA flagged s3://prod-customer-data as world-readable"
 *     >
 *       <p className="text-xs text-[var(--stone-400)]">
 *         Severity: CRITICAL · Risk score: 0.94
 *       </p>
 *     </TimelineItem>
 *     <TimelineItem
 *       intent="success"
 *       time="14:32:10"
 *       title="Bucket policy hardened — public access blocked"
 *     />
 *   </Timeline>
 */

export type TimelineDensity = "compact" | "comfortable" | "spacious";

interface TimelineProps extends React.HTMLAttributes<HTMLOListElement> {
  density?: TimelineDensity;
  /** Hide the connecting rail (useful for single-item or summary use). */
  hideRail?: boolean;
}

const TimelineDensityContext = React.createContext<TimelineDensity>("comfortable");
const TimelineHideRailContext = React.createContext<boolean>(false);

const GAP_CLASSES: Record<TimelineDensity, string> = {
  compact: "space-y-2",
  comfortable: "space-y-3.5",
  spacious: "space-y-6",
};

export function Timeline({
  density = "comfortable",
  hideRail = false,
  className,
  children,
  ...rest
}: TimelineProps) {
  return (
    <TimelineDensityContext.Provider value={density}>
      <TimelineHideRailContext.Provider value={hideRail}>
        <ol
          className={cn("relative", GAP_CLASSES[density], className)}
          {...rest}
        >
          {children}
        </ol>
      </TimelineHideRailContext.Provider>
    </TimelineDensityContext.Provider>
  );
}

// ─── TimelineItem ────────────────────────────────────────────────────────────

interface TimelineItemProps extends Omit<React.LiHTMLAttributes<HTMLLIElement>, "title"> {
  intent?: BadgeIntent;
  /** Pre-formatted timestamp string (caller controls format/locale). */
  time?: React.ReactNode;
  title?: React.ReactNode;
  /** Optional icon override — defaults to a colored dot. */
  icon?: React.ReactNode;
  /** Optional right-aligned action slot (e.g., View detail button). */
  action?: React.ReactNode;
}

const DOT_COLOR: Record<BadgeIntent, string> = {
  neutral: "bg-[var(--stone-400)]",
  success: "bg-[var(--matcha-400)]",
  warning: "bg-[var(--amber-clay)]",
  danger: "bg-[var(--ember)]",
  info: "bg-[var(--mist)]",
  violet: "bg-[var(--matcha-500)]",
};

const DOT_RING: Record<BadgeIntent, string> = {
  neutral: "ring-[var(--stone-400)]/30",
  success: "ring-[var(--matcha-400)]/30",
  warning: "ring-[var(--amber-clay)]/30",
  danger: "ring-[var(--ember)]/30",
  info: "ring-[var(--mist)]/30",
  violet: "ring-[var(--matcha-500)]/30",
};

const DOT_SIZE: Record<TimelineDensity, string> = {
  compact: "size-1.5",
  comfortable: "size-2",
  spacious: "size-2.5",
};

const RAIL_OFFSET: Record<TimelineDensity, string> = {
  compact: "left-[3px] top-3 bottom-0",
  comfortable: "left-[3.5px] top-3.5 bottom-0",
  spacious: "left-[5px] top-4 bottom-0",
};

const ITEM_PADDING: Record<TimelineDensity, string> = {
  compact: "pl-5",
  comfortable: "pl-6",
  spacious: "pl-7",
};

export function TimelineItem({
  intent = "neutral",
  time,
  title,
  icon,
  action,
  className,
  children,
  ...rest
}: TimelineItemProps) {
  const density = React.useContext(TimelineDensityContext);
  const hideRail = React.useContext(TimelineHideRailContext);

  return (
    <li
      className={cn("relative", ITEM_PADDING[density], className)}
      {...rest}
    >
      {/* Connecting rail */}
      {!hideRail && (
        <span
          aria-hidden
          className={cn(
            "absolute w-px bg-[var(--sage-soft)]",
            RAIL_OFFSET[density],
          )}
        />
      )}

      {/* Dot or custom icon */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1.5 inline-flex items-center justify-center",
        )}
      >
        {icon ?? (
          <span
            className={cn(
              "rounded-full ring-2 ring-offset-0",
              DOT_SIZE[density],
              DOT_COLOR[intent],
              DOT_RING[intent],
            )}
          />
        )}
      </span>

      {/* Body */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          {(time || title) && (
            <div className="flex items-baseline gap-2 flex-wrap">
              {time && (
                <span className="text-[10px] font-mono text-[var(--stone-500)] tabular-nums shrink-0">
                  {time}
                </span>
              )}
              {title && (
                <span className="text-xs text-[var(--stone-100)] font-medium leading-snug">
                  {title}
                </span>
              )}
            </div>
          )}
          {children && (
            <div className="mt-1 text-xs text-[var(--stone-400)] leading-relaxed">
              {children}
            </div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </li>
  );
}
