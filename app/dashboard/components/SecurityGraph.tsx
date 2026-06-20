"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Controls, type NodeProps, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertCircle, Server, ShieldAlert, Database, Cloud } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Color palette — values mirror app/globals.css tokens.
// SVG stroke / ReactFlow node styles do not always honor CSS var() reliably,
// so the literal token values are duplicated here as a single source.
// If the design system changes these values in globals.css, update here too.
// ──────────────────────────────────────────────────────────────────────────────

const CRITICAL_COLOR = "#F43F5E"; // var(--ember)       — rose, replaces electric magenta #FF007F
const HIGH_COLOR     = "#F59E0B"; // var(--amber-clay)  — amber, replaces deep orange #FF5722
const SURFACE_BG     = "#120F22"; // var(--moss)
const CANVAS_BG      = "#05040A"; // var(--ink-deep)
const BORDER_SOFT    = "#1E183D"; // var(--sage-soft)
const GRID_DOT       = "#1F2937"; // subtle background grid

interface CustomNodeData extends Record<string, unknown> {
  label: string;
  resourceName: string;
  icon: string;
  severity: string;
}

const CustomNode = ({ data, selected }: NodeProps<Node<CustomNodeData>>) => {
  const isCritical = data.severity === "critical";
  const accent = isCritical ? CRITICAL_COLOR : HIGH_COLOR;
  return (
    <div
      className="px-4 py-3 rounded-lg border-2 transition-all backdrop-blur-sm"
      style={{
        background: `${SURFACE_BG}E6`, // 90% opacity
        borderColor: accent,
        // Subtle outer glow — far less intense than the previous neon shadow
        boxShadow: isCritical
          ? `0 0 10px ${accent}33, 0 6px 18px -8px rgba(0,0,0,0.6)`
          : `0 0 6px ${accent}1F, 0 4px 12px -8px rgba(0,0,0,0.5)`,
        transform: selected ? "scale(1.04)" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-md"
          style={{ background: `${accent}1F`, color: accent }}
        >
          {data.icon === "server" && <Server size={18} />}
          {data.icon === "database" && <Database size={18} />}
          {data.icon === "cloud" && <Cloud size={18} />}
          {data.icon === "alert" && <ShieldAlert size={18} />}
        </div>
        <div>
          <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
            {data.label}
          </div>
          <div className="text-xs font-semibold text-stone-50 mt-0.5">
            {data.resourceName}
          </div>
        </div>
        {isCritical && (
          <div className="absolute -top-2 -right-2">
            <span className="relative flex h-4 w-4">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                style={{ background: CRITICAL_COLOR }}
              />
              <span
                className="relative inline-flex rounded-full h-4 w-4 items-center justify-center"
                style={{ background: CRITICAL_COLOR }}
              >
                <AlertCircle size={10} className="text-white" />
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Resources mirror the entities surfaced in AlertFeed so the dashboard tells a
// single coherent story: alerts -> graph -> findings -> approval queue all
// reference the same fictional account (123456789012; AWS docs placeholder).
const initialNodes: Node[] = [
  { id: "1", type: "custom", position: { x: 50,  y: 150 }, data: { label: "Public Internet", resourceName: "0.0.0.0/0",                          icon: "cloud",    severity: "high"     } },
  { id: "2", type: "custom", position: { x: 300, y: 150 }, data: { label: "EC2 Instance",    resourceName: "i-0f4a · web-prod-01",               icon: "server",   severity: "critical" } },
  { id: "3", type: "custom", position: { x: 550, y: 50  }, data: { label: "IAM Role",        resourceName: "legacy-bastion-ssm",                 icon: "alert",    severity: "critical" } },
  { id: "4", type: "custom", position: { x: 550, y: 250 }, data: { label: "RDS Snapshot",    resourceName: "metrics-rollup-2026-05-15",          icon: "database", severity: "high"     } },
  { id: "5", type: "custom", position: { x: 800, y: 50  }, data: { label: "S3 Bucket",       resourceName: "demo-prod-billing-exports",       icon: "database", severity: "critical" } },
];

const edgeLabelStyle = { fill: "#94A3B8", fontSize: 10, fontFamily: "var(--font-mono)" };

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true,                            style: { stroke: HIGH_COLOR,     strokeWidth: 2 } },
  { id: "e2-3", source: "2", target: "3", animated: true,                            style: { stroke: CRITICAL_COLOR, strokeWidth: 2.5 }, label: "AssumeRole",     labelStyle: edgeLabelStyle },
  { id: "e2-4", source: "2", target: "4", style: { stroke: HIGH_COLOR,     strokeWidth: 2, strokeDasharray: "5 5" },                       label: "Restores from",  labelStyle: edgeLabelStyle },
  { id: "e3-5", source: "3", target: "5", animated: true,                            style: { stroke: CRITICAL_COLOR, strokeWidth: 2.5 }, label: "s3:GetObject",   labelStyle: edgeLabelStyle },
];

export function SecurityGraph() {
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  return (
    <div
      className="w-full h-full rounded-[var(--radius)] overflow-hidden border"
      style={{ background: CANVAS_BG, borderColor: BORDER_SOFT }}
    >
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color={GRID_DOT} gap={16} />
        <Controls
          className="!bg-[var(--moss)] !border !border-[var(--sage-soft)]"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}
