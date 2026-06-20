// frontend/lib/attack-graph-map.ts
// Pure mapping layer — zero React imports. Classifies raw graphify/AGE nodes and edges
// for rendering in the Attack Graph visualizer.

export type AGENodeKind = "AGENT" | "DATA" | "IAM" | "NETWORK" | "TOOL" | "CODE" | "DOC" | "OTHER";

export interface RawGraphNode {
  id: string;
  label: string;
  file_type?: "code" | "document" | "image";
  community?: number;
  source_file?: string;
  source_location?: string;
}

export interface RawGraphLink {
  source: string;
  target: string;
  relation: string;
  weight?: number;
  confidence?: "EXTRACTED" | "INFERRED";
  confidence_score?: number;
}

export interface RawGraph {
  directed?: boolean;
  nodes: RawGraphNode[];
  links: RawGraphLink[];
}

export function classifyNode(n: RawGraphNode): AGENodeKind {
  const l = n.label.toLowerCase();
  if (/\b(ec2|instance|i-[0-9a-f]{8,}|lambda|function)\b/.test(l)) return "AGENT";
  if (/\b(s3|bucket|rds|db|database)\b/.test(l)) return "DATA";
  if (/\b(iam|role|policy|principal|assume)\b/.test(l)) return "IAM";
  if (/\bvpc\b/.test(l)) return "NETWORK";
  if (/\b(sg|security[- ]group)\b/.test(l)) return "NETWORK";
  if (/\b(api|gateway|tool)\b/.test(l)) return "TOOL";
  if (n.file_type === "code") return "CODE";
  if (n.file_type === "document") return "DOC";
  return "OTHER";
}

export function classifyEdge(
  relation?: string | null
): "ASSUMES" | "NETWORK" | "CONTAINS" | "REFERENCES" | "OTHER" {
  const r = (relation ?? "").toLowerCase();
  if (r.includes("assume")) return "ASSUMES";
  if (r.includes("network") || r.includes("reachable") || r.includes("exposes"))
    return "NETWORK";
  if (r.includes("contain")) return "CONTAINS";
  if (r.includes("reference") || r.includes("implement")) return "REFERENCES";
  return "OTHER";
}

// TODO: add Vitest tests in attack-graph-map.test.ts once Vitest is added to
// frontend/package.json devDependencies. Minimum coverage: 5 classifyNode cases
// (EC2/S3/IAM/VPC/SG by label + CODE/DOC by file_type) and 3 classifyEdge cases.
