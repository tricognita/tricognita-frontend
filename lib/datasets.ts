/**
 * lib/datasets.ts — Tricognita LLM Dataset Collection Engine
 *
 * Collects structured training data from all platform events.
 * Storage hierarchy:
 *   1. Upstash Redis (fast, durable — configure UPSTASH_REDIS_REST_URL + TOKEN)
 *   2. In-memory (fallback — survives the request, lost on cold start)
 *
 * NOTE: S3 storage has been intentionally removed. The Vercel frontend never
 * holds Tricognita AWS credentials — client AWS access is handled exclusively
 * by the Go API via STS AssumeRole with client-provided IAM roles.
 * If you need durable event storage, wire in Upstash Redis via env vars.
 */

import { Redis } from "@upstash/redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatasetEventType =
  | "scan_result"
  | "aria_prediction"
  | "jit_approval"
  | "jit_rejection"
  | "finops_terminate"
  | "user_login"
  | "compliance_report"
  | "finding"
  | "remediation"
  | "manual_approval";

export interface DatasetEvent {
  id: string;           // evt_<timestamp>_<random>
  ts: string;           // ISO 8601
  type: DatasetEventType;
  input: Record<string, unknown>;   // What the system/user saw
  output: Record<string, unknown>;  // What was decided/produced
  label: string | null; // Human label for supervised fine-tuning (added later)
  source: string;       // Which system produced this
  account_id: string;   // AWS account context (from client role)
  user_email?: string;  // Which user triggered this (if applicable)
  metadata: Record<string, unknown>;
}

// ─── Storage clients ──────────────────────────────────────────────────────────

const redisUrl   = process.env.UPSTASH_REDIS_REST_URL   ?? process.env.KV_REST_API_URL   ?? "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const REDIS_KEY  = "tricognita:datasets:v1";
const MEMORY_MAX = 2000;

let memoryEvents: DatasetEvent[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId(): string {
  const ts   = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `evt_${ts}_${rand}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function recordEvent(
  type: DatasetEventType,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  opts: {
    source?:     string;
    account_id?: string;
    user_email?: string;
    metadata?:   Record<string, unknown>;
  } = {}
): Promise<DatasetEvent> {
  const event: DatasetEvent = {
    id:         makeId(),
    ts:         new Date().toISOString(),
    type,
    input,
    output,
    label:      null,
    source:     opts.source     ?? "platform",
    account_id: opts.account_id ?? "",
    user_email: opts.user_email,
    metadata:   opts.metadata   ?? {},
  };

  // Always store in memory (instant, no I/O)
  memoryEvents = [...memoryEvents.slice(-(MEMORY_MAX - 1)), event];

  // Persist to Redis if configured
  if (redis) {
    try {
      const existing = await redis.get<DatasetEvent[]>(REDIS_KEY) ?? [];
      await redis.set(REDIS_KEY, [...existing.slice(-999), event]);
    } catch (err) {
      // Redis failure is non-fatal — memory store is the fallback
      console.warn("[datasets] Redis write failed:", (err as Error).message);
    }
  }

  return event;
}

export async function getEvents(limit = 200): Promise<DatasetEvent[]> {
  if (redis) {
    try {
      const events = await redis.get<DatasetEvent[]>(REDIS_KEY);
      if (events && events.length > 0) {
        return events.slice(-limit).reverse();
      }
    } catch {
      // Fall through to memory
    }
  }
  return [...memoryEvents].reverse().slice(0, limit);
}

export async function labelEvent(id: string, label: string): Promise<boolean> {
  const idx = memoryEvents.findIndex((e) => e.id === id);
  if (idx >= 0) memoryEvents[idx].label = label;

  if (redis) {
    try {
      const events = await redis.get<DatasetEvent[]>(REDIS_KEY) ?? [];
      await redis.set(REDIS_KEY, events.map((e) => (e.id === id ? { ...e, label } : e)));
      return true;
    } catch {
      // Non-fatal
    }
  }
  return idx >= 0;
}

export async function clearEvents(): Promise<void> {
  memoryEvents = [];
  if (redis) {
    try { await redis.del(REDIS_KEY); } catch { /* non-fatal */ }
  }
}

export function getStorageStatus(): {
  redis: boolean;
  memory_count: number;
} {
  return {
    redis:        !!redis,
    memory_count: memoryEvents.length,
  };
}
