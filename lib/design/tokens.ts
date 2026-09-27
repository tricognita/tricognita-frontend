/**
 * TRICOGNITA DESIGN TOKENS — typed JS surface (Layer 2 mirror)
 * ---------------------------------------------------------------------------
 * CSS is the source of truth for tokens (app/styles/tokens/*.css). This module
 * exists ONLY for values that JavaScript-driven motion must read as real numbers
 * / bezier arrays (framer-motion, the Web Animations API) — durations, easings,
 * staggers — plus typed references to the color roles so JS never inlines a hex.
 *
 * INVARIANT: the numeric values here MUST equal the corresponding `--dur-*` /
 * `--stagger-*` / `--ease-*` in semantic.css. When you change one, change both.
 * Traceability: ENGINEERING_VISUAL_LANGUAGE.md (five laws) · DESIGN_LANGUAGE_SYSTEM.md §5.
 */

/** Motion durations in **milliseconds** (mirror of `--dur-*`). */
export const duration = {
  instant: 0,
  tick: 90, // deterministic quantized stage — LINEAR (EVL §1)
  snap: 120, // discrete state transition (EVL §0.3)
  seal: 180, // seal snaps shut (EVL §8)
  settle: 240, // settle-and-lock arrival (EVL §0.4)
  flow: 600, // signal traversing a rail (EVL §4)
  reveal: 700, // brand section reveal (DLS §5.3)
  bootBoundary: 120,
  bootCore: 80,
  bootEvidence: 80,
  bootTotal: 380, // activation ceiling (Visual OS §3)
} as const;

/** Stagger intervals in **milliseconds** (mirror of `--stagger-*`). */
export const stagger = {
  arm: 18, // the 8 arms reach domains
  node: 30, // evidence nodes settle
  gate: 60, // policy gates resolve down a rail
} as const;

/**
 * Easings as cubic-bezier control-point tuples (framer-motion / WAAPI form).
 * `linear` is intentional for computation — determinism is mechanical (EVL §0.2).
 */
export const easing = {
  linear: [0, 0, 1, 1],
  settle: [0.22, 1, 0.36, 1], // arrival — settle, no bounce
  snap: [0.3, 0, 0.1, 1],
  standard: [0.4, 0, 0.2, 1],
} as const;

/** CSS cubic-bezier() strings, for when a string easing is required. */
export const easingCss = {
  linear: "linear",
  settle: "cubic-bezier(0.22, 1, 0.36, 1)",
  snap: "cubic-bezier(0.3, 0, 0.1, 1)",
  standard: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/** The four states of the grammar — the only vocabulary for "color = state". */
export type StateRole = "nominal" | "engaged" | "advisory" | "halt";

/**
 * Typed references to color roles as `var(--role)` strings. JS/SVG reads these,
 * never a hex — so theme switching and the state grammar stay authoritative.
 */
export const color = {
  void: "var(--void)",
  substrate: "var(--substrate)",
  panel: "var(--panel)",
  panelRaised: "var(--panel-raised)",
  graticule: "var(--graticule)",
  graticuleStrong: "var(--graticule-strong)",
  fg: "var(--fg)",
  fgMuted: "var(--fg-muted)",
  fgSubtle: "var(--fg-subtle)",
  onState: "var(--on-state)",
  cognita: [
    "var(--cognita-0)",
    "var(--cognita-1)",
    "var(--cognita-2)",
    "var(--cognita-3)",
    "var(--cognita-4)",
  ],
} as const;

/** State role → its CSS variable references (base + strong). */
export const stateColor: Record<StateRole, { base: string; strong: string }> = {
  nominal: { base: "var(--state-nominal)", strong: "var(--state-nominal-strong)" },
  engaged: { base: "var(--state-engaged)", strong: "var(--state-engaged-strong)" },
  advisory: { base: "var(--state-advisory)", strong: "var(--state-advisory-strong)" },
  halt: { base: "var(--state-halt)", strong: "var(--state-halt-strong)" },
};

/** The two angle laws (degrees): PRODUCT routes at 45°, BRAND frames at 60°. */
export const angle = { radial: 45, boundary: 60 } as const;

/** Convert a token ms value to the seconds framer-motion expects. */
export const seconds = (ms: number): number => ms / 1000;

export type Duration = keyof typeof duration;
export type Easing = keyof typeof easing;
