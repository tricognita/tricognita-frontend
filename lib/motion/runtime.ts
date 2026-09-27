/**
 * TRICOGNITA MOTION ENGINE — runtime core
 * ---------------------------------------------------------------------------
 * Implements the Motion Contracts (lib/contracts/motion.ts) over the native Web
 * Animations API. Consumes Geometry (data-* hooks) ← Token API (timing) ←
 * Contracts. Produces engineering motion, nothing else.
 *
 * Design: every primitive is a PURE planner (`plan*` → deterministic keyframes +
 * the truthful `final` frame) plus a thin imperative applier that drives WAAPI.
 * Determinism, reduced-motion, SSR and rollback-retrace are all decided in the
 * pure plan and are therefore unit-testable without a DOM.
 *
 * The five laws (MotionLaw): motion = computation · idle = stillness · reduced =
 * final truthful state · replay deterministic · rollback exact · nothing
 * decorative moves.
 */

export interface MotionOptions {
  /** Force reduced-motion (defaults to the OS setting). */
  reducedMotion?: boolean;
}

/** A controllable running motion. `finished` always resolves (never rejects). */
export interface MotionHandle {
  readonly finished: Promise<void>;
  cancel(): void;
  finish(): void;
}

/** A single-element animation plan. Pure, deterministic, SSR-safe. */
export interface MotionPlan {
  readonly duration: number; // ms (from Token API)
  readonly easing: string; // CSS easing (from Token API)
  readonly keyframes: Keyframe[];
  /** The truthful locked end-state — applied for reduced-motion / SSR / on finish. */
  readonly final: Keyframe;
  readonly fill?: FillMode;
}

/** One item in a staggered sequence (verifyChain, replayProjection, boot arms). */
export interface StaggerStep {
  readonly index: number;
  readonly delay: number; // ms
  readonly kind?: string;
  readonly plan: MotionPlan;
}
export interface StaggerPlan {
  readonly steps: readonly StaggerStep[];
}

/** A timeline entry that targets a specific element at an offset. */
export interface TimelineEntry {
  readonly target: Element | null | undefined;
  readonly plan: MotionPlan;
  readonly delay: number; // ms
}

/* ── environment ─────────────────────────────────────────────────────────────── */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const RESERVED = new Set(["offset", "easing", "composite"]);

/** Apply a keyframe's declarative styles statically (the truthful end-state). */
export function applyFinal(target: Element | null | undefined, final: Keyframe): void {
  if (!target || !("style" in target)) return;
  const style = (target as unknown as { style: CSSStyleDeclaration }).style;
  for (const [k, v] of Object.entries(final)) {
    if (RESERVED.has(k) || v == null) continue;
    (style as unknown as Record<string, string>)[k] = String(v);
  }
}

function settled(): MotionHandle {
  return { finished: Promise.resolve(), cancel() {}, finish() {} };
}

/* ── run: apply one plan to one element ────────────────────────────────────────
   Motion = computation: this is only ever called when a real thing happens. Idle
   is stillness because nothing calls run() at rest.                              */
export function run(
  target: Element | null | undefined,
  plan: MotionPlan,
  opts: MotionOptions = {},
): MotionHandle {
  if (!target) return settled();
  const reduced = opts.reducedMotion ?? prefersReducedMotion();
  const el = target as Element & { animate?: (k: Keyframe[], o: KeyframeAnimationOptions) => Animation };

  // Reduced motion (or no WAAPI, e.g. SSR/JSDOM) → render the truthful final state.
  if (reduced || typeof el.animate !== "function") {
    applyFinal(target, plan.final);
    return settled();
  }

  const anim = el.animate(plan.keyframes, {
    duration: Math.max(0, plan.duration),
    easing: plan.easing,
    fill: plan.fill ?? "forwards",
  });
  const finished = anim.finished.then(() => undefined).catch(() => undefined);
  return {
    finished,
    cancel: () => {
      try {
        anim.cancel();
      } catch {
        /* animation already gone */
      }
    },
    finish: () => {
      try {
        anim.finish();
      } catch {
        applyFinal(target, plan.final);
      }
    },
  };
}

/** Schedule a run after `delay` ms (cancellable before it starts). */
function scheduleRun(
  target: Element | null | undefined,
  plan: MotionPlan,
  delay: number,
  opts: MotionOptions,
): MotionHandle {
  if (delay <= 0) return run(target, plan, opts);
  let inner: MotionHandle | null = null;
  let cancelled = false;
  const finished = new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (cancelled) return resolve();
      inner = run(target, plan, opts);
      inner.finished.then(resolve);
    }, delay);
    // keep a reference for cancel()
    cancelHooks.set(finished as unknown as object, () => {
      clearTimeout(timer);
      cancelled = true;
      inner?.cancel();
    });
  });
  return {
    finished,
    cancel: () => cancelHooks.get(finished as unknown as object)?.(),
    finish: () => inner?.finish(),
  };
}
const cancelHooks = new WeakMap<object, () => void>();

function combine(handles: MotionHandle[]): MotionHandle {
  return {
    finished: Promise.all(handles.map((h) => h.finished)).then(() => undefined),
    cancel: () => handles.forEach((h) => h.cancel()),
    finish: () => handles.forEach((h) => h.finish()),
  };
}

/** Apply a stagger plan across an ordered list of targets. */
export function runStagger(
  targets: readonly (Element | null | undefined)[],
  plan: StaggerPlan,
  opts: MotionOptions = {},
): MotionHandle {
  const reduced = opts.reducedMotion ?? prefersReducedMotion();
  if (reduced) {
    for (const s of plan.steps) applyFinal(targets[s.index], s.plan.final);
    return settled();
  }
  return combine(plan.steps.map((s) => scheduleRun(targets[s.index], s.plan, s.delay, opts)));
}

/** Play a heterogeneous timeline (boot sequence, composites). */
export function runTimeline(entries: readonly TimelineEntry[], opts: MotionOptions = {}): MotionHandle {
  const reduced = opts.reducedMotion ?? prefersReducedMotion();
  if (reduced) {
    for (const e of entries) applyFinal(e.target, e.plan.final);
    return settled();
  }
  return combine(entries.map((e) => scheduleRun(e.target, e.plan, e.delay, opts)));
}

/** The end time (ms) of the last step in a stagger plan — for bounding/asserts. */
export function staggerEnd(plan: StaggerPlan): number {
  return plan.steps.reduce((max, s) => Math.max(max, s.delay + s.plan.duration), 0);
}
