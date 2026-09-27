"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { AGENodeKind } from "@/lib/attack-graph-map";

// v12: NodeProps takes the full Node<Data> type, not just Data.
export type AttackNodeType = Node<{ label: string; kind: AGENodeKind }>;

/**
 * Node kinds are mapped to a tight semantic intent palette that uses the
 * design tokens — not raw neon hex codes. This is what makes the attack
 * graph read as enterprise tooling instead of a prototype:
 *
 *   IAM     → ember     (security-critical — these are the lateral-movement
 *                        pivots; should pop the most)
 *   DATA    → amber     (sensitive — warns the eye but doesn't scream)
 *   AGENT   → matcha    (compute / runtime — brand accent)
 *   NETWORK → mist      (network plane — informational blue)
 *   TOOL    → matcha-soft
 *   CODE    → stone     (neutral; not normally an attack pivot)
 *   DOC     → stone
 *   OTHER   → stone
 *
 * Each kind uses the canonical token via var() so theme changes propagate.
 */

const KIND_STYLE: Record<AGENodeKind, string> = {
  IAM:
    "bg-[var(--ember)]/10 ring-[var(--ember)]/40 text-[var(--ember-glow)]",
  DATA:
    "bg-[var(--amber-clay)]/10 ring-[var(--amber-clay)]/40 text-[var(--amber-clay)]",
  AGENT:
    "bg-[var(--matcha-500)]/15 ring-[var(--matcha-500)]/40 text-[var(--matcha-200)]",
  NETWORK:
    "bg-[var(--mist)]/10 ring-[var(--mist)]/40 text-[var(--mist)]",
  TOOL:
    "bg-[var(--matcha-300)]/10 ring-[var(--matcha-300)]/30 text-[var(--matcha-300)]",
  CODE:
    "bg-[var(--stone-500)]/10 ring-[var(--stone-500)]/30 text-[var(--stone-300)]",
  DOC:
    "bg-[var(--stone-500)]/10 ring-[var(--stone-500)]/30 text-[var(--stone-300)]",
  OTHER:
    "bg-[var(--stone-500)]/10 ring-[var(--stone-600)]/30 text-[var(--stone-400)]",
};

// ─── Kind icons (inline SVG, ≤30 lines each) ──────────────────────────────────

function IconCompute() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2">
      <rect x="1" y="3" width="14" height="4" rx="0.5" />
      <rect x="1" y="9" width="14" height="4" rx="0.5" />
      <line x1="4" y1="5" x2="4" y2="5.01" strokeWidth="1.8" />
      <line x1="4" y1="11" x2="4" y2="11.01" strokeWidth="1.8" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2">
      <ellipse cx="8" cy="5" rx="6" ry="2" />
      <path d="M2 5v6c0 1.1 2.686 2 6 2s6-.9 6-2V5" />
    </svg>
  );
}

function IconIdentity() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="6" cy="7" r="3" />
      <path d="M9 7h5M12 5.5l2 1.5-2 1.5" />
      <path d="M5 10v1a1 1 0 001 1h2" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M3 10c-1-1-1.5-2.5-1-4 .6-2 2.5-3 4.5-3 1 0 2 .3 2.8.8" />
      <path d="M5 12h7a3 3 0 000-6H10a4 4 0 00-7.5 2" />
    </svg>
  );
}

function IconTool() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M8 1l6 3v4c0 3.5-2.5 6-6 7C2.5 14 0 11.5 0 8V4l8-3z" />
      <path d="M5.5 8l2 2 3.5-3.5" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M5 4L1 8l4 4M11 4l4 4-4 4" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M3 2h7l3 3v9H3V2z" />
      <path d="M10 2v3h3" />
      <line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="11" x2="9" y2="11" />
    </svg>
  );
}

function IconOther() {
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
      <circle cx="8" cy="8" r="4" />
    </svg>
  );
}

const ICONS: Record<AGENodeKind, () => React.JSX.Element> = {
  AGENT: IconCompute,
  DATA: IconStore,
  IAM: IconIdentity,
  NETWORK: IconNetwork,
  TOOL: IconTool,
  CODE: IconCode,
  DOC: IconDoc,
  OTHER: IconOther,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttackNode({ data }: NodeProps<AttackNodeType>) {
  const { label, kind } = data;
  const Icon = ICONS[kind] ?? IconOther;
  const colourClass = KIND_STYLE[kind] ?? KIND_STYLE.OTHER;
  const truncated = label.length > 24 ? label.slice(0, 23) + "…" : label;

  return (
    <div
      title={label}
      aria-label={`${kind} · ${label}`}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md ring-1 text-[10px] font-mono leading-tight select-none shadow-sm backdrop-blur-sm ${colourClass}`}
    >
      <Handle type="target" position={Position.Left} className="!w-1.5 !h-1.5 !bg-[var(--stone-500)]" />
      <span className="shrink-0 opacity-90">
        <Icon />
      </span>
      <span className="max-w-[120px] truncate">{truncated}</span>
      <Handle type="source" position={Position.Right} className="!w-1.5 !h-1.5 !bg-[var(--stone-500)]" />
    </div>
  );
}
