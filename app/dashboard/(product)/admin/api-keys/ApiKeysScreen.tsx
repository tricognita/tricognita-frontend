"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AuthorizingState,
  Badge,
  Button,
  Card,
  ConfirmDangerous,
  DateTime,
  EmptyState,
  ErrorState,
  HStack,
  NotAuthorizedState,
  Section,
  Skeleton,
  VStack,
} from "@/lib/ui";
import {
  apiKeyStatus,
  createApiKey,
  fetchApiKeys,
  revokeApiKey,
  type ApiKeyRow,
  type ApiKeyScope,
} from "@/lib/api/admin";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * API keys: read-only access for your own systems.
 *
 * A key belongs to this organisation and can only read: the scopes below are the whole of what it can do, and it
 * can call only the /api/v1 read endpoints listed on this page. The full value is shown once, here, when the key is
 * created. Tricognita keeps only a one-way hash, so nobody (including us) can show it again; lose it and issue a
 * new one. Revoked keys stop working at once and leave this list.
 */

const SCOPES: Array<{ id: ApiKeyScope; label: string; allows: string }> = [
  { id: "scan:read", label: "Read assurance data", allows: "controls, verification runs, cloud accounts and drift" },
  { id: "audit:read", label: "Read the audit record", allows: "audit trail events and reports" },
];
const EXPIRIES = [
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
  { days: 0, label: "Never expires" },
];
const ENDPOINTS: Array<[string, ApiKeyScope, string]> = [
  ["/api/v1/controls", "scan:read", "Controls and their current state"],
  ["/api/v1/verification-runs", "scan:read", "Verification runs"],
  ["/api/v1/cloud-accounts", "scan:read", "Connected cloud accounts"],
  ["/api/v1/drift", "scan:read", "Change since the previous run"],
  ["/api/v1/audit/events", "audit:read", "Audit trail (filters: actor, action, from, to)"],
  ["/api/v1/reports", "audit:read", "Generated reports"],
];

const INPUT =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)] w-full";
const LABEL = "text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]";

function KeyRow({ k, onChanged }: { k: ApiKeyRow; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = apiKeyStatus(k);
  return (
    <Card>
      <VStack gap="sm">
        <HStack className="flex-wrap justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[var(--text-sm)] text-[var(--fg)] break-words">{k.name}</p>
            <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              <code>{k.prefix}…</code>
            </p>
          </div>
          <HStack className="gap-2">
            {status === "active" && <Badge intent="success">Active</Badge>}
            {status === "expiring" && <Badge intent="warning">Expires soon</Badge>}
            {status === "expired" && <Badge intent="danger">Expired, no longer works</Badge>}
            <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
              Revoke
            </Button>
          </HStack>
        </HStack>
        <dl className="grid gap-x-6 gap-y-1 text-[var(--text-xs)] text-[var(--fg-muted)] sm:grid-cols-2">
          <div>
            <dt className="inline">Can read: </dt>
            <dd className="inline">{k.scopes.length ? k.scopes.join(", ") : "nothing"}</dd>
          </div>
          <div>
            <dt className="inline">Created: </dt>
            <dd className="inline">
              <DateTime value={k.createdAt} />
              {k.createdBy ? ` by ${k.createdBy}` : ""}
            </dd>
          </div>
          <div>
            <dt className="inline">Last used: </dt>
            <dd className="inline">{k.lastUsedAt ? <DateTime value={k.lastUsedAt} variant="both" /> : "Never used"}</dd>
          </div>
          <div>
            <dt className="inline">Expires: </dt>
            <dd className="inline">{k.expiresAt ? <DateTime value={k.expiresAt} /> : "Never"}</dd>
          </div>
        </dl>
        {error && (
          <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
            Could not revoke this key: {error} It is still active.
          </p>
        )}
        <ConfirmDangerous
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Revoke ${k.name}`}
          description="Anything using this key stops working immediately. This cannot be undone; issue a new key if it is needed again."
          confirmPhrase="REVOKE"
          confirmLabel="Revoke key"
          onConfirm={async () => {
            setConfirming(false);
            setError(null);
            try {
              await revokeApiKey(k.id);
              onChanged();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </VStack>
    </Card>
  );
}

/** The one place the secret is shown. It lives in this component's state only and is gone when dismissed. */
function IssuedKey({ name, secret, onDone }: { name: string; secret: string; onDone: () => void }) {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied("yes");
    } catch {
      setCopied("no");
    }
  }
  return (
    <Card>
      <VStack gap="sm">
        <p role="status" className="text-[var(--text-sm)] text-[var(--fg)]">
          Key &ldquo;{name}&rdquo; created. Copy it now: this is the only time it is shown. Tricognita stores only a one-way hash,
          so it cannot be shown again.
        </p>
        <input
          readOnly
          aria-label="New API key (shown once)"
          className={`${INPUT} font-mono`}
          value={secret}
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
          spellCheck={false}
        />
        <HStack className="gap-2">
          <Button variant="secondary" size="sm" onClick={() => void copy()}>
            Copy key
          </Button>
          <Button size="sm" onClick={onDone}>
            I have stored it safely
          </Button>
        </HStack>
        {copied === "yes" && <p className="text-[var(--text-xs)] text-[var(--fg-muted)]">Copied to your clipboard.</p>}
        {copied === "no" && (
          <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
            Your browser did not allow copying. Select the key above and copy it by hand.
          </p>
        )}
      </VStack>
    </Card>
  );
}

function CreateKey({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["scan:read"]);
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ name: string; secret: string } | null>(null);

  const problem = !name.trim() ? "Give the key a name." : name.trim().length > 100 ? "The name must be at most 100 characters." : scopes.length === 0 ? "Choose at least one thing the key may read." : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problem) return;
    setBusy(true);
    setError(null);
    try {
      const made = await createApiKey({ name: name.trim(), scopes, expiry_days: days });
      setIssued({ name: name.trim(), secret: made.key });
      setName("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (issued) return <IssuedKey name={issued.name} secret={issued.secret} onDone={() => setIssued(null)} />;
  return (
    <Card>
      <form onSubmit={(e) => void submit(e)} aria-label="Create an API key" className="flex flex-col gap-3">
        <p className="text-[var(--text-sm)] text-[var(--fg)]">Create a key</p>
        <label className="block">
          <span className={LABEL}>Name (what will use it)</span>
          <input name="name" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={120} />
        </label>
        <fieldset className="flex flex-col gap-1">
          <legend className={LABEL}>It may read</legend>
          {SCOPES.map((s) => (
            <label key={s.id} className="flex items-start gap-2 text-[var(--text-sm)] text-[var(--fg)]">
              <input
                type="checkbox"
                name={`scope-${s.id}`}
                className="mt-1"
                checked={scopes.includes(s.id)}
                onChange={(e) => setScopes((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))}
              />
              <span>
                {s.label} <span className="text-[var(--fg-muted)]">({s.allows})</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="block max-w-xs">
          <span className={LABEL}>Expires</span>
          <select name="expiry" className={INPUT} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {EXPIRIES.map((x) => (
              <option key={x.days} value={x.days}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[var(--text-xs)] text-[var(--fg-subtle)]">
          A key can only read; it can never change anything, and it cannot read another organisation&rsquo;s data.
        </p>
        <HStack className="items-center gap-2">
          <Button type="submit" size="sm" disabled={busy || problem !== null}>
            {busy ? "Creating…" : "Create key"}
          </Button>
          {problem && name !== "" && <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">{problem}</span>}
        </HStack>
        {error && (
          <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)]">
            The key was not created: {error}
          </p>
        )}
      </form>
    </Card>
  );
}

export function ApiKeysScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const keys = useSWR("admin:api-keys", fetchApiKeys, { revalidateOnFocus: false, shouldRetryOnError: false });

  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "manageApiKeys")) {
    return <NotAuthorizedState subject="API keys" askWho="an administrator" />;
  }

  return (
    <VStack gap="lg">
      <Section
        eyebrow="Integrations"
        title="API keys"
        description="Read-only keys that let your own systems read your assurance data. Each key belongs to this organisation."
        spacing="sm"
      >
        <VStack gap="sm">
          {keys.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : keys.error ? (
            <ErrorState
              title="We could not load your API keys"
              description="The request did not complete. Nothing was changed."
              detail={keys.error instanceof Error ? keys.error.message : String(keys.error)}
              action={
                <Button variant="secondary" size="sm" onClick={() => void keys.mutate()}>
                  Try again
                </Button>
              }
            />
          ) : (keys.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              title="No API key has been issued"
              description="Create one below. Revoked keys stop working at once and are not listed."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {(keys.data ?? []).map((k) => (
                <li key={k.id}>
                  <KeyRow k={k} onChanged={() => void keys.mutate()} />
                </li>
              ))}
            </ul>
          )}
          <CreateKey onCreated={() => void keys.mutate()} />
        </VStack>
      </Section>

      <Section eyebrow="Using a key" title="What a key can call" description="Send the key as Authorization: Bearer <key> (or X-API-Key). Only GET, up to 60 requests a minute per key." spacing="sm">
        <Card>
          <ul className="flex flex-col gap-1 text-[var(--text-xs)] text-[var(--fg-muted)]">
            {ENDPOINTS.map(([path, scope, what]) => (
              <li key={path}>
                <code className="text-[var(--fg)]">{path}</code> · needs <code>{scope}</code> · {what}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[var(--text-xs)] text-[var(--fg-subtle)] max-w-[75ch]">
            A refused key gets a plain reason: unknown or malformed keys are always &ldquo;invalid_api_key&rdquo;; revoked and expired keys say so; a
            missing scope is &ldquo;insufficient_scope&rdquo;; over the limit is &ldquo;rate_limit_exceeded&rdquo; with a Retry-After. Creating, revoking
            and first use of a key are recorded in your audit trail.
          </p>
        </Card>
      </Section>
    </VStack>
  );
}
