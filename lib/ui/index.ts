/**
 * @tricognita/ui — internal UI primitives library.
 *
 * Pure React + Tailwind v4 components built on top of the existing matcha
 * design token system in app/globals.css. No external runtime dependencies
 * beyond React.
 *
 * Import from a single path:
 *   import { Card, Button, Badge, KPI, EmptyState, StatusDot, PageShell,
 *            VStack, HStack } from "@/lib/ui";
 *
 * See lib/ui/README.md for usage patterns and the adoption checklist.
 */

// Utilities
export { cn } from "./cn";

// Layout
export { Stack, VStack, HStack } from "./Stack";
export type { StackGap, StackAlign, StackJustify } from "./Stack";

export { Section } from "./Section";
export { PageShell } from "./PageShell";
export type { PageShellWidth, PageShellDensity } from "./PageShell";

// Containers
export { Card, CardHeader, CardBody, CardFooter } from "./Card";
export type { CardVariant, CardDensity } from "./Card";

// Actions
export { Button } from "./Button";
export type { ButtonVariant, ButtonSize } from "./Button";

// Data display
export { Stat } from "./Stat";
export type { StatSize, StatIntent } from "./Stat";

export { KPI } from "./KPI";
export type { KPIIntent } from "./KPI";

export { Badge } from "./Badge";
export type { BadgeIntent, BadgeVariant, BadgeSize } from "./Badge";

export { StatusDot } from "./StatusDot";
export type { StatusDotSize } from "./StatusDot";

// Empty / loading / error states
export { EmptyState } from "./EmptyState";
export type { EmptyStateVariant } from "./EmptyState";

export { Skeleton } from "./Skeleton";
export type { SkeletonVariant } from "./Skeleton";

export { ErrorState } from "./ErrorState";
export type { ErrorStateVariant, ErrorStateDensity } from "./ErrorState";

// Tables
export { Table, THead, TBody, TFoot, TR, TH, TD, TBodyEmpty } from "./Table";
export type { TableDensity } from "./Table";

// Timeline / activity stream
export { Timeline, TimelineItem } from "./Timeline";
export type { TimelineDensity } from "./Timeline";

// Filters
export { FilterBar, FilterChip } from "./FilterBar";
export type { FilterChipIntent } from "./FilterBar";

// Dangerous-action confirmation
export { ConfirmDangerous } from "./ConfirmDangerous";

// Platform-posture banner (degraded / outage)
export { DegradedBanner } from "./DegradedBanner";
