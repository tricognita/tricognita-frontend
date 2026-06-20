/**
 * lib/webhooks — outbound webhook subscription registry.
 *
 * Phase 11 — integration ecosystem foundations. Architecture-only: the
 * subscription model + CRUD primitives are wired so customers can declare
 * outbound webhooks, but the actual dispatch loop (firing webhooks when
 * events happen) is a future commit — it requires the Go API to publish
 * an event stream the BFF can subscribe to.
 *
 * Subscription model:
 *   - Each tenant can register multiple webhooks.
 *   - Each webhook is keyed to ONE event type (scan.completed,
 *     remediation.executed, critical_finding, etc.) and ONE target URL.
 *   - HMAC signing secret is generated at create-time and shown once.
 *   - State: enabled | disabled. Disabled webhooks stay in the registry
 *     for audit but don't fire.
 *
 * Redis layout:
 *   tricognita:webhook:{webhookId}                  — full record (JSON)
 *   tricognita:webhooks:tenant:{tenantId}           — sorted set of ids
 *
 * Verification (HMAC-SHA256 signature in X-Tricognita-Signature header)
 * is the contract dispatchers will use to prove a webhook came from us.
 * Customers verify with the secret they saved at create-time.
 *
 * What's NOT in scope here:
 *   - Dispatch loop (requires Go event stream)
 *   - Retry queue + dead-letter
 *   - Delivery success/failure history
 * These are tracked in docs/SCALABILITY_AUDIT.md backlog.
 */

import { createHmac, randomBytes } from "crypto";
import { Redis } from "@upstash/redis";

export type WebhookEventType =
  | "scan.completed"
  | "scan.failed"
  | "critical_finding"
  | "remediation.approved"
  | "remediation.rejected"
  | "remediation.executed"
  | "incident.declared"
  | "incident.resolved"
  | "credentials.connected"
  | "credentials.removed"
  | "api_key.created"
  | "api_key.revoked";

const ALLOWED_EVENTS = new Set<WebhookEventType>([
  "scan.completed",
  "scan.failed",
  "critical_finding",
  "remediation.approved",
  "remediation.rejected",
  "remediation.executed",
  "incident.declared",
  "incident.resolved",
  "credentials.connected",
  "credentials.removed",
  "api_key.created",
  "api_key.revoked",
]);

export interface WebhookSubscription {
  id: string;
  tenant_id: string;
  event_type: WebhookEventType;
  target_url: string;
  label: string;
  /** First 8 chars only — full secret is shown once at creation. */
  secret_prefix: string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  last_attempt_at?: string;
  last_success_at?: string;
  consecutive_failures: number;
}

function webhookKey(id: string): string {
  return `tricognita:webhook:${id}`;
}
function tenantWebhooksKey(tenantId: string): string {
  return `tricognita:webhooks:tenant:${tenantId}`;
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

function newWebhookId(): string {
  return `wh-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

// 32-byte secret as 64-char hex string.
function newSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * isValidUrl — accepts only https URLs to prevent accidental plaintext
 * webhook delivery. Localhost / 127.0.0.1 / 169.254.x.x rejected to
 * close SSRF (a tenant should not be able to register a webhook that
 * targets our internal network).
 */
export function isValidWebhookUrl(raw: string): { ok: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Webhook target must be HTTPS" };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("169.254.") ||
    host.endsWith(".local")
  ) {
    return { ok: false, reason: "Internal / loopback hosts are not allowed" };
  }
  return { ok: true };
}

export function isValidEventType(t: string): t is WebhookEventType {
  return ALLOWED_EVENTS.has(t as WebhookEventType);
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createWebhook(args: {
  tenant_id: string;
  event_type: WebhookEventType;
  target_url: string;
  label: string;
  created_by: string;
}): Promise<{ subscription: WebhookSubscription; secret: string } | null> {
  const redis = getRedis();
  if (!redis) return null;
  const id = newWebhookId();
  const secret = newSecret();
  const now = new Date().toISOString();
  const subscription: WebhookSubscription = {
    id,
    tenant_id: args.tenant_id,
    event_type: args.event_type,
    target_url: args.target_url,
    label: args.label,
    secret_prefix: secret.slice(0, 8),
    enabled: true,
    created_by: args.created_by,
    created_at: now,
    consecutive_failures: 0,
  };
  try {
    // Store the full secret under a separate key for the dispatch loop's
    // future use. NEVER returned in the listing API.
    await redis.set(`${webhookKey(id)}:secret`, secret);
    await redis.set(webhookKey(id), JSON.stringify(subscription));
    await redis.zadd(tenantWebhooksKey(args.tenant_id), {
      score: Date.parse(now),
      member: id,
    });
    return { subscription, secret };
  } catch {
    return null;
  }
}

export async function getWebhook(id: string): Promise<WebhookSubscription | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get<string | object>(webhookKey(id));
    if (!raw) return null;
    if (typeof raw === "string")
      return JSON.parse(raw) as WebhookSubscription;
    return raw as WebhookSubscription;
  } catch {
    return null;
  }
}

export async function listWebhooks(
  tenantId: string,
): Promise<WebhookSubscription[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const ids = (await redis.zrange(tenantWebhooksKey(tenantId), 0, -1, {
      rev: true,
    })) as string[];
    if (!ids || ids.length === 0) return [];
    const records = await Promise.all(ids.map((i) => getWebhook(i)));
    return records.filter((r): r is WebhookSubscription => r !== null);
  } catch {
    return [];
  }
}

export async function toggleWebhook(
  id: string,
  enabled: boolean,
): Promise<WebhookSubscription | null> {
  const redis = getRedis();
  if (!redis) return null;
  const existing = await getWebhook(id);
  if (!existing) return null;
  existing.enabled = enabled;
  try {
    await redis.set(webhookKey(id), JSON.stringify(existing));
    return existing;
  } catch {
    return null;
  }
}

export async function deleteWebhook(
  id: string,
  tenantId: string,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.del(webhookKey(id));
    await redis.del(`${webhookKey(id)}:secret`);
    await redis.zrem(tenantWebhooksKey(tenantId), id);
    return true;
  } catch {
    return false;
  }
}

// ─── Signing (used by the future dispatch loop) ──────────────────────────────

/**
 * signPayload — produce the HMAC-SHA256 signature the dispatcher will set
 * on the X-Tricognita-Signature header. Customers verify with the secret
 * they saved at creation time.
 *
 * Header format: `t=<unix_ts>,v1=<hex_signature>` — modeled on Stripe's
 * webhook signature header so any customer who's integrated with Stripe
 * webhooks already has the verification pattern.
 */
export function signPayload(secret: string, body: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${body}`;
  const sig = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return `t=${ts},v1=${sig}`;
}
