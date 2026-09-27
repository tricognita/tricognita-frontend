/**
 * TRICOGNITA MOTION ENGINE — public surface.
 *
 * Implements the Motion Contracts over the Web Animations API. Consumes Geometry
 * (data-* hooks) ← Token API (timing) ← Contracts. Produces engineering motion.
 * Each primitive: a pure `plan*` (deterministic, SSR-safe, tested) + an imperative
 * applier. See docs/02_Company/Design/MOTION_ENGINE.md.
 */
export * from "./runtime";
export * from "./flowSignal";
export * from "./drawEvidence";
export * from "./snapState";
export * from "./sealBlock";
export * from "./verifyChain";
export * from "./replayProjection";
export * from "./retraceRollback";
export * from "./archiveBeat";
export * from "./bootSequence";
export * from "./sequence";
