/**
 * lib/domain — the product's own model.
 *
 * Import from this barrel only:
 *   import type { Control, Finding } from "@/lib/domain";
 *   import { CONTROL_STATUS, needsAttention } from "@/lib/domain";
 *
 * Rules (FRONTEND_ARCHITECTURE.md §1):
 *   - no React, SWR or Next imports in this folder
 *   - no page defines its own version of these types
 *   - backend shapes stay in lib/api/dto and are converted by adapters
 */

export * from "./status";
export * from "./entities";
export * from "./roles";
export * from "./selectors";
export * from "./assurance-record";
export * from "./manual-remediation";
