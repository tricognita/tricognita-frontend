"use client";

import React, { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import useSWR from "swr";
import {
  classifyNode,
  classifyEdge,
  type RawGraph,
  type RawGraphNode,
} from "@/lib/attack-graph-map";
import AttackNode, { type AttackNodeType } from "./AttackNode";
import { EmptyState, ErrorState, Skeleton, Button } from "@/lib/ui";
import { Network, RefreshCw } from "lucide-react";

// ─── Node types (stable reference — defined outside component) ────────────────

const nodeTypes = { agNode: AttackNode as React.ComponentType<NodeProps<AttackNodeType>> };

// ─── Fetcher — 404 → empty graph; 5xx → throw for SWR error state ────────────

async function fetcher(url: string): Promise<RawGraph> {
  const res = await fetch(url);
  if (res.status === 404) return { nodes: [], links: [] };
  if (!res.ok) {
    const err = new Error(`Attack graph API error: HTTP ${res.status}`);
    (err as Error & { status: number }).status = res.status;
    throw err;
  }
  return res.json();
}

// ─── Community-circle layout ──────────────────────────────────────────────────
// Each community sits on a large outer circle (r = 900 + i*140).
// Nodes within a community sit on a smaller inner circle (r = 220).
// Bumped both radii ~10% vs prior pass to reduce node overlap at typical zoom.

function computePositions(nodes: RawGraphNode[]): Map<string, { x: number; y: number }> {
  const byComm = new Map<number, RawGraphNode[]>();
  for (const n of nodes) {
    const c = n.community ?? 0;
    if (!byComm.has(c)) byComm.set(c, []);
    byComm.get(c)!.push(n);
  }

  const numComm = byComm.size || 1;
  const positions = new Map<string, { x: number; y: number }>();
  let ci = 0;

  for (const commNodes of byComm.values()) {
    const outerR = 900 + ci * 140;
    const outerAngle = (ci / numComm) * 2 * Math.PI;
    const cx = outerR * Math.cos(outerAngle);
    const cy = outerR * Math.sin(outerAngle);

    const innerR = commNodes.length === 1 ? 0 : 220;
    commNodes.forEach((node, ni) => {
      const innerAngle = (ni / commNodes.length) * 2 * Math.PI;
      positions.set(node.id, {
        x: cx + innerR * Math.cos(innerAngle),
        y: cy + innerR * Math.sin(innerAngle),
      });
    });
    ci++;
  }

  return positions;
}

// ─── Edge stroke colour by class (design-token values, not raw neon) ─────────
// Token literals are duplicated here because ReactFlow SVG strokes do not
// reliably resolve CSS var(). If app/globals.css token values change, mirror.

const EDGE_STROKE: Record<string, string> = {
  ASSUMES: "#F43F5E", // var(--ember)       — lateral-movement / privilege escalation
  NETWORK: "#F59E0B", // var(--amber-clay)  — network-reachable
  CONTAINS: "#A78BFA", // var(--matcha-400)  — structural containment
};

const EDGE_FALLBACK = "#64748B"; // var(--stone-500)

// MiniMap colors mirror the AttackNode KIND_STYLE intent palette so the
// minimap reads the same story at a glance.
const MINIMAP_COLORS: Record<string, string> = {
  IAM: "#F43F5E",       // ember
  DATA: "#F59E0B",      // amber-clay
  AGENT: "#8B5CF6",     // matcha-500
  NETWORK: "#38BDF8",   // mist
  TOOL: "#C4B5FD",      // matcha-300
  CODE: "#94A3B8",      // stone-400
  DOC: "#94A3B8",
  OTHER: "#64748B",     // stone-500
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttackGraph() {
  const { data, error, isLoading, mutate } = useSWR<RawGraph>(
    "/api/age/graph",
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!data || data.nodes.length === 0) return { rfNodes: [], rfEdges: [] };

    const positions = computePositions(data.nodes);

    const rfNodes: Node[] = data.nodes.map((n) => ({
      id: n.id,
      type: "agNode",
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      data: { label: n.label, kind: classifyNode(n) },
    }));

    const seen = new Set<string>();
    const rfEdges: Edge[] = [];

    for (const link of data.links) {
      const edgeId = `${link.source}→${link.target}:${link.relation}`;
      if (seen.has(edgeId)) continue;
      seen.add(edgeId);

      const edgeClass = classifyEdge(link.relation);
      const stroke = EDGE_STROKE[edgeClass] ?? EDGE_FALLBACK;
      const width = Math.min(2.5, Math.max(1, link.weight ?? 1));
      // Only animate the most critical edge class (privilege escalation /
      // assume-role). Animating everything reduces signal — the eye learns
      // to ignore motion when it's everywhere.
      const animated = edgeClass === "ASSUMES";

      rfEdges.push({
        id: edgeId,
        source: link.source,
        target: link.target,
        label: link.relation,
        animated,
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        style: { stroke, strokeWidth: width, opacity: 0.85 },
        labelStyle: {
          fill: "#94A3B8",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
        },
        labelBgStyle: { fill: "#120F22", fillOpacity: 0.85 },
      });
    }

    return { rfNodes, rfEdges };
  }, [data]);

  const surfaceClass =
    "h-[600px] w-full rounded-[var(--radius)] border border-[var(--sage-soft)] bg-[var(--ink-deep)]";

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`${surfaceClass} p-6 space-y-4`} aria-busy>
        <Skeleton variant="text" lines={1} width="40%" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton variant="block" height="160px" />
          <Skeleton variant="block" height="160px" />
          <Skeleton variant="block" height="160px" />
        </div>
        <Skeleton variant="text" lines={2} />
      </div>
    );
  }

  // ── 5xx / network error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={`${surfaceClass} flex items-center justify-center p-6`}>
        <ErrorState
          variant="degraded"
          title="Attack graph temporarily unavailable"
          description="The graph service is unreachable. ARIA telemetry will reconnect automatically; retry to fetch the latest snapshot."
          detail={(error as Error).message}
          action={
            <Button
              variant="ghost"
              size="md"
              icon={<RefreshCw size={12} />}
              onClick={() => mutate()}
            >
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // ── Empty state (404 → empty nodes, or no scan yet) ─────────────────────────
  if (!data || data.nodes.length === 0) {
    return (
      <div className={`${surfaceClass} flex items-center justify-center p-6`}>
        <EmptyState
          variant="bordered"
          icon={<Network size={28} className="text-[var(--matcha-300)]" />}
          title="No attack paths yet"
          description="Run a fleet scan to populate the attack graph. ARIA will surface lateral-movement paths and blast-radius coverage here once telemetry arrives."
        />
      </div>
    );
  }

  // ── Graph ───────────────────────────────────────────────────────────────────
  return (
    <div className={`${surfaceClass} overflow-hidden`}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-[var(--ink-deep)]"
      >
        <Background color="#1E183D" gap={28} />
        <Controls
          showInteractive={false}
          className="!bg-[var(--moss)] !border !border-[var(--sage-soft)]"
        />
        <MiniMap
          nodeColor={(n) =>
            MINIMAP_COLORS[(n.data as { kind: string }).kind] ?? MINIMAP_COLORS.OTHER
          }
          maskColor="rgba(5,4,10,0.85)"
          className="!bg-[var(--moss-rise)] !border !border-[var(--sage-soft)]"
        />
      </ReactFlow>
    </div>
  );
}
