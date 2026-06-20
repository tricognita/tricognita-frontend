"use client";

import dynamic from "next/dynamic";
import { AlertTriangle, Network, Shield } from "lucide-react";
import { Badge, HStack, PageShell, StatusDot } from "@/lib/ui";

const AttackGraph = dynamic(() => import("../components/AttackGraph"), { ssr: false });

export default function AttackGraphPage() {
  return (
    <PageShell
      eyebrow="Posture · Attack Graph"
      title="Attack Graph"
      description="ARIA-mapped blast radius and lateral-movement view across discovered resources. Reference paths are illustrative; live graph activates once the scan engine is connected to this surface."
      meta={
        <HStack gap="sm" align="center" wrap>
          <StatusDot intent="warning" size="sm" label="Reference graph" />
          <Badge intent="danger" variant="subtle" size="xs">
            <AlertTriangle size={10} className="mr-1" />
            2 critical paths
          </Badge>
          <Badge intent="violet" variant="subtle" size="xs">
            <Shield size={10} className="mr-1" />
            7 nodes
          </Badge>
        </HStack>
      }
      width="wide"
      density="tight"
    >
      {/* Legend strip */}
      <div
        className="px-4 py-2 rounded-[var(--radius)] border border-[var(--sage-soft)]"
        style={{ background: "var(--moss)" }}
      >
        <HStack gap="md" align="center" wrap className="text-[10px] font-mono text-[var(--stone-500)]">
          <HStack gap="xs" align="center">
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: "var(--ember)" }}
            />
            ARIA-flagged critical assets
          </HStack>
          <HStack gap="xs" align="center">
            <span
              aria-hidden
              className="inline-block w-5 border-t-2"
              style={{ borderColor: "var(--ember)" }}
            />
            Assumes (lateral movement)
          </HStack>
          <HStack gap="xs" align="center">
            <span
              aria-hidden
              className="inline-block w-5 border-t-2"
              style={{ borderColor: "var(--amber-clay)" }}
            />
            References
          </HStack>
          <HStack gap="xs" align="center">
            <span
              aria-hidden
              className="inline-block w-5 border-t-2"
              style={{ borderColor: "var(--matcha-400)" }}
            />
            Network-reachable
          </HStack>
          <HStack gap="xs" align="center">
            <span
              aria-hidden
              className="inline-block w-5 border-t-2"
              style={{ borderColor: "var(--matcha-500)" }}
            />
            Contains
          </HStack>
          <span className="ml-auto text-[var(--stone-600)]">
            Hover nodes for details · Filter by resource type
          </span>
        </HStack>
      </div>

      {/* Graph canvas */}
      <div
        className="relative rounded-[var(--radius)] border border-[var(--sage-soft)] overflow-hidden"
        style={{ minHeight: "560px", background: "var(--ink-deep)" }}
      >
        <AttackGraph />
        {/* Node icon legend (visual cue at top-left) */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-md backdrop-blur-sm border border-[var(--sage-soft)]"
          style={{ background: "var(--moss-rise)/90" }}
        >
          <HStack gap="xs" align="center">
            <Network size={12} className="text-[var(--matcha-300)]" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--stone-400)]">
              ARIA Graph · Force-directed
            </span>
          </HStack>
        </div>
      </div>
    </PageShell>
  );
}
