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
  createAlertRoute,
  deleteAlertRoute,
  fetchAlertRoutes,
  setAlertRouteEnabled,
  type AlertRouteRow,
} from "@/lib/api/admin";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * Alert routes: where findings are announced.
 *
 * A route announces findings at or above its minimum severity to a Slack or webhook
 * address. The address is shown as a host only: a webhook URL is a credential in
 * practice. This page changes configuration; it does not send a test message, so
 * it cannot say that delivery works, and it does not.
 */

const INPUT =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)] w-full";
const LABEL = "text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]";
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

function RouteRow({ route, onChanged }: { route: AlertRouteRow; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  return (
    <Card>
      <VStack gap="sm">
        <HStack gap="sm" justify="between" align="start" className="flex-wrap">
          <VStack gap="xs" className="min-w-0">
            <span className="text-[var(--text-sm)] font-medium text-[var(--fg)] break-words">{route.name}</span>
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)]">
              {route.routeType} · <span className="font-mono break-all">{route.destination}</span>
            </span>
          </VStack>
          <Badge intent={route.enabled ? "success" : "neutral"} size="xs">
            {route.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </HStack>
        <p className="text-[var(--text-xs)] text-[var(--fg)]">
          Announces findings of severity <strong>{route.minSeverity}</strong> and above.
          {route.createdAt && (
            <>
              {" "}
              Added <DateTime value={route.createdAt} variant="both" />.
            </>
          )}
        </p>
        <HStack gap="sm" className="flex-wrap">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void run(() => setAlertRouteEnabled(route.id, !route.enabled))}
          >
            {route.enabled ? "Disable" : "Enable"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </HStack>
        {error && (
          <p role="alert" className="text-[var(--text-xs)] text-[var(--fg)] break-words">
            {error}
          </p>
        )}
        <ConfirmDangerous
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Delete ${route.name}`}
          description="Findings will no longer be announced to this destination."
          confirmPhrase="DELETE"
          confirmLabel="Delete route"
          onConfirm={async () => {
            setConfirming(false);
            await run(() => deleteAlertRoute(route.id));
          }}
        />
      </VStack>
    </Card>
  );
}

function AddRoute({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"slack" | "webhook">("slack");
  const [url, setUrl] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("HIGH");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      await createAlertRoute({
        name: name.trim(),
        route_type: type,
        min_severity: severity,
        config: type === "slack" ? { webhook_url: url.trim() } : { url: url.trim() },
      });
      setMsg({ ok: true, text: "Route saved. No test message was sent." });
      setName("");
      setUrl("");
      onAdded();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <VStack gap="sm">
        <span className="text-[var(--text-sm)] font-medium text-[var(--fg)]">Add a route</span>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Name</span>
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Type</span>
          <select className={INPUT} value={type} onChange={(e) => setType(e.target.value as "slack" | "webhook")}>
            <option value="slack">Slack incoming webhook</option>
            <option value="webhook">Generic webhook</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Delivery address (https)</span>
          <input
            className={INPUT + " font-mono"}
            type="password"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="text-[10px] text-[var(--fg-subtle)]">
            It must be a public https address. It is shown back as a host only.
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Announce findings of at least</span>
          <select className={INPUT} value={severity} onChange={(e) => setSeverity(e.target.value as (typeof SEVERITIES)[number])}>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <HStack>
          <Button size="sm" disabled={busy || name.trim() === "" || !/^https:\/\//i.test(url.trim())} onClick={() => void submit()}>
            {busy ? "Saving…" : "Save route"}
          </Button>
        </HStack>
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className="text-[var(--text-xs)] text-[var(--fg)] break-words">
            {msg.text}
          </p>
        )}
      </VStack>
    </Card>
  );
}

export function AlertRoutesScreen() {
  const { role, isLoading: sessionLoading } = useSession();
  const routes = useSWR("admin:alert-routes", fetchAlertRoutes, { revalidateOnFocus: false, shouldRetryOnError: false });

  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "manageAlertRoutes")) {
    return <NotAuthorizedState subject="alert routes" askWho="an administrator" />;
  }

  return (
    <VStack gap="lg">
      <Section
        eyebrow="Destinations"
        title="Alert routes"
        description="Where Tricognita announces findings. Each route sends findings at or above its minimum severity."
        spacing="sm"
      >
        <VStack gap="sm">
          {routes.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : routes.error ? (
            <ErrorState
              title="We could not load your alert routes"
              description="The request did not complete. Nothing was changed."
              detail={routes.error instanceof Error ? routes.error.message : String(routes.error)}
              action={
                <Button variant="secondary" size="sm" onClick={() => void routes.mutate()}>
                  Try again
                </Button>
              }
            />
          ) : (routes.data ?? []).length === 0 ? (
            <EmptyState
              variant="bordered"
              title="No alert route configured"
              description="Without a route, findings are recorded in the product but nobody is told."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {(routes.data ?? []).map((r) => (
                <li key={r.id}>
                  <RouteRow route={r} onChanged={() => void routes.mutate()} />
                </li>
              ))}
            </ul>
          )}
          <AddRoute onAdded={() => void routes.mutate()} />
        </VStack>
      </Section>
    </VStack>
  );
}
