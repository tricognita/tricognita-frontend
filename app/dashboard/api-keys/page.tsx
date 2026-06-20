"use client";

import { useState } from "react";
import useSWR from "swr";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { emitAuditEvent } from "@/lib/audit-events";
import { PageRestrictedGuard } from "../components/PageRestrictedGuard";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDangerous,
  EmptyState,
  HStack,
  PageShell,
  StatusDot,
  Table,
  TBody,
  TBodyEmpty,
  TD,
  TH,
  THead,
  TR,
} from "@/lib/ui";

interface APIKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function APIKeysPage() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewApiKeys");

  const { data, mutate, isLoading } = useSWR<{ keys: APIKey[] }>(
    swrKey(hasAccess, "/api/api-keys"),
    fetcher,
  );
  const keys = data?.keys ?? [];
  const activeCount = keys.filter((k) => !k.revoked).length;

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [err, setErr] = useState("");
  // Revoke confirmation — typed "REVOKE" gate. Production governance:
  // revoking an API key may break downstream automation; force a
  // deliberate confirm instead of a one-click.
  const [revokeTarget, setRevokeTarget] = useState<APIKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function generate() {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    setCreating(true);
    setErr("");
    const keyName = name.trim();
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setNewKey(j.key);
      setName("");
      mutate();
      // Audit: API key issued. Resource is the prefix (not the full key),
      // since the full key is never persisted on the audit row.
      void emitAuditEvent({
        type: "api_key.created",
        resource: j.id ?? j.prefix ?? keyName,
        metadata: { name: keyName, prefix: j.prefix },
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    const target = revokeTarget;
    setRevoking(true);
    try {
      await fetch(`/api/api-keys/${target.id}`, { method: "DELETE" });
      mutate();
      void emitAuditEvent({
        type: "api_key.revoked",
        resource: target.id,
        metadata: { name: target.name, prefix: target.prefix },
      });
    } finally {
      setRevoking(false);
      setRevokeTarget(null);
    }
  }

  if (!hasAccess) {
    return (
      <PageRestrictedGuard
        capability="viewApiKeys"
        title="API Key Management"
        description="Generate and revoke API keys for programmatic platform access."
        allowedRoles={["ADMIN"]}
        subtitle="API Keys"
      >
        {null}
      </PageRestrictedGuard>
    );
  }

  const meta = (
    <HStack gap="sm" align="center" wrap>
      <StatusDot
        intent={isLoading ? "info" : "success"}
        pulse={isLoading}
        size="sm"
        label={isLoading ? "Loading keys…" : `${activeCount} active ${activeCount === 1 ? "key" : "keys"}`}
      />
      <Badge intent="violet" variant="subtle" size="xs">ADMIN scope</Badge>
    </HStack>
  );

  return (
    <PageShell
      eyebrow="Administration · Credentials"
      title="API Keys"
      description="Generate and manage API keys for programmatic access. Keys are shown once at creation — store them in your secrets manager before dismissing."
      meta={meta}
      width="default"
      density="tight"
    >
      {newKey && (
        <Card variant="success" density="comfortable">
          <CardHeader
            title="Key generated — copy it now"
            eyebrow="One-time reveal"
            description="This is the only time we will display the full key. Store it in a secrets manager before dismissing."
            actions={
              <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
                Dismiss
              </Button>
            }
          />
          <HStack gap="sm" align="center" className="mt-2">
            <code className="flex-1 bg-[var(--ink-deep)] rounded px-3 py-2 text-xs font-mono text-[var(--matcha-200)] break-all border border-[var(--sage-soft)]">
              {newKey}
            </code>
            <Button
              variant="secondary"
              size="md"
              icon={<Copy size={12} />}
              onClick={() => navigator.clipboard.writeText(newKey)}
            >
              Copy
            </Button>
          </HStack>
        </Card>
      )}

      <Card variant="default" density="comfortable">
        <CardHeader
          eyebrow="Generate"
          title="Issue new API key"
          description="Give the key a descriptive name so its purpose is clear in the audit trail."
        />
        <HStack gap="sm" align="end" wrap>
          <div className="flex-1 min-w-[240px] space-y-1">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)]">
              Key name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generate()}
              placeholder="e.g. CI/CD pipeline"
              className="w-full bg-[var(--ink-deep)] border border-[var(--sage-soft)] rounded px-3 py-2 text-sm text-[var(--stone-100)] focus:outline-none focus:border-[var(--matcha-400)] focus:ring-1 focus:ring-[var(--matcha-400)]/30 transition"
            />
          </div>
          <Button
            variant="primary"
            size="md"
            loading={creating}
            icon={<Plus size={12} />}
            onClick={generate}
          >
            Generate
          </Button>
        </HStack>
        {err && <p className="text-xs text-[var(--ember-glow)] mt-3">{err}</p>}
      </Card>

      <Table density="comfortable">
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Key prefix</TH>
            <TH>Created</TH>
            <TH>Last used</TH>
            <TH>Status</TH>
            <TH align="right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {keys.length === 0 ? (
            <TBodyEmpty colSpan={6}>
              <EmptyState
                icon={<KeyRound size={20} className="text-[var(--matcha-300)]" />}
                title="No API keys issued"
                description="API keys let CI/CD pipelines, custom scanners, and external SIEMs talk to Tricognita programmatically. Each key is scoped, audited, and revocable from this page. Use the form above to generate your first key — it will be shown once."
              />
            </TBodyEmpty>
          ) : (
            keys.map((k) => (
              <TR key={k.id}>
                <TD>
                  <span className="font-semibold text-[var(--stone-100)]">{k.name}</span>
                </TD>
                <TD mono>{k.prefix}…</TD>
                <TD>{new Date(k.created_at).toLocaleDateString()}</TD>
                <TD>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}</TD>
                <TD>
                  <Badge intent={k.revoked ? "danger" : "success"} variant="subtle" size="sm">
                    {k.revoked ? "Revoked" : "Active"}
                  </Badge>
                </TD>
                <TD align="right">
                  {!k.revoked && (
                    <Button
                      variant="ghost"
                      size="xs"
                      icon={<Trash2 size={10} />}
                      onClick={() => setRevokeTarget(k)}
                      className="text-[var(--ember-glow)] hover:text-[var(--ember)]"
                    >
                      Revoke
                    </Button>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <ConfirmDangerous
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={confirmRevoke}
        loading={revoking}
        title="Revoke API key?"
        description={
          <>
            This will permanently revoke the API key{" "}
            <span className="font-mono text-[var(--stone-100)]">
              {revokeTarget?.name}
            </span>
            . Any CI/CD pipelines, custom scanners, or SIEM integrations using
            this key will stop working immediately. The action is recorded in
            the audit trail and cannot be undone.
          </>
        }
        detail={revokeTarget ? `${revokeTarget.prefix}… (${revokeTarget.id})` : undefined}
        confirmPhrase="REVOKE"
        confirmLabel="Revoke key"
      />
    </PageShell>
  );
}
