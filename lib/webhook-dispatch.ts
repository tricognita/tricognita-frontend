/**
 * lib/webhook-dispatch — production-grade outbound webhook delivery.
 *
 * Phase 12 — webhook delivery infrastructure. Pairs with lib/webhooks.ts
 * (subscription registry from Phase 11). This module is the dispatcher:
 *   - matches an event to subscriptions
 *   - signs the payload (HMAC-SHA256, Stripe-style header)
 *   - POSTs to the target URL with timeout
 *   - on failure: exponential backoff queue + dead-letter
 *   - records every delivery attempt for the per-subscription history
 *     surfaced in the admin UI
 *
 * Architecture decision: dispatch runs synchronously inside the originating
 * BFF route (fire-and-forget). For high-volume tenants, dispatch should
 * move to a Go-side worker that pulls from a queue. The interface here
 * (dispatchEvent) is designed so that future migration is invisible to
 * callers — they keep calling dispatchEvent; only the implementation
 * changes.
 *
 * Retry policy:
 *   attempt 1 → immediate
 *   attempt 2 → +30s
 *   attempt 3 → +5min
 *   attempt 4 → +30min
 *   attempt 5 → +2hr
 *   after 5 failures → mark subscription as failed, send to dead-letter
 *
 * Until a Redis-Streams or BullMQ-style worker exists, the retry queue is
 * an in-Redis sorted set keyed by next-retry-timestamp. A cron Vercel
 * function (or the Go worker) polls and drains it.
 */

import { Redis } from "@upstash/redis";
import { recordUsage } from "./usage-accounting";
import { listWebhooks, signPayload, type WebhookSubscription } from "./webhooks";
import type { PlatformEvent, PlatformEventType } from "./events";
import { formatForSlack } from "./integrations/slack";

// ─── Retry policy ────────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [
  30_000,        // 30 s
  5 * 60_000,    // 5 min
  30 * 60_000,   // 30 min
  2 * 60 * 60_000, // 2 h
];
const MAX_ATTEMPTS = 5;
const DISPATCH_TIMEOUT_MS = 10_000;

// ─── Redis keys ──────────────────────────────────────────────────────────────

const RETRY_QUEUE_KEY = "tricognita:webhooks:retry"; // sorted set: score=nextRetryAt
function pendingKey(attemptId: string): string {
  return `tricognita:webhooks:pending:${attemptId}`;
}
function historyKey(webhookId: string): string {
  return `tricognita:webhook:${webhookId}:history`;
}
function deadLetterKey(): string {
  return "tricognita:webhooks:dead-letter";
}
function webhookSecretKey(webhookId: string): string {
  return `tricognita:webhook:${webhookId}:secret`;
}

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

// ─── History records ─────────────────────────────────────────────────────────

export interface DeliveryHistoryEntry {
  attempt_id: string;
  webhook_id: string;
  event_type: string;
  event_id: string;
  attempt: number;
  status: "delivered" | "retrying" | "dead_letter" | "skipped";
  http_status?: number;
  response_snippet?: string;
  attempted_at: string;
  duration_ms: number;
  error?: string;
}

async function recordHistory(entry: DeliveryHistoryEntry): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.lpush(historyKey(entry.webhook_id), JSON.stringify(entry));
    // Keep last 50 attempts per subscription.
    await redis.ltrim(historyKey(entry.webhook_id), 0, 49);
  } catch {
    /* best-effort */
  }
}

/** Read recent delivery attempts for a webhook (newest first). */
export async function readHistory(
  webhookId: string,
  limit = 20,
): Promise<DeliveryHistoryEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = (await redis.lrange(historyKey(webhookId), 0, limit - 1)) as Array<
      string | object
    >;
    return raw.map((r) =>
      typeof r === "string" ? (JSON.parse(r) as DeliveryHistoryEntry) : (r as DeliveryHistoryEntry),
    );
  } catch {
    return [];
  }
}

// ─── Subscription health ─────────────────────────────────────────────────────

async function bumpFailureCount(
  webhookId: string,
  sub: WebhookSubscription,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  sub.consecutive_failures = (sub.consecutive_failures ?? 0) + 1;
  sub.last_attempt_at = new Date().toISOString();
  try {
    await redis.set(
      `tricognita:webhook:${webhookId}`,
      JSON.stringify(sub),
    );
  } catch {
    /* best-effort */
  }
}

async function resetFailureCount(
  webhookId: string,
  sub: WebhookSubscription,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  sub.consecutive_failures = 0;
  sub.last_attempt_at = new Date().toISOString();
  sub.last_success_at = sub.last_attempt_at;
  try {
    await redis.set(
      `tricognita:webhook:${webhookId}`,
      JSON.stringify(sub),
    );
  } catch {
    /* best-effort */
  }
}

// ─── Dispatch primitive ──────────────────────────────────────────────────────

/**
 * dispatchEvent — fan out one event to every matching subscription for the
 * event's tenant. Fire-and-forget — caller does NOT await; failures land
 * in the retry queue / dead-letter automatically.
 *
 * Per-subscription delivery is independent: a 500 from Slack doesn't block
 * delivery to Jira.
 */
export async function dispatchEvent(event: PlatformEvent): Promise<void> {
  if (!event.tenant_id) return; // platform-only events don't fan out per-tenant
  const subs = await listWebhooks(event.tenant_id);
  const matching = subs.filter(
    (s) => s.enabled && eventMatchesSubscription(event.type, s.event_type),
  );
  // Independent dispatch per subscription — Promise.all but with each
  // promise catching its own error so one failure doesn't poison the rest.
  await Promise.all(
    matching.map((s) =>
      attemptDelivery(s, event, 1).catch(() => {
        /* recorded in history already */
      }),
    ),
  );
}

/**
 * Subscription event_type matching. Today: exact string match. Future:
 * support wildcards (e.g., "scan.*" to subscribe to the whole namespace).
 */
function eventMatchesSubscription(
  eventType: PlatformEventType,
  subType: string,
): boolean {
  if (subType === eventType) return true;
  if (subType.endsWith(".*")) {
    const prefix = subType.slice(0, -1);
    return eventType.startsWith(prefix);
  }
  return false;
}

/**
 * attemptDelivery — single delivery attempt. On success: records history,
 * resets failure count. On failure: records history with retrying status,
 * enqueues a retry (if under MAX_ATTEMPTS) or dead-letters.
 */
async function attemptDelivery(
  sub: WebhookSubscription,
  event: PlatformEvent,
  attempt: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    // No Redis → we can't even enqueue retries. Fail silently; the BFF
    // log will show the event was emitted but we couldn't dispatch.
    return;
  }

  // Read the full secret. Stored separately so it's not in the
  // subscription's listing payload.
  const secret = await redis.get<string>(webhookSecretKey(sub.id));
  if (!secret) {
    await recordHistory({
      attempt_id: `${sub.id}-${event.id}-${attempt}`,
      webhook_id: sub.id,
      event_type: event.type,
      event_id: event.id,
      attempt,
      status: "skipped",
      attempted_at: new Date().toISOString(),
      duration_ms: 0,
      error: "secret_missing",
    });
    return;
  }

  // Format selection: Slack subscriptions get Block-Kit; everything else
  // gets the raw event envelope. Slack URLs are recognized by hostname so
  // a customer who pastes a Slack URL into the generic webhook form still
  // gets the right format.
  const isSlack = sub.target_url.startsWith("https://hooks.slack.com/");
  const body = isSlack
    ? JSON.stringify(formatForSlack(event))
    : JSON.stringify(event);
  const signature = signPayload(secret, body);
  const startedAt = Date.now();

  try {
    const res = await fetch(sub.target_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Tricognita-Webhook/1",
        "X-Tricognita-Signature": signature,
        "X-Tricognita-Event-Type": event.type,
        "X-Tricognita-Event-Id": event.id,
        "X-Tricognita-Delivery-Attempt": String(attempt),
      },
      body,
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
    const duration_ms = Date.now() - startedAt;
    const text = await res.text().catch(() => "");
    const snippet = text.slice(0, 200);

    if (res.ok) {
      await recordHistory({
        attempt_id: `${sub.id}-${event.id}-${attempt}`,
        webhook_id: sub.id,
        event_type: event.type,
        event_id: event.id,
        attempt,
        status: "delivered",
        http_status: res.status,
        response_snippet: snippet,
        attempted_at: new Date().toISOString(),
        duration_ms,
      });
      await resetFailureCount(sub.id, sub);
      // Usage accounting — successful delivery counts against tenant's
      // monthly webhook_delivered counter. Fail-open via recordUsage.
      recordUsage({
        tenantId: sub.tenant_id,
        dimension: "webhooks_delivered",
      });
      return;
    }

    // Non-2xx → retry or dead-letter.
    const willRetry = attempt < MAX_ATTEMPTS;
    await recordHistory({
      attempt_id: `${sub.id}-${event.id}-${attempt}`,
      webhook_id: sub.id,
      event_type: event.type,
      event_id: event.id,
      attempt,
      status: willRetry ? "retrying" : "dead_letter",
      http_status: res.status,
      response_snippet: snippet,
      attempted_at: new Date().toISOString(),
      duration_ms,
      error: `HTTP ${res.status}`,
    });
    await bumpFailureCount(sub.id, sub);
    if (willRetry) {
      await enqueueRetry(sub, event, attempt + 1);
    } else {
      await deadLetter(sub, event, `HTTP ${res.status}`);
      recordUsage({
        tenantId: sub.tenant_id,
        dimension: "webhooks_failed",
      });
    }
  } catch (err) {
    const duration_ms = Date.now() - startedAt;
    const detail = err instanceof Error ? err.message : String(err);
    const willRetry = attempt < MAX_ATTEMPTS;
    await recordHistory({
      attempt_id: `${sub.id}-${event.id}-${attempt}`,
      webhook_id: sub.id,
      event_type: event.type,
      event_id: event.id,
      attempt,
      status: willRetry ? "retrying" : "dead_letter",
      attempted_at: new Date().toISOString(),
      duration_ms,
      error: detail,
    });
    await bumpFailureCount(sub.id, sub);
    if (willRetry) {
      await enqueueRetry(sub, event, attempt + 1);
    } else {
      await deadLetter(sub, event, detail);
      recordUsage({
        tenantId: sub.tenant_id,
        dimension: "webhooks_failed",
      });
    }
  }
}

// ─── Retry queue ─────────────────────────────────────────────────────────────

async function enqueueRetry(
  sub: WebhookSubscription,
  event: PlatformEvent,
  nextAttempt: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const delayIdx = Math.min(nextAttempt - 2, RETRY_DELAYS_MS.length - 1);
  const delayMs = RETRY_DELAYS_MS[Math.max(0, delayIdx)];
  const nextRetryAt = Date.now() + delayMs;
  const attemptId = `${sub.id}:${event.id}:${nextAttempt}`;

  try {
    await redis.set(
      pendingKey(attemptId),
      JSON.stringify({ sub, event, attempt: nextAttempt }),
      { ex: Math.ceil((delayMs + 3 * 60 * 60_000) / 1000) }, // expire 3h after retry
    );
    await redis.zadd(RETRY_QUEUE_KEY, { score: nextRetryAt, member: attemptId });
  } catch {
    /* best-effort */
  }
}

async function deadLetter(
  sub: WebhookSubscription,
  event: PlatformEvent,
  reason: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.lpush(
      deadLetterKey(),
      JSON.stringify({
        webhook_id: sub.id,
        tenant_id: sub.tenant_id,
        event_type: event.type,
        event_id: event.id,
        reason,
        dead_lettered_at: new Date().toISOString(),
      }),
    );
    await redis.ltrim(deadLetterKey(), 0, 199); // keep last 200 dead letters
  } catch {
    /* best-effort */
  }
}

/**
 * drainRetryQueue — pulls every entry whose nextRetryAt has elapsed and
 * re-attempts delivery. Called by a cron / worker; safe to call multiple
 * times concurrently (each attempt-id is consumed atomically).
 *
 * Returns the number of attempts processed (for observability).
 */
export async function drainRetryQueue(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  let processed = 0;
  try {
    const now = Date.now();
    // Pull ready entries; cap per drain pass to keep the cron call bounded.
    const ready = (await redis.zrange(
      RETRY_QUEUE_KEY,
      0,
      now,
      { byScore: true, offset: 0, count: 100 },
    )) as string[];

    for (const attemptId of ready) {
      // Atomic claim: remove from the queue before attempting; if a
      // parallel drainer also got the same id, only one will get the
      // pending record (we del it after read).
      const removed = await redis.zrem(RETRY_QUEUE_KEY, attemptId);
      if (removed === 0) continue;

      const raw = await redis.get<string | object>(pendingKey(attemptId));
      if (!raw) continue;
      const parsed =
        typeof raw === "string"
          ? (JSON.parse(raw) as {
              sub: WebhookSubscription;
              event: PlatformEvent;
              attempt: number;
            })
          : (raw as {
              sub: WebhookSubscription;
              event: PlatformEvent;
              attempt: number;
            });
      await redis.del(pendingKey(attemptId));

      await attemptDelivery(parsed.sub, parsed.event, parsed.attempt).catch(
        () => {
          /* recorded */
        },
      );
      processed++;
    }
  } catch {
    /* best-effort */
  }
  return processed;
}

/**
 * peekDeadLetter — read recent dead-letter entries for the admin UI.
 */
/**
 * queueDepth — operational metric for the health-aggregate endpoint.
 * Returns 0 when Redis is not configured so the endpoint stays
 * usable in dev environments without Upstash.
 */
export async function queueDepth(): Promise<{
  retry: number;
  dead_letter: number;
}> {
  const redis = getRedis();
  if (!redis) return { retry: 0, dead_letter: 0 };
  try {
    const [retry, dl] = await Promise.all([
      redis.zcard(RETRY_QUEUE_KEY),
      redis.llen(deadLetterKey()),
    ]);
    return { retry: Number(retry) || 0, dead_letter: Number(dl) || 0 };
  } catch {
    return { retry: 0, dead_letter: 0 };
  }
}

export async function peekDeadLetter(
  limit = 50,
): Promise<
  Array<{
    webhook_id: string;
    tenant_id: string;
    event_type: string;
    event_id: string;
    reason: string;
    dead_lettered_at: string;
  }>
> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = (await redis.lrange(deadLetterKey(), 0, limit - 1)) as Array<
      string | object
    >;
    return raw.map((r) =>
      typeof r === "string"
        ? JSON.parse(r)
        : (r as {
            webhook_id: string;
            tenant_id: string;
            event_type: string;
            event_id: string;
            reason: string;
            dead_lettered_at: string;
          }),
    );
  } catch {
    return [];
  }
}
