/**
 * TRICOGNITA GEOMETRY ENGINE — public surface.
 *
 * A geometric rendering engine, not a component library. Every primitive is a
 * pure, stateless, theme-independent, color-independent, animation-independent
 * `<g>` of `currentColor` shapes — composable inside a `<Frame>`, tree-shakeable,
 * SSR/RSC-safe. Color/state/motion/interaction are applied by LATER layers.
 *
 * See docs/02_Company/Design/GEOMETRY_LIBRARY.md for the catalog.
 */

// Surface + math core
export { Frame } from "./Frame";
export type { FrameProps } from "./Frame";
export * from "./math";
export * from "./invariants";

// Boundaries + control plane
export { TriangleBoundary } from "./TriangleBoundary";
export type { TriangleBoundaryProps } from "./TriangleBoundary";
export { TrustBoundary } from "./TrustBoundary";
export type { TrustBoundaryProps } from "./TrustBoundary";
export { RadialEight } from "./RadialEight";
export type { RadialEightProps } from "./RadialEight";

// Rails, gates, spine, grid
export { ExecutionRail } from "./ExecutionRail";
export type { ExecutionRailProps } from "./ExecutionRail";
export { PolicyGate } from "./PolicyGate";
export type { PolicyGateProps } from "./PolicyGate";
export { LifecycleSpine } from "./LifecycleSpine";
export type { LifecycleSpineProps } from "./LifecycleSpine";
export { ProjectionGrid } from "./ProjectionGrid";
export type { ProjectionGridProps } from "./ProjectionGrid";

// Nodes, edges, ports
export { DomainNode } from "./DomainNode";
export type { DomainNodeProps } from "./DomainNode";
export { EvidenceNode } from "./EvidenceNode";
export type { EvidenceNodeProps } from "./EvidenceNode";
export { EvidenceEdge } from "./EvidenceEdge";
export type { EvidenceEdgeProps } from "./EvidenceEdge";
export { ConnectionPort } from "./ConnectionPort";
export type { ConnectionPortProps } from "./ConnectionPort";

// Typed Evidence-Graph nodes (type carried by silhouette, never color)
export { SignalNode } from "./SignalNode";
export type { SignalNodeProps } from "./SignalNode";
export { ObservationNode } from "./ObservationNode";
export type { ObservationNodeProps } from "./ObservationNode";
export { ControlNode } from "./ControlNode";
export type { ControlNodeProps } from "./ControlNode";
export { AssertionNode } from "./AssertionNode";
export type { AssertionNodeProps } from "./AssertionNode";
