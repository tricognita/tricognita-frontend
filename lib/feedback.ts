/**
 * lib/feedback — pilot/customer feedback capture.
 *
 * Phase 15 — feedback infrastructure. Light-weight Redis-backed inbox
 * so design partners and pilot users can flag friction without leaving
 * the product. The point isn't a ticketing system; it's a low-friction
 * "I'm confused / this is broken / this is useful" signal that lands
 * in an admin inbox the founder can read.
 *
 * Model:
 *   - Each submission is a FeedbackEntry stored as JSON.
 *   - One per-tenant list (LTRIM 200) so noisy tenants don't push
 *     other tenants out.
 *   - One platform-wide list (LTRIM 500) for admin triage across
 *     all tenants.
 *   - Status transitions: new → triaged → resolved. Resolved entries
 *     stay in the list (LTRIM is the only retention; no archive).
 *
 * What this is NOT:
 *   - A bug tracker. It's a signal collector. The admin reviews
 *     entries and may file actual issues elsewhere.
 *   - Customer-facing communication. The pilot user sees a
 *     "received" toast; nothing more. We respond out-of-band.
 *
 * Tenant scoping: every read/write is tenant-aware EXCEPT the
 * admin inbox (which is intentionally cross-tenant — that's the
 * point of having one).
 */

import { Redis } from "@upstash/redis";

export type FeedbackCategory =
  | "onboarding"
  | "workflow"
  | "ui_confusion"
  | "deployment"
  | "integration"
  | "general";

export type FeedbackStatus = "new" | "triaged" | "resolved";

export interface FeedbackEntry {
  id: string;
  tenant_id: string;
  user_email: string;
  user_role: string;
  category: FeedbackCategory;
  /** What the user typed. Capped at 4000 chars by the route. */
  message: string;
  /** Auto-captured page path so we know where the friction lived. */
  page_path: string;
  /** UA + viewport + timezone — diagnostic context, not PII. */
  context: {
    user_agent?: string;
    viewport?: string;
    timezone?: string;
  };
  status: FeedbackStatus;
  triaged_at?: string;
  triaged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  /** Free-text triage notes the admin adds. */
  admin_notes?: string;
  submitted_at: string;
}

export const CATEGORIES: readonly FeedbackCategory[] = [
  "onboarding",
  "workflow",
  "ui_confusion",
  "deployment",
  "integration",
  "general",
] as const;

const ADMIN_KEY = "tricognita:feedback:admin"; // platform-wide list
function tenantKey(tenantId: string): string {
  return `tricognita:feedback:tenant:${tenantId}`;
}
function entryKey(id: string): string {
  return `tricognita:feedback:entry:${id}`;
}

const ADMIN_CAP = 500;
const TENANT_CAP = 200;

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
  return `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface SubmitFeedbackArgs {
  tenantId: string;
  userEmail: string;
  userRole: string;
  category: FeedbackCategory;
  message: string;
  pagePath: string;
  userAgent?: string;
  viewport?: string;
  timezone?: string;
}

/**
 * submitFeedback — write a new entry. Returns the persisted entry on
 * success or null when Redis is unavailable (the route translates
 * that into a 503 so the user knows their message wasn't kept).
 */
export async function submitFeedback(
  args: SubmitFeedbackArgs,
): Promise<FeedbackEntry | null> {
  const redis = getRedis();
  if (!redis) return null;

  const entry: FeedbackEntry = {
    id: newId(),
    tenant_id: args.tenantId,
    user_email: args.userEmail,
    user_role: args.userRole,
    category: args.category,
    message: args.message,
    page_path: args.pagePath,
    context: {
      user_agent: args.userAgent,
      viewport: args.viewport,
      timezone: args.timezone,
    },
    status: "new",
    submitted_at: new Date().toISOString(),
  };

  // Three writes:
  //   - the entry record itself (so we can fetch by id for the detail view)
  //   - the tenant list (so the submitter's org can see their own history)
  //   - the admin list (cross-tenant inbox)
  await Promise.all([
    redis.set(entryKey(entry.id), JSON.stringify(entry)),
    redis.lpush(tenantKey(args.tenantId), entry.id).then(() =>
      redis.ltrim(tenantKey(args.tenantId), 0, TENANT_CAP - 1),
    ),
    redis.lpush(ADMIN_KEY, entry.id).then(() =>
      redis.ltrim(ADMIN_KEY, 0, ADMIN_CAP - 1),
    ),
  ]);

  return entry;
}

async function fetchEntries(ids: string[]): Promise<FeedbackEntry[]> {
  const redis = getRedis();
  if (!redis || ids.length === 0) return [];
  const keys = ids.map(entryKey);
  const raw = await redis.mget<(string | object | null)[]>(...keys);
  const entries: FeedbackEntry[] = [];
  for (const r of raw) {
    if (!r) continue;
    try {
      entries.push(typeof r === "string" ? JSON.parse(r) : (r as FeedbackEntry));
    } catch {
      /* skip corrupt entry */
    }
  }
  return entries;
}

/**
 * readAdminFeedback — admin inbox; cross-tenant.
 */
export async function readAdminFeedback(limit = 100): Promise<FeedbackEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = (await redis.lrange(ADMIN_KEY, 0, limit - 1)) as string[];
  return fetchEntries(ids);
}

/**
 * readTenantFeedback — entries submitted from a given tenant.
 */
export async function readTenantFeedback(
  tenantId: string,
  limit = 50,
): Promise<FeedbackEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  const ids = (await redis.lrange(tenantKey(tenantId), 0, limit - 1)) as string[];
  return fetchEntries(ids);
}

/**
 * updateFeedbackStatus — admin triage action. Returns the updated entry
 * or null if the id is unknown.
 */
export async function updateFeedbackStatus(
  id: string,
  next: FeedbackStatus,
  by: string,
  notes?: string,
): Promise<FeedbackEntry | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get<string | object | null>(entryKey(id));
  if (!raw) return null;
  const entry: FeedbackEntry =
    typeof raw === "string" ? JSON.parse(raw) : (raw as FeedbackEntry);

  entry.status = next;
  if (notes !== undefined) entry.admin_notes = notes;
  const now = new Date().toISOString();
  if (next === "triaged") {
    entry.triaged_at = now;
    entry.triaged_by = by;
  } else if (next === "resolved") {
    entry.resolved_at = now;
    entry.resolved_by = by;
    if (!entry.triaged_at) {
      // a resolved entry implies triaged
      entry.triaged_at = now;
      entry.triaged_by = by;
    }
  }
  await redis.set(entryKey(id), JSON.stringify(entry));
  return entry;
}
