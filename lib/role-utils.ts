import { type Role } from "./auth";

export type UserRole = Role;

export const mockUsers: Array<{ id: string; name: string; email: string; role: UserRole }> = [
  { id: "u1", name: "Alice Founder", email: "alice@tricognita.io", role: "ADMIN" },
  { id: "u2", name: "Bob SecOps",   email: "bob@tricognita.io",   role: "DEVSECOPS" },
  { id: "u3", name: "Charlie MDR",  email: "charlie@tricognita.io", role: "SOC_LEAD" },
  { id: "u4", name: "Dana Analyst", email: "dana@tricognita.io",  role: "FINOPS_ANALYST" },
  { id: "u5", name: "Eve RedTeam",  email: "eve@tricognita.io",   role: "RED_TEAMER" },
  { id: "u10", name: "Client Admin", email: "admin@client.com",   role: "CLIENT" },
];

export function getRoleMetadata(role: UserRole) {
  switch (role) {
    case "DEVSECOPS":
      return { focus: "CI/CD & AppSec", primaryMetric: "SBOM Drift" };
    case "SOC_LEAD":
      return { focus: "Incident Response", primaryMetric: "MTTR" };
    case "RED_TEAMER":
      return { focus: "Offensive Ops", primaryMetric: "Kill Chain Depth" };
    case "FINOPS_ANALYST":
      return { focus: "Cloud Economics", primaryMetric: "Waste Ratio" };
    case "CLIENT":
    case "VIEWER":
      return { focus: "Trust & Compliance", primaryMetric: "Posture Index" };
    default:
      return { focus: "Executive Control", primaryMetric: "Fleet Status" };
  }
}
