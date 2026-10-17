/**
 * TRICOGNITA PRODUCT COMPONENTS — the composition layer.
 *
 * Reusable product components built ONLY from the frozen foundation:
 * Geometry Engine ← Motion Engine ← Contracts ← Token API. No new geometry, no new
 * motion, no new timing. See docs/02_Company/Design/PRODUCT_COMPONENTS.md.
 */
export * from "./viewmodel";

export { TrustBoundary } from "./TrustBoundary";
export type { TrustBoundaryProps } from "./TrustBoundary";
export { PolicyGate } from "./PolicyGate";
export type { PolicyGateProps } from "./PolicyGate";
export { ExecutionRail } from "./ExecutionRail";
export type { ExecutionRailProps } from "./ExecutionRail";
export { LifecycleSpine } from "./LifecycleSpine";
export type { LifecycleSpineProps } from "./LifecycleSpine";
export { EvidenceChain } from "./EvidenceChain";
export type { EvidenceChainProps } from "./EvidenceChain";
export { DomainTopology } from "./DomainTopology";
export type { DomainTopologyProps, DomainSpec } from "./DomainTopology";
export { CloudControlPlane } from "./CloudControlPlane";
export type { CloudControlPlaneProps } from "./CloudControlPlane";
export { EvidenceTimeline } from "./EvidenceTimeline";
export type { EvidenceRecord } from "./EvidenceTimeline";
export { VerificationPanel } from "./VerificationPanel";
export type { VerificationPanelProps } from "./VerificationPanel";
export { ReplayTimeline } from "./ReplayTimeline";
export type { ReplayTimelineProps } from "./ReplayTimeline";
export { AutonomousRemediationView } from "./AutonomousRemediationView";
