/**
 * lib/leads — design partner / pilot / waitlist lead capture.
 *
 * Phase 20 — design partner activation funnel. Captures unauthenticated
 * visitor leads from the public marketing site (request demo, pilot
 * application, waitlist signup) into a Redis-backed inbox the founder
 * reads on /dashboard/admin/leads.
 *
 * Distinct from lib/feedback.ts — feedback comes from AUTHENTICATED
 * users inside the product; leads come from UNAUTHENTICATED visitors
 * on the marketing site. The schemas differ accordingly: leads include
 * company + role + use-case fields; feedback does not.
 *
 * Storage layout (Redis):
 *   tricognita:leads:inbox                  list, LTRIM 500, admin inbox
 *   tricognita:leads:entry:{id}             string, full entry JSON
 *   tricognita:leads:dedup:{email_hash}     string with TTL, anti-flood
 *
 * Light dedup: a given email submitting the same kind of lead within
 * 1 hour gets a single inbox entry (the latest), not multiple. This
 * stops a confused or impatient submitter from triple-spamming the
 * inbox while still allowing genuine re-submissions later.
 */

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

export type LeadKind = "request_demo" | "pilot_application" | "waitlist" | "contact";

export type LeadStatus = "new" | "contacted" | "qualified" | "closed";

export interface LeadEntry {
  id: string;
  kind: LeadKind;
  /** Free-text name. Capped server-side. */
  name: string;
  /** Email. Validated for "@" + "." minimum. */
  email: string;
  /** Optional company name. */
  company?: string;
  /** Optional role/title (CISO, Security Engineer, MSSP Lead, etc.). */
  role?: string;
  /** Free-text "what are you trying to do?" — the most valuable field. */
  use_case?: string;
  /** Optional cloud / scale context — guides founder routing. */
  context?: {
    primary_cloud?: "aws" | "azure" | "gcp" | "multi" | "unknown";
    team_size?: string;
    timeframe?: string;
  };
  /** Source URL the lead came from. Server-captured. */
  source_path?: string;
  /** User-agent string. Server-captured. */
  user_agent?: string;
  status: LeadStatus;
  /** Free-text founder notes added during triage. */
  notes?: string;
  contacted_at?: string;
  contacted_by?: string;
  submitted_at: string;
}

export const LEAD_KINDS: readonly LeadKind[] = [
  "request_demo",
  "pilot_application",
  "waitlist",
  "contact",
] as const;

const INBOX_KEY = "tricognita:leads:inbox";
const INBOX_CAP = 500;
const DEDUP_TTL_SECONDS = 60 * 60; // 1 hour

function entryKey(id: string): string {
  return `tricognita:leads:entry:${id}`;
}
function dedupKey(emailHash: string, kind: LeadKind): string {
  return `tricognita:leads:dedup:${kind}:${emailHash}`;
}
function emailHash(email: string): string {
  return createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

function newId(): string {
  return `ld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface SubmitLeadArgs {
  kind: LeadKind;
  name: string;
  email: string;
  company?: string;
  role?: string;
  use_case?: string;
  context?: LeadEntry["context"];
  source_path?: string;
  user_agent?: string;
}

export interface SubmitLeadResult {
  ok: boolean;
  /** "stored" | "deduped" | "redis_unavailable" */
  status: "stored" | "deduped" | "redis_unavailable";
  id?: string;
}

/**
 * submitLead — persist a new lead unless deduped or Redis is down.
 * Returns a discriminated result so the route can pick the right
 * HTTP status + user-facing message.
 *
 * Honest failure mode: Redis-down returns redis_unavailable so the
 * route can return 503 with a "please email us directly" message —
 * never silent success.
 */
export async function submitLead(args: SubmitLeadArgs): Promise<SubmitLeadResult> {
  const redis = getRedis();
  if (!redis) {
    return { ok: false, status: "redis_unavailable" };
  }

  const hash = emailHash(args.email);
  const dedupK = dedupKey(hash, args.kind);

  try {
    // Atomic dedup check via SET NX EX
    const setResult = await redis.set(dedupK, "1", { nx: true, ex: DEDUP_TTL_SECONDS });
    if (!setResult) {
      // Key already exists → this email submitted the same kind recently
      return { ok: true, status: "deduped" };
    }

    const entry: LeadEntry = {
      id: newId(),
      kind: args.kind,
      name: args.name,
      email: args.email,
      company: args.company,
      role: args.role,
      use_case: args.use_case,
      context: args.context,
      source_path: args.source_path,
      user_agent: args.user_agent,
      status: "new",
      submitted_at: new Date().toISOString(),
    };

    await Promise.all([
      redis.set(entryKey(entry.id), JSON.stringify(entry)),
      redis.lpush(INBOX_KEY, entry.id).then(() =>
        redis.ltrim(INBOX_KEY, 0, INBOX_CAP - 1),
      ),
    ]);

    return { ok: true, status: "stored", id: entry.id };
  } catch {
    return { ok: false, status: "redis_unavailable" };
  }
}

/**
 * readLeads — admin inbox; cross-marketing-source.
 */
export async function readLeads(limit = 200): Promise<LeadEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const ids = (await redis.lrange(INBOX_KEY, 0, limit - 1)) as string[];
    if (ids.length === 0) return [];
    const keys = ids.map(entryKey);
    const raw = await redis.mget<(string | object | null)[]>(...keys);
    const out: LeadEntry[] = [];
    for (const r of raw) {
      if (!r) continue;
      try {
        out.push(typeof r === "string" ? JSON.parse(r) : (r as LeadEntry));
      } catch {
        /* skip corrupt entry */
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * updateLeadStatus — founder triage action. Returns the updated entry
 * or null if the id is unknown.
 */
export async function updateLeadStatus(
  id: string,
  next: LeadStatus,
  by: string,
  notes?: string,
): Promise<LeadEntry | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<string | object | null>(entryKey(id));
  if (!raw) return null;
  const entry: LeadEntry =
    typeof raw === "string" ? JSON.parse(raw) : (raw as LeadEntry);

  entry.status = next;
  if (notes !== undefined) entry.notes = notes;
  if (next === "contacted") {
    entry.contacted_at = new Date().toISOString();
    entry.contacted_by = by;
  }
  await redis.set(entryKey(id), JSON.stringify(entry));
  return entry;
}

/** Display labels for the UI. */
export const KIND_LABELS: Record<LeadKind, string> = {
  request_demo: "Request demo",
  pilot_application: "Pilot application",
  waitlist: "Waitlist",
  contact: "Contact",
};

export const STATUS_INTENT: Record<
  LeadStatus,
  "info" | "warning" | "success" | "neutral"
> = {
  new: "info",
  contacted: "warning",
  qualified: "success",
  closed: "neutral",
};
