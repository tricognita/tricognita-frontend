"use client";

import type { CSSProperties } from "react";
import { Badge, Card, VStack, HStack, type BadgeIntent } from "@/lib/ui";

interface Props {
  score: number;
  label?: string;
  size?: number;
  trend?: number;
}

interface Band {
  /** CSS color value for the SVG stroke (matches Badge intent color). */
  stroke: string;
  /** Semantic intent for the Badge component. */
  intent: BadgeIntent;
  /** Display label inside the badge. */
  label: string;
}

// Color tokens come from app/globals.css :root vars. Strokes use raw values
// because SVG stroke does not accept CSS var() in all browsers across all
// React render paths; everywhere else we use tokens via the Badge primitive.
function band(score: number): Band {
  if (score >= 85) return { stroke: "rgb(155 191 119)", intent: "success", label: "Strong" };
  if (score >= 70) return { stroke: "rgb(56 189 248)", intent: "info", label: "Fair" };
  if (score >= 50) return { stroke: "rgb(245 158 11)", intent: "warning", label: "At Risk" };
  return { stroke: "rgb(244 63 94)", intent: "danger", label: "Critical" };
}

function trendIntent(t: number | undefined): BadgeIntent | null {
  if (t === undefined) return null;
  if (t > 0) return "success";
  if (t < 0) return "danger";
  return "neutral";
}

export function PostureScoreGauge({ score, label = "Posture Score", size = 160, trend }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const { stroke, intent, label: bandLabel } = band(clamped);

  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const gaugeStyle: CSSProperties = { width: size, height: size };

  const tIntent = trendIntent(trend);

  return (
    <Card
      variant="elevated"
      density="spacious"
      className="flex items-center"
      aria-label={`${label}: ${clamped} out of 100, ${bandLabel}`}
    >
      <VStack gap="md" align="center" className="w-full">
        {/* Gauge */}
        <div className="relative" style={gaugeStyle}>
          <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
            {/* Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="var(--sage-soft)"
              strokeWidth={10}
              fill="none"
            />
            {/* Score arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={stroke}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              fill="none"
              style={{ transition: "stroke-dashoffset 600ms ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-[var(--stone-50)] tabular-nums leading-none">
              {Math.round(clamped)}
            </span>
            <span className="eyebrow text-[var(--stone-500)] mt-1">out of 100</span>
          </div>
        </div>

        {/* Label + intent badge */}
        <HStack gap="sm" align="center">
          <span className="eyebrow text-[var(--stone-400)]">{label}</span>
          <Badge intent={intent} size="sm">
            {bandLabel}
          </Badge>
        </HStack>

        {/* Trend (only when supplied) */}
        {trend !== undefined && tIntent && (
          <Badge intent={tIntent} variant="subtle" size="xs" mono>
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)} pts · 7d
          </Badge>
        )}
      </VStack>
    </Card>
  );
}
