"use client";

import { useState } from "react";
import useSWR from "swr";
import { BellRing, Plus, Trash2 } from "lucide-react";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { emitAuditEvent } from "@/lib/audit-events";
import { PageRestrictedGuard } from "../components/PageRestrictedGuard";
import {
  Badge,
  BadgeIntent,
  Button,
  Card,
  CardHeader,
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

interface AlertRoute {
  id: string;
  name: string;
  channel: "slack" | "pagerduty" | "email" | "webhook";
  destination: string;
  severity_min: "critical" | "high" | "medium" | "low";
  enabled: boolean;
  created_at: string;
}

const CHANNELS = ["slack", "pagerduty", "email", "webhook"] as const;
const SEVERITIES = ["critical", "high", "medium", "low"] as const;

const SEV_INTENT: Record<AlertRoute["severity_min"], BadgeIntent> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

const EMPTY: Partial<AlertRoute> = {
  name: "",
  channel: "slack",
  destination: "",
  severity_min: "high",
  enabled: true,
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const INPUT_CLASS =
  "w-full bg-[var(--ink-deep)] border border-[var(--sage-soft)] rounded px-3 py-2 text-sm text-[var(--stone-100)] focus:outline-none focus:border-[var(--matcha-400)] focus:ring-1 focus:ring-[var(--matcha-400)]/30 transition";
const LABEL_CLASS =
  "block text-[10px] font-mono uppercase tracking-widest text-[var(--stone-500)] mb-1";

export default function AlertRoutesPage() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewAlertRoutes");

  const { data, mutate, isLoading } = useSWR<{ routes: AlertRoute[] }>(
    swrKey(hasAccess, "/api/alert-routes"),
    fetcher,
  );
  const routes = data?.routes ?? [];
  const enabledCount = routes.filter((r) => r.enabled).length;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<AlertRoute>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/alert-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json().catch(() => ({}));
      setForm(EMPTY);
      setShowForm(false);
      mutate();
      void emitAuditEvent({
        type: "alert_route.created",
        resource: created?.id ?? form.destination ?? form.name,
        metadata: {
          name: form.name,
          channel: form.channel,
          severity_min: form.severity_min,
        },
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const target = routes.find((r) => r.id === id);
    await fetch(`/api/alert-routes/${id}`, { method: "DELETE" });
    mutate();
    void emitAuditEvent({
      type: "alert_route.removed",
      resource: id,
      metadata: { name: target?.name, channel: target?.channel },
    });
  }

  async function toggle(route: AlertRoute) {
    const next = !route.enabled;
    await fetch(`/api/alert-routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    mutate();
    void emitAuditEvent({
      type: "alert_route.toggled",
      resource: route.id,
      metadata: { name: route.name, enabled: next, channel: route.channel },
    });
  }

  if (!hasAccess) {
    return (
      <PageRestrictedGuard
        capability="viewAlertRoutes"
        title="Alert Routing"
        description="Configure where security alerts are delivered."
        allowedRoles={["ADMIN", "SECOPS"]}
        subtitle="Alert Routes"
      >
        {null}
      </PageRestrictedGuard>
    );
  }

  const meta = (
    <HStack gap="sm" align="center" wrap>
      <StatusDot
        intent={isLoading ? "info" : enabledCount > 0 ? "success" : "warning"}
        pulse={isLoading}
        size="sm"
        label={
          isLoading
            ? "Loading routes…"
            : `${enabledCount} of ${routes.length} enabled`
        }
      />
      <Badge intent="violet" variant="subtle" size="xs">SECOPS scope</Badge>
    </HStack>
  );

  return (
    <PageShell
      eyebrow="Operations · Alerts"
      title="Alert Routes"
      description="Configure where security alerts are delivered. Each route filters by minimum severity before fanning out to its channel."
      meta={meta}
      actions={
        !showForm && (
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={12} />}
            onClick={() => setShowForm(true)}
          >
            New route
          </Button>
        )
      }
      width="default"
      density="tight"
    >
      {showForm && (
        <Card variant="elevated" density="comfortable">
          <CardHeader
            eyebrow="Configure"
            title="Add alert route"
            description="Routes deliver alerts to a single destination above a chosen severity threshold."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>Name</label>
              <input
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Slack Critical Alerts"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Channel</label>
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    channel: e.target.value as AlertRoute["channel"],
                  }))
                }
                className={INPUT_CLASS}
              >
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>
                Destination (webhook URL / email / PD key)
              </label>
              <input
                value={form.destination ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination: e.target.value }))
                }
                placeholder="https://hooks.slack.com/..."
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Minimum severity</label>
              <select
                value={form.severity_min}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    severity_min: e.target.value as AlertRoute["severity_min"],
                  }))
                }
                className={INPUT_CLASS}
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {err && (
            <p className="text-xs text-[var(--ember-glow)] mt-3">{err}</p>
          )}
          <HStack gap="sm" className="mt-4">
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={create}
            >
              Create route
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY);
                setErr("");
              }}
            >
              Cancel
            </Button>
          </HStack>
        </Card>
      )}

      <Table density="comfortable">
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Channel</TH>
            <TH>Destination</TH>
            <TH>Min severity</TH>
            <TH>Enabled</TH>
            <TH align="right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {routes.length === 0 ? (
            <TBodyEmpty colSpan={6}>
              <EmptyState
                icon={<BellRing size={20} />}
                title="No alert routes configured"
                description="Add a route to start fanning out critical findings to Slack, PagerDuty, email, or a webhook."
              />
            </TBodyEmpty>
          ) : (
            routes.map((r) => (
              <TR key={r.id}>
                <TD>
                  <span className="font-semibold text-[var(--stone-100)]">
                    {r.name}
                  </span>
                </TD>
                <TD>
                  <Badge intent="info" variant="outline" size="xs" mono>
                    {r.channel}
                  </Badge>
                </TD>
                <TD mono truncate className="max-w-[260px]">
                  {r.destination}
                </TD>
                <TD>
                  <Badge
                    intent={SEV_INTENT[r.severity_min]}
                    variant="subtle"
                    size="sm"
                  >
                    {r.severity_min}
                  </Badge>
                </TD>
                <TD>
                  <button
                    type="button"
                    onClick={() => toggle(r)}
                    aria-pressed={r.enabled}
                    aria-label={r.enabled ? "Disable route" : "Enable route"}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/50 ${
                      r.enabled
                        ? "bg-[var(--matcha-600)]"
                        : "bg-[var(--stone-700)]"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform mt-0.5 ${
                        r.enabled ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </TD>
                <TD align="right">
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<Trash2 size={10} />}
                    onClick={() => remove(r.id)}
                    className="text-[var(--ember-glow)] hover:text-[var(--ember)]"
                  >
                    Remove
                  </Button>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </PageShell>
  );
}
