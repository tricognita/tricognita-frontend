# UI Primitives Library

Internal React + Tailwind v4 component library for the Tricognita dashboard. Designed to:

- **Replace** the dozen ad-hoc card/badge/stat implementations scattered through the dashboard
- **Embrace** the existing `.glass`, `.eyebrow`, `.serif-display` utilities and the matcha design tokens in `app/globals.css`
- **Standardize** spacing rhythm (gap tokens), color intent (success/warning/danger/info/violet/neutral), and surface elevation
- **Stay small** — no external runtime deps, no compound-component magic, no theme provider context

```ts
import { Card, CardHeader, Section, Stat, Badge, VStack, HStack } from "@/lib/ui";
```

## Primitives at a glance

| Primitive | Replaces | Use for |
|---|---|---|
| `PageShell` | Inline `<main className="max-w-[1600px] mx-auto p-4...">` | Every authenticated route's outer container |
| `Section` | Inline `<header>` + `<h2>` blocks | Top-level dashboard groupings with eyebrow + title + description |
| `Card` + `CardHeader/Body/Footer` | Inline `.glass` divs with custom padding | Every dashboard widget, every panel |
| `Stack` / `VStack` / `HStack` | Inline `flex flex-col gap-N` divs | All layout flex containers |
| `Button` | `.btn-matcha` / `.btn-ghost` CSS classes; ad-hoc `<button className="px-3 py-1.5...">` | Every action button |
| `KPI` | Card-wrapped stat blocks reinvented per page | Dashboard hero metrics (finding counts, posture, latency) |
| `Stat` | Inline `<div className="text-4xl">{n}</div>` patterns | Big numbers inside other layouts |
| `Badge` | Inline `<span className="px-2 py-0.5 rounded ...">P0</span>` | Severity chips, tier badges, role pills, status indicators |
| `StatusDot` | Inline `<span className="w-2 h-2 rounded-full bg-...">` patterns | Inline status, live indicators, connection state |
| `EmptyState` | Inline "No X yet" one-off blocks | Every list/table/drawer that can render zero items |

## Adoption pattern

These primitives are **additive only** — nothing existing breaks because nothing existing imports them yet. Adopt incrementally per the PR plan:

- **PR-2** rolls them out to `PostureScoreGauge`, `SystemHealthPanel`, `AlertFeed`, dashboard home grid
- **PR-3** adopts in `SecurityGraph` legend + new AI Confidence widget
- **PR-4** adopts in sidebar + topbar
- **PR-5** adopts in new ExecutiveSummary component

When migrating a component:

1. Wrap the outer container in `<Card>` (pick variant + density)
2. Replace the title/header markup with `<CardHeader title=... eyebrow=... actions=... />`
3. Replace inline `<span>` badges with `<Badge intent=... variant=... />`
4. Replace `flex flex-col gap-4` with `<VStack gap="md">`
5. Replace big number spans with `<Stat label=... value=... intent=... />`
6. Verify visual diff vs the old component before committing the migration

## Variant reference

### Card

```tsx
<Card variant="default" density="comfortable">...</Card>     // most widgets
<Card variant="elevated" density="comfortable">...</Card>    // hero / executive
<Card variant="ghost" density="compact">...</Card>           // grouping w/o weight
<Card variant="danger" density="comfortable">...</Card>      // SEV-0 surfaces
<Card variant="success" density="compact">...</Card>         // verified states
<Card variant="warning" density="compact">...</Card>         // pending/operator
<Card interactive>...</Card>                                  // hover lift
<Card loading>...</Card>                                      // skeleton pulse
```

### Badge

```tsx
<Badge intent="success">VERIFIED</Badge>
<Badge intent="warning" variant="solid" size="md">OPERATOR</Badge>
<Badge intent="danger" variant="dot">P0</Badge>
<Badge intent="violet" variant="outline" mono>JIT</Badge>
```

Intent → semantic meaning:

| Intent | Reserved for |
|---|---|
| `neutral` | Tags, generic labels |
| `success` | Verified, operational, approved, AUTO-tier |
| `warning` | Pending, OPERATOR-tier, degraded |
| `danger` | Critical, denied, failed, DUAL_CONTROL+ tier |
| `info` | Informational, AUTO-tier (alternative) |
| `violet` | Brand accent — use sparingly (1 per surface max) |

### Stat

```tsx
<Stat label="Active findings" value={42} />
<Stat label="Critical" value={3} intent="danger" size="lg" />
<Stat
  label="Mean time to remediation"
  value="4h 12m"
  hint="Last 30 days"
  source="ARIA telemetry"
  size="md"
/>
```

### Stack

```tsx
<VStack gap="md">{children}</VStack>
<HStack gap="sm" align="center" justify="between">{children}</HStack>
<VStack gap="md" divide>{children}</VStack>   // with dividing borders
```

Gap tokens: `none, xs(4), sm(8), md(16), lg(24), xl(32), 2xl(48)`.

### Section

```tsx
<Section
  eyebrow="Posture"
  title="Cloud Security Score"
  description="Composite score across IAM, network, storage, and compute domains."
  actions={<Badge intent="success">Verified · 5min ago</Badge>}
>
  <PostureScoreGauge />
</Section>
```

## What's deliberately not here yet

- **Button** — existing `.btn-matcha` / `.btn-ghost` classes work; will add a `Button` primitive in PR-4 alongside command palette work
- **Input / Form** — out of scope for current refactor (forms work fine)
- **Modal / Dialog** — out of scope; will add when a real need surfaces
- **Tooltip** — adding in PR-3 alongside SecurityGraph hover interactions
- **Toast / Notification** — `NotificationCenter` exists; primitive can come later

## File map

```
lib/ui/
├── README.md          this file
├── index.ts           barrel export (single import path)
├── cn.ts              class name composer (~5 lines, no deps)
├── PageShell.tsx      top-level page wrapper (width + density + header)
├── Section.tsx        in-page section with eyebrow / title / description
├── Card.tsx           Card + CardHeader + CardBody + CardFooter
├── Stack.tsx          Stack + VStack + HStack
├── Button.tsx         typed button (variant × size × loading × icons)
├── KPI.tsx            Card-wrapped metric (label + value + trend + source)
├── Stat.tsx           bare big-number metric (no Card)
├── Badge.tsx          severity / status / tier chip
├── StatusDot.tsx      colored status dot (with optional pulse + label)
└── EmptyState.tsx     standardized empty/no-data placeholder
```

Total: ~12 files. No runtime dependencies beyond React.

## Design token contract

Primitives **only** read from CSS variables defined in `app/globals.css`:

```
--ink, --moss, --moss-rise, --moss-hi, --sage, --sage-soft
--matcha-{50..900}
--stone-{50..700}
--ember, --ember-glow, --amber-clay, --mist
--radius-sm, --radius, --radius-lg
--shadow-soft, --shadow-glow
```

If you need a new token: add it to `:root` and `@theme inline` in `globals.css`, document it here, then use it in primitives. Don't hardcode color values in primitives.
