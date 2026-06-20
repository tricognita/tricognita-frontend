export type HealingModeState = "MANUAL_APPROVAL" | "AUTONOMOUS";

export type ActionStatus =
  | "pending_approval"
  | "accepted"
  | "pending"
  | "running"
  | "executing"
  | "executed"
  | "success"
  | "rolled_back"
  | "failed";

export interface ARIAJob {
  id: string;
  status: "pending" | "running" | "success" | "failed" | "rolled_back";
  progress: number;
  result?: string;
  error?: string;
  created_at: string;
}

export interface PipelineResult {
  prediction_id: string;
  rca_log_id: string;
  actions_executed: number;
  actions_pending: number;
  duration_ms: number;
}

export interface ARIAStatus {
  mode: HealingModeState;
  service: string;
  status: string;
  timestamp: string;
}

export interface SHAPFeature {
  name: string;
  value: number;
}

export interface PredictionResult {
  resource_arn: string;
  risk_score: number;
  uncertainty: number;
  shap_vector: Record<string, number>;
  anomaly_flags: string[];
  model_version: string;
  horizon: string;
}

export interface ReasoningStep {
  step_index: number;
  thought: string;
  action: string;
  action_input: string;
  observation: string;
}

export interface HealingAction {
  action_id: string;
  action_type: string;
  target_arn: string;
  parameters: Record<string, unknown>;
  risk_score: number;
  shap_vector: Record<string, number>;
  rca_narrative: string;
  priority: number;
  depends_on: string[];
}

export interface RCAResult {
  session_id: string;
  root_cause: string;
  confidence: number;
  action_plan: HealingAction[];
  reasoning_steps: ReasoningStep[];
  raw_response: string;
}

export interface ActionResult {
  action_id: string;
  status: ActionStatus;
  aws_req_id?: string;
  message?: string;
  executed_at?: string;
}

export interface HealingActionRow {
  id: string;
  rca_log_id: string;
  action_type: string;
  target_arn: string;
  parameters: unknown;
  status: ActionStatus;
  healing_mode: HealingModeState;
  created_at: string;
}

export interface FinOpsFinding {
  id: string;
  resource_arn: string;
  resource_type: string;
  finding_type: "zombie" | "spot_candidate" | "overprovisioned";
  estimated_savings_usd?: number;
  status: string;
  idle_since?: string;
  metadata?: unknown;
}

export interface FinOpsSummary {
  zombie_count: number;
  spot_candidates: number;
  rightsize_count: number;
  estimated_savings_usd: number;
}
