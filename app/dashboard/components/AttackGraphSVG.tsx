"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { RestrictedPlaceholder } from "./RestrictedPlaceholder";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  type: string;
  community: number;
  criticality: number;
  aria_flagged?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

interface RawGraph {
  nodes: GraphNode[];
  links: GraphEdge[];
  directed?: boolean;
}

// ─── Node styling ─────────────────────────────────────────────────────────────

const NODE_STYLES: Record<string, { fill: string; stroke: string; icon: string }> = {
  account:  { fill: "#4c1d95", stroke: "#7c3aed", icon: "☁" },
  iam_role: { fill: "#164e63", stroke: "#06b6d4", icon: "🔑" },
  s3_bucket:{ fill: "#78350f", stroke: "#f59e0b", icon: "🪣" },
  ec2:      { fill: "#7f1d1d", stroke: "#ef4444", icon: "⚙" },
  rds:      { fill: "#1e3a5f", stroke: "#3b82f6", icon: "🗄" },
  vpc:      { fill: "#14532d", stroke: "#22c55e", icon: "🌐" },
};

const RELATION_COLORS: Record<string, string> = {
  assumes:          "#ef4444",
  references:       "#f59e0b",
  "network-reachable": "#22c55e",
  contains:         "#8b5cf6",
};

const DEFAULT_STYLE = { fill: "#27272a", stroke: "#52525b", icon: "◆" };

// ─── Force simulation (no d3 dependency) ─────────────────────────────────────

function runForce(nodes: GraphNode[], edges: GraphEdge[], W: number, H: number, iters = 200) {
  const cx = W / 2, cy = H / 2;
  const NODE_R = 34;
  const REPULSION = 8000;
  const ATTRACT = 0.04;
  const GRAVITY = 0.08;

  // Initialize positions by community
  const communities = [...new Set(nodes.map(n => n.community ?? 0))];
  nodes.forEach(n => {
    if (n.x === undefined) {
      const ci = communities.indexOf(n.community ?? 0);
      const angle = (ci / communities.length) * Math.PI * 2;
      const r = Math.min(W, H) * 0.3;
      n.x = cx + r * Math.cos(angle) + (Math.random() - 0.5) * 80;
      n.y = cy + r * Math.sin(angle) + (Math.random() - 0.5) * 80;
    }
    n.vx = 0; n.vy = 0;
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (let iter = 0; iter < iters; iter++) {
    const alpha = 1 - iter / iters;

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = (b.x! - a.x!) || 0.01;
        const dy = (b.y! - a.y!) || 0.01;
        const dist2 = Math.max(dx * dx + dy * dy, 1);
        const force = REPULSION / dist2 * alpha;
        const fx = (dx / Math.sqrt(dist2)) * force;
        const fy = (dy / Math.sqrt(dist2)) * force;
        a.vx! -= fx; a.vy! -= fy;
        b.vx! += fx; b.vy! += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const src = typeof edge.source === "object" ? (edge.source as any).id : edge.source;
      const tgt = typeof edge.target === "object" ? (edge.target as any).id : edge.target;
      const a = nodeMap.get(src), b = nodeMap.get(tgt);
      if (!a || !b) continue;
      const dx = b.x! - a.x!;
      const dy = b.y! - a.y!;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = 160 + (1 - edge.weight) * 80;
      const force = (dist - ideal) * ATTRACT * alpha;
      a.vx! += (dx / dist) * force;
      a.vy! += (dy / dist) * force;
      b.vx! -= (dx / dist) * force;
      b.vy! -= (dy / dist) * force;
    }

    // Gravity towards center
    nodes.forEach(n => {
      n.vx! += (cx - n.x!) * GRAVITY * alpha * 0.1;
      n.vy! += (cy - n.y!) * GRAVITY * alpha * 0.1;
      n.x! += n.vx!;
      n.y! += n.vy!;
      // Bounds
      n.x = Math.max(NODE_R + 20, Math.min(W - NODE_R - 20, n.x!));
      n.y = Math.max(NODE_R + 20, Math.min(H - NODE_R - 20, n.y!));
      n.vx! *= 0.7;
      n.vy! *= 0.7;
    });
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttackGraphSVG() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewAttackGraph");

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 600 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Gate: null key = no HTTP request for roles without viewAttackGraph
  const { data: raw, isLoading } = useSWR<RawGraph>(swrKey(hasAccess, "/api/aria/graph"), async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  }, { revalidateOnFocus: false, shouldRetryOnError: false });

  const graphData = useMemo(() => {
    const data = raw ?? ({ nodes: [], links: [] } as RawGraph);
    const nodes: GraphNode[] = data.nodes.map(n => ({ ...n, x: undefined, y: undefined }));
    const links = data.links;
    if (nodes.length === 0) return null;
    runForce(nodes, links, dims.w, dims.h);
    return { nodes, links };
  }, [raw, dims]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 100 && height > 100) setDims({ w: width, h: height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Non-permitted roles: show intentional restricted panel (no fetch was made)
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-full min-h-[320px]">
        <RestrictedPlaceholder
          title="Cloud Resource Graph"
          description="Interactive visualization of cloud resource relationships and attack paths."
          roles={["ADMIN", "SECOPS", "SOC_LEAD", "DEVSECOPS", "AUDITOR", "VIEWER", "CLIENT"]}
          size="md"
        />
      </div>
    );
  }

  if (isLoading || !graphData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-mono">Loading resource graph…</span>
        </div>
      </div>
    );
  }

  const { nodes, links } = graphData;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const filteredNodes = selectedType ? nodes.filter(n => n.type === selectedType) : nodes;
  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const filteredLinks = links.filter(e => {
    const src = typeof e.source === "object" ? (e.source as any).id : e.source;
    const tgt = typeof e.target === "object" ? (e.target as any).id : e.target;
    return filteredIds.has(src) && filteredIds.has(tgt);
  });

  const uniqueTypes = [...new Set(nodes.map(n => n.type))];

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[520px]">
      {/* Filter bar */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        <button
          onClick={() => setSelectedType(null)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
            !selectedType
              ? "bg-violet-600 border-violet-500 text-white"
              : "bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:border-zinc-500"
          }`}
        >
          All
        </button>
        {uniqueTypes.map(t => {
          const s = NODE_STYLES[t] ?? DEFAULT_STYLE;
          return (
            <button
              key={t}
              onClick={() => setSelectedType(selectedType === t ? null : t)}
              style={{ borderColor: selectedType === t ? s.stroke : undefined }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                selectedType === t
                  ? "text-white"
                  : "bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {s.icon} {t.replace("_", " ")}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="absolute top-3 right-3 z-10 flex gap-3">
        <div className="px-3 py-1.5 bg-zinc-900/90 border border-zinc-700 rounded-lg text-[10px] font-mono text-zinc-400 backdrop-blur">
          <span className="text-zinc-200 font-semibold">{nodes.length}</span> nodes ·{" "}
          <span className="text-zinc-200 font-semibold">{links.length}</span> edges ·{" "}
          <span className="text-rose-400 font-semibold">
            {nodes.filter(n => n.criticality >= 0.8).length}
          </span>{" "}
          critical
        </div>
      </div>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        width={dims.w}
        height={dims.h}
        className="w-full h-full"
        onMouseMove={e => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        <defs>
          {/* Arrow markers */}
          {Object.entries(RELATION_COLORS).map(([rel, color]) => (
            <marker
              key={rel}
              id={`arrow-${rel}`}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={color} opacity="0.8" />
            </marker>
          ))}
          {/* Glow filter */}
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-violet" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Grid pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect width={dims.w} height={dims.h} fill="url(#grid)" />

        {/* Edges */}
        <g>
          {filteredLinks.map((edge, i) => {
            const src = typeof edge.source === "object" ? (edge.source as any).id : edge.source;
            const tgt = typeof edge.target === "object" ? (edge.target as any).id : edge.target;
            const sNode = nodeMap.get(src);
            const tNode = nodeMap.get(tgt);
            if (!sNode || !tNode || !sNode.x || !tNode.x) return null;
            const color = RELATION_COLORS[edge.relation] ?? "#52525b";
            const dx = tNode.x - sNode.x;
            const dy = tNode.y! - sNode.y!;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            // Shorten line to node radius
            const R = 28;
            const x1 = sNode.x + (dx / dist) * R;
            const y1 = sNode.y! + (dy / dist) * R;
            const x2 = tNode.x - (dx / dist) * R;
            const y2 = tNode.y! - (dy / dist) * R;
            // Curve
            const mx = (x1 + x2) / 2 + (dy / dist) * 30;
            const my = (y1 + y2) / 2 - (dx / dist) * 30;

            return (
              <g key={i}>
                <path
                  d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
                  fill="none"
                  stroke={color}
                  strokeWidth={1 + edge.weight * 2}
                  strokeOpacity={0.5}
                  markerEnd={`url(#arrow-${edge.relation})`}
                />
                {/* Relation label */}
                <text
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  fontSize="9"
                  fill={color}
                  opacity="0.7"
                  fontFamily="monospace"
                >
                  {edge.relation}
                </text>
              </g>
            );
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map(node => {
            if (!node.x || !node.y) return null;
            const style = NODE_STYLES[node.type] ?? DEFAULT_STYLE;
            const isFlagged = node.criticality >= 0.85;
            const isFiltered = selectedType && !filteredIds.has(node.id);
            const isHovered = hoveredNode?.id === node.id;
            const R = 28 + node.criticality * 6;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                opacity={isFiltered ? 0.15 : 1}
              >
                {/* Pulse ring for critical nodes */}
                {isFlagged && (
                  <circle r={R + 8} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.4">
                    <animate attributeName="r" values={`${R + 4};${R + 14};${R + 4}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Hover ring */}
                {isHovered && (
                  <circle r={R + 6} fill="none" stroke={style.stroke} strokeWidth="2" opacity="0.6" />
                )}

                {/* Node circle */}
                <circle
                  r={R}
                  fill={style.fill}
                  stroke={isFlagged ? "#ef4444" : style.stroke}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  filter={isFlagged ? "url(#glow-red)" : isHovered ? "url(#glow-violet)" : undefined}
                />

                {/* Criticality arc */}
                <circle
                  r={R}
                  fill="none"
                  stroke={isFlagged ? "#ef4444" : style.stroke}
                  strokeWidth="3"
                  strokeDasharray={`${node.criticality * 2 * Math.PI * R} ${2 * Math.PI * R}`}
                  strokeDashoffset={0}
                  opacity="0.6"
                  transform="rotate(-90)"
                />

                {/* Icon */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  y={-5}
                  fontSize={16}
                  fill="white"
                >
                  {style.icon}
                </text>

                {/* Label */}
                <text
                  textAnchor="middle"
                  y={R + 14}
                  fontSize="10"
                  fill={isFlagged ? "#fca5a5" : "#a1a1aa"}
                  fontFamily="monospace"
                  fontWeight={isHovered ? "bold" : "normal"}
                >
                  {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
                </text>

                {/* Criticality badge */}
                {node.criticality >= 0.8 && (
                  <g transform={`translate(${R - 2},${-R + 2})`}>
                    <circle r="8" fill={node.criticality >= 0.9 ? "#ef4444" : "#f59e0b"} />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="7"
                      fill="white"
                      fontWeight="bold"
                    >
                      {Math.round(node.criticality * 10)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-20 pointer-events-none bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2.5 text-xs backdrop-blur shadow-xl max-w-xs"
          style={{
            left: Math.min(mousePos.x + 16, dims.w - 220),
            top: Math.max(mousePos.y - 60, 8),
          }}
        >
          <div className="font-semibold text-zinc-100 mb-1">{hoveredNode.label}</div>
          <div className="space-y-1 text-zinc-400 font-mono">
            <div>Type: <span className="text-zinc-200">{hoveredNode.type}</span></div>
            <div>Community: <span className="text-zinc-200">{hoveredNode.community}</span></div>
            <div>
              Criticality:{" "}
              <span className={hoveredNode.criticality >= 0.85 ? "text-rose-400 font-bold" : "text-zinc-200"}>
                {Math.round(hoveredNode.criticality * 100)}%
              </span>
            </div>
            <div className="text-[9px] text-zinc-600 truncate mt-1">{hoveredNode.id}</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-2 backdrop-blur">
        <div className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold mb-1.5">Legend</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(NODE_STYLES).map(([type, s]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.stroke }} />
              <span className="text-[9px] text-zinc-500 font-mono">{type.replace("_", " ")}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[9px] text-rose-400 font-mono">critical</span>
          </div>
        </div>
      </div>
    </div>
  );
}
