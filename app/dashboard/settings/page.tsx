"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { HealingMode } from "../components/aria/HealingMode";
import { useHealingMode } from "@/lib/aria-hooks";
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
  HStack,
  PageShell,
  VStack,
} from "@/lib/ui";

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
};

interface ARIASettings {
  risk_threshold: number;
  blast_radius_cap: number;
}

interface ScanSchedule {
  finops_scan_cron: string;
  vuln_scan_cron: string;
  compliance_scan_cron: string;
  last_finops_run: string;
  last_vuln_run: string;
  last_compliance_run: string;
}

interface JITKeyStatus {
  key_id: string;
  created_at: string;
  expires_at: string;
  last_used: string;
  status: "active" | "expiring_soon" | "expired";
}

const KEY_STATUS_INTENT: Record<JITKeyStatus["status"], BadgeIntent> = {
  active: "success",
  expiring_soon: "warning",
  expired: "danger",
};

interface NotifThresholds {
  critical_risk_min: number;
  alert_on_autonomous_action: boolean;
  alert_on_jit_request: boolean;
  alert_on_finops_finding: boolean;
}

const DEFAULT_NOTIF: NotifThresholds = {
  critical_risk_min: 0.85,
  alert_on_autonomous_action: true,
  alert_on_jit_request: true,
  alert_on_finops_finding: false,
};

const LS_KEY = "tricognita_notif_thresholds";

function loadNotifFromLS(): NotifThresholds {
  if (typeof window === "undefined") return DEFAULT_NOTIF;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...DEFAULT_NOTIF, ...JSON.parse(raw) } : DEFAULT_NOTIF;
  } catch {
    return DEFAULT_NOTIF;
  }
}

function saveNotifToLS(t: NotifThresholds) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(t));
  }
}

const INPUT_CLASS =
  "w-full px-3 py-2 rounded bg-[var(--ink-deep)] border border-[var(--sage-soft)] text-[var(--stone-100)] text-sm focus:outline-none focus:border-[var(--matcha-400)] focus:ring-1 focus:ring-[var(--matcha-400)]/30 transition";
const LABEL_CLASS = "block text-xs text-[var(--stone-500)] mb-1";

export default function SettingsPage() {
  const { role } = useSession();
  const isAdmin = canDo(role, "manageSettings");
  const { mode, mutateMode, isLoading } = useHealingMode();

  const { data: actionsData } = useSWR<{ actions?: unknown[] } | unknown[]>(
    swrKey(isAdmin, "/api/aria/actions?limit=100"),
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const { data: settingsData } = useSWR<ARIASettings>(
    swrKey(isAdmin, "/api/aria/config/settings"),
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const scanSchedule = settingsData as unknown as ScanSchedule | undefined;
  const jitKeys = settingsData as unknown as JITKeyStatus[] | undefined;

  const pendingCount = (() => {
    if (!actionsData) return 0;
    const arr = Array.isArray(actionsData)
      ? actionsData
      : (actionsData as { actions?: unknown[] }).actions ?? [];
    return (arr as Array<{ status: string }>).filter(
      (a) => a.status === "pending_approval",
    ).length;
  })();

  const [ariaSettings, setARIASettings] = useState<ARIASettings>({
    risk_threshold: settingsData?.risk_threshold ?? 0.7,
    blast_radius_cap: settingsData?.blast_radius_cap ?? 10,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    if (settingsData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setARIASettings({
        risk_threshold: settingsData.risk_threshold,
        blast_radius_cap: settingsData.blast_radius_cap,
      });
    }
  }, [settingsData]);

  async function saveARIASettings() {
    await fetch("/api/aria/config/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ariaSettings),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
    void emitAuditEvent({
      type: "settings.aria_threshold_changed",
      resource: "aria.config",
      metadata: {
        risk_threshold: ariaSettings.risk_threshold,
        blast_radius_cap: ariaSettings.blast_radius_cap,
      },
    });
  }

  const [notif, setNotif] = useState<NotifThresholds>(() => loadNotifFromLS());

  function updateNotif<K extends keyof NotifThresholds>(
    key: K,
    value: NotifThresholds[K],
  ) {
    const updated = { ...notif, [key]: value };
    setNotif(updated);
    saveNotifToLS(updated);
  }

  if (!isAdmin) {
    return (
      <PageRestrictedGuard
        capability="manageSettings"
        title="Security Automation Settings"
        description="Configure automation policies, scan schedules, and platform integrations."
        allowedRoles={["ADMIN"]}
        subtitle="Settings"
      >
        {null}
      </PageRestrictedGuard>
    );
  }

  return (
    <PageShell
      eyebrow="Administration · Platform"
      title="Platform Settings"
      description="Global ARIA configuration, scan schedules, notification thresholds, and secret rotation."
      width="narrow"
    >
      <AccountSection />

      {/* Healing Mode */}
      <Card variant="default" density="spacious">
        <CardHeader
          title="ARIA Healing Mode"
          description="Control whether ARIA executes remediation automatically or requires human approval."
        />
        <HealingMode
          mode={mode ?? "MANUAL_APPROVAL"}
          pendingCount={pendingCount}
          isLoading={isLoading}
          onChange={async (nextMode) => {
            await mutateMode(nextMode);
            void emitAuditEvent({
              type: "settings.healing_mode_changed",
              resource: "aria.healing_mode",
              metadata: { from: mode ?? null, to: nextMode },
            });
          }}
        />
        <p className="text-xs text-[var(--stone-500)] mt-4">
          AUTONOMOUS mode executes actions without confirmation. Use only in
          isolated environments. Current:{" "}
          <span
            className={
              mode === "AUTONOMOUS"
                ? "text-[var(--ember-glow)]"
                : "text-[var(--stone-400)]"
            }
          >
            {mode ?? "—"}
          </span>
        </p>
      </Card>

      {/* ARIA Risk Parameters */}
      <Card variant="default" density="spacious">
        <CardHeader
          title="ARIA Risk Parameters"
          description="Thresholds that gate ARIA's anomaly detection and healing blast radius."
        />
        <VStack gap="lg">
          <div>
            <HStack justify="between" align="center" className="mb-2">
              <label className="text-xs text-[var(--stone-400)] font-semibold uppercase tracking-wide">
                Risk score threshold
              </label>
              <span className="text-sm font-bold text-[var(--stone-100)] tabular-nums">
                {ariaSettings.risk_threshold.toFixed(2)}
              </span>
            </HStack>
            <input
              type="range"
              min={0.3}
              max={0.99}
              step={0.01}
              value={ariaSettings.risk_threshold}
              onChange={(e) =>
                setARIASettings((s) => ({
                  ...s,
                  risk_threshold: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-[var(--matcha-500)] h-1.5 rounded-full bg-[var(--ink-deep)] appearance-none cursor-pointer"
              aria-label="Risk score threshold"
            />
            <HStack justify="between" className="text-[10px] text-[var(--stone-600)] mt-1">
              <span>0.30 — sensitive</span>
              <span>0.99 — critical only</span>
            </HStack>
            <p className="text-xs text-[var(--stone-500)] mt-2">
              Predictions above this score trigger ARIA healing pipeline.
            </p>
          </div>

          <div>
            <HStack justify="between" align="center" className="mb-2">
              <label className="text-xs text-[var(--stone-400)] font-semibold uppercase tracking-wide">
                Blast radius cap
              </label>
              <span className="text-sm font-bold text-[var(--stone-100)] tabular-nums">
                {ariaSettings.blast_radius_cap} actions
              </span>
            </HStack>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={ariaSettings.blast_radius_cap}
              onChange={(e) =>
                setARIASettings((s) => ({
                  ...s,
                  blast_radius_cap: parseInt(e.target.value, 10),
                }))
              }
              className="w-full accent-[var(--matcha-500)] h-1.5 rounded-full bg-[var(--ink-deep)] appearance-none cursor-pointer"
              aria-label="Blast radius cap"
            />
            <HStack justify="between" className="text-[10px] text-[var(--stone-600)] mt-1">
              <span>1 — conservative</span>
              <span>50 — aggressive</span>
            </HStack>
            <p className="text-xs text-[var(--stone-500)] mt-2">
              Maximum number of remediation actions ARIA may execute per healing cycle.
            </p>
          </div>

          <Button variant="primary" size="md" onClick={saveARIASettings}>
            {settingsSaved ? "✓ Saved" : "Save ARIA settings"}
          </Button>
        </VStack>
      </Card>

      {/* Notification thresholds */}
      <Card variant="default" density="spacious">
        <CardHeader
          title="Notification Thresholds"
          description="Configure when the notification center surfaces alerts. Stored locally."
        />
        <VStack gap="md">
          <div>
            <HStack justify="between" align="center" className="mb-2">
              <label className="text-xs text-[var(--stone-400)] font-semibold uppercase tracking-wide">
                Critical risk minimum
              </label>
              <span className="text-sm font-bold text-[var(--stone-100)] tabular-nums">
                {notif.critical_risk_min.toFixed(2)}
              </span>
            </HStack>
            <input
              type="range"
              min={0.5}
              max={0.99}
              step={0.01}
              value={notif.critical_risk_min}
              onChange={(e) =>
                updateNotif("critical_risk_min", parseFloat(e.target.value))
              }
              className="w-full accent-[var(--ember)] h-1.5 rounded-full bg-[var(--ink-deep)] appearance-none cursor-pointer"
              aria-label="Critical risk notification threshold"
            />
            <p className="text-xs text-[var(--stone-500)] mt-2">
              Incidents above this score show as critical toasts in the notification center.
            </p>
          </div>

          {(
            [
              ["alert_on_autonomous_action", "Alert on autonomous ARIA actions"],
              ["alert_on_jit_request", "Alert on new JIT access requests"],
              ["alert_on_finops_finding", "Alert on FinOps zombie findings"],
            ] as [keyof NotifThresholds, string][]
          ).map(([key, label]) => (
            <HStack key={key} justify="between" align="center">
              <label
                className="text-sm text-[var(--stone-300)] cursor-pointer"
                htmlFor={`notif-${key}`}
              >
                {label}
              </label>
              <button
                id={`notif-${key}`}
                type="button"
                role="switch"
                aria-checked={notif[key] as boolean}
                onClick={() => updateNotif(key, !(notif[key] as boolean))}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/50 ${
                  notif[key]
                    ? "bg-[var(--matcha-600)] border-[var(--matcha-500)]"
                    : "bg-[var(--stone-700)] border-[var(--stone-600)]"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 mt-0.5 rounded-full bg-white shadow transition-transform ${
                    notif[key] ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </HStack>
          ))}
        </VStack>
      </Card>

      {/* Scan schedules */}
      <Card variant="default" density="spacious">
        <CardHeader
          title="Scan Schedules"
          description="ARIA-driven automated scan timing. Configured via cron in the Go backend."
        />
        {!scanSchedule ? (
          <div className="animate-pulse text-[var(--stone-500)] text-sm">
            Loading schedule…
          </div>
        ) : (
          <VStack gap="sm" divide>
            {[
              {
                label: "FinOps Scan",
                cron: scanSchedule.finops_scan_cron,
                last: scanSchedule.last_finops_run,
              },
              {
                label: "Vulnerability Scan",
                cron: scanSchedule.vuln_scan_cron,
                last: scanSchedule.last_vuln_run,
              },
              {
                label: "Compliance Scan",
                cron: scanSchedule.compliance_scan_cron,
                last: scanSchedule.last_compliance_run,
              },
            ].map(({ label, cron, last }) => (
              <HStack key={label} justify="between" align="center">
                <div>
                  <p className="text-sm text-[var(--stone-200)]">{label}</p>
                  <p className="text-[10px] font-mono text-[var(--stone-600)]">
                    {cron ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--stone-500)]">Last run</p>
                  <p className="text-xs text-[var(--stone-400)]">
                    {last ? new Date(last).toLocaleString() : "Never"}
                  </p>
                </div>
              </HStack>
            ))}
          </VStack>
        )}
        <p className="text-xs text-[var(--stone-600)] mt-4">
          To modify schedules, update the cron configuration in the Go backend deployment manifest.
        </p>
      </Card>

      {/* JIT / API key status */}
      <Card variant="default" density="spacious">
        <CardHeader
          title="API Key & JIT Secret Status"
          description="Sentinel JIT tokens and API key rotation hygiene."
        />
        {!jitKeys || !Array.isArray(jitKeys) ? (
          <Card variant="ghost" density="comfortable" className="bg-[var(--moss)] border-[var(--sage-soft)]">
            <p className="text-xs text-[var(--stone-500)]">
              JIT secret health is derived from{" "}
              <code className="text-[var(--stone-300)]">SENTINEL_JIT_SECRET</code> env var.
              Configure secret rotation in your deployment pipeline.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "SENTINEL_JIT_SECRET", note: "≥32 bytes required" },
                { label: "SENTINEL_API_URL", note: "Go backend URL" },
              ].map(({ label, note }) => (
                <div
                  key={label}
                  className="rounded border border-[var(--sage-soft)] bg-[var(--ink-deep)] px-3 py-2"
                >
                  <p className="text-xs font-mono text-[var(--stone-300)]">
                    {label}
                  </p>
                  <p className="text-[10px] text-[var(--stone-600)] mt-0.5">
                    {note}
                  </p>
                  <p className="text-[10px] text-[var(--matcha-300)] mt-1">
                    ● Configured via environment
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <VStack gap="sm" divide>
            {(jitKeys as JITKeyStatus[]).map((k) => (
              <HStack key={k.key_id} justify="between" align="center">
                <div>
                  <p className="text-xs font-mono text-[var(--stone-300)]">
                    {k.key_id}
                  </p>
                  <p className="text-[10px] text-[var(--stone-600)]">
                    Created {new Date(k.created_at).toLocaleDateString()} ·{" "}
                    Last used {new Date(k.last_used).toLocaleDateString()}
                  </p>
                </div>
                <HStack gap="sm" align="center">
                  <span className="text-[10px] text-[var(--stone-600)]">
                    Expires {new Date(k.expires_at).toLocaleDateString()}
                  </span>
                  <Badge intent={KEY_STATUS_INTENT[k.status]} variant="subtle" size="sm">
                    {k.status.replace("_", " ")}
                  </Badge>
                </HStack>
              </HStack>
            ))}
          </VStack>
        )}
      </Card>
    </PageShell>
  );
}

// ─── Account Section ──────────────────────────────────────────────────────────

function AccountSection() {
  const router = useRouter();
  const { data: me, mutate: mutateMe } = useSWR<{
    authenticated: boolean;
    email: string;
    role: string;
    mfaEnabled: boolean;
  }>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [pwError, setPwError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [mfaSetup, setMfaSetup] = useState<{
    secret: string;
    uri: string;
    qrDataUrl?: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);

  async function startMFASetup() {
    setMfaLoading(true);
    setMfaError("");
    try {
      const res = await fetch("/api/auth/mfa");
      if (!res.ok) throw new Error("Failed to start MFA setup");
      const data = await res.json();
      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(data.uri);
      setMfaSetup({ ...data, qrDataUrl });
    } catch {
      setMfaError("Network error starting MFA setup.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function verifyAndEnableMFA(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaSetup) return;
    setMfaLoading(true);
    setMfaError("");
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enable",
          secret: mfaSetup.secret,
          code: mfaCode,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setMfaError(d.error || "Invalid code");
        return;
      }
      await mutateMe();
      setMfaSetup(null);
      setMfaCode("");
    } catch {
      setMfaError("Network error.");
    } finally {
      setMfaLoading(false);
    }
  }

  async function disableMFA() {
    if (
      !confirm(
        "Are you sure you want to disable MFA? This reduces your account security.",
      )
    )
      return;
    setMfaLoading(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      if (res.ok) {
        await mutateMe();
      }
    } finally {
      setMfaLoading(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    if (pwForm.next.length < 8) {
      setPwError("New password must be ≥8 characters.");
      return;
    }
    setPwStatus("loading");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: pwForm.current, next: pwForm.next }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPwError(d.message ?? d.error ?? "Failed.");
        setPwStatus("error");
      } else {
        setPwStatus("ok");
        setPwForm({ current: "", next: "", confirm: "" });
        setTimeout(() => setPwStatus("idle"), 3000);
      }
    } catch {
      setPwStatus("error");
      setPwError("Network error.");
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/auth/account", { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setDeleteError(d.message ?? d.error ?? "Failed to delete account.");
        return;
      }
      router.push("/login?deleted=1");
    } catch {
      setDeleteError("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card variant="default" density="spacious">
      <CardHeader
        title="My Account"
        description="Manage your profile, password, and account deletion."
      />

      <VStack gap="xl">
        {/* Profile info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Email", value: me?.email ?? "—" },
            { label: "Role", value: me?.role ?? "—" },
            {
              label: "MFA Status",
              value: me?.mfaEnabled ? "Enabled" : "Disabled",
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg bg-[var(--ink-deep)] border border-[var(--sage-soft)] px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-widest text-[var(--stone-600)]">
                {label}
              </p>
              <p
                className={`text-sm mt-1 font-mono truncate ${
                  label === "MFA Status"
                    ? me?.mfaEnabled
                      ? "text-[var(--matcha-300)]"
                      : "text-[var(--amber-clay)]"
                    : "text-[var(--stone-200)]"
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* MFA Management */}
        <div>
          <p className="text-xs font-semibold text-[var(--stone-300)] mb-4 border-b border-[var(--sage-soft)] pb-2">
            Multi-Factor Authentication (MFA)
          </p>
          {me?.mfaEnabled ? (
            <div>
              <p className="text-sm text-[var(--stone-400)] mb-4">
                Your account is secured with an authenticator app.
              </p>
              <Button
                variant="danger"
                size="md"
                loading={mfaLoading}
                onClick={disableMFA}
              >
                Disable MFA
              </Button>
            </div>
          ) : mfaSetup ? (
            <form
              onSubmit={verifyAndEnableMFA}
              className="space-y-4 max-w-sm rounded-lg border border-[var(--sage-soft)] bg-[var(--moss)] p-4"
            >
              <p className="text-sm text-[var(--stone-300)]">
                1. Scan this QR code with your authenticator app.
              </p>
              {mfaSetup.qrDataUrl && (
                <div className="bg-white p-2 rounded w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mfaSetup.qrDataUrl}
                    alt="MFA QR Code"
                    className="w-32 h-32"
                  />
                </div>
              )}
              <p className="text-[10px] text-[var(--stone-500)] font-mono break-all">
                Secret: {mfaSetup.secret}
              </p>

              <div className="pt-2">
                <label htmlFor="mfaCode" className={LABEL_CLASS}>
                  2. Enter the 6-digit code
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[var(--ink-deep)] border border-[var(--sage-soft)] text-[var(--stone-100)] text-sm font-mono tracking-widest text-center focus:outline-none focus:border-[var(--matcha-400)]"
                  placeholder="000000"
                />
              </div>

              {mfaError && (
                <p className="text-[var(--ember-glow)] text-xs">{mfaError}</p>
              )}

              <HStack gap="sm">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={mfaLoading}
                  disabled={mfaCode.length !== 6}
                  className="flex-1"
                >
                  Verify & enable
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setMfaSetup(null)}
                >
                  Cancel
                </Button>
              </HStack>
            </form>
          ) : (
            <div>
              <p className="text-sm text-[var(--stone-400)] mb-4">
                Protect your account with a TOTP authenticator app (e.g. Google
                Authenticator, Authy).
              </p>
              <Button
                variant="primary"
                size="md"
                loading={mfaLoading}
                onClick={startMFASetup}
              >
                Setup MFA
              </Button>
            </div>
          )}
        </div>

        {/* Change password */}
        <div>
          <p className="text-xs font-semibold text-[var(--stone-300)] mb-4 border-b border-[var(--sage-soft)] pb-2">
            Change Password
          </p>
          <form onSubmit={changePassword} className="space-y-3 max-w-sm">
            {(
              [
                {
                  id: "pw-current",
                  label: "Current password",
                  field: "current",
                  auto: "current-password",
                },
                {
                  id: "pw-next",
                  label: "New password",
                  field: "next",
                  auto: "new-password",
                },
                {
                  id: "pw-confirm",
                  label: "Confirm new",
                  field: "confirm",
                  auto: "new-password",
                },
              ] as {
                id: string;
                label: string;
                field: "current" | "next" | "confirm";
                auto: string;
              }[]
            ).map(({ id, label, field, auto }) => (
              <div key={field}>
                <label htmlFor={id} className={LABEL_CLASS}>
                  {label}
                </label>
                <input
                  id={id}
                  type="password"
                  autoComplete={auto}
                  required
                  value={pwForm[field]}
                  onChange={(e) =>
                    setPwForm((p) => ({ ...p, [field]: e.target.value }))
                  }
                  className={INPUT_CLASS}
                />
              </div>
            ))}
            {pwError && (
              <p className="text-[var(--ember-glow)] text-xs">{pwError}</p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={pwStatus === "loading"}
            >
              {pwStatus === "ok" ? "✓ Password changed" : "Update password"}
            </Button>
          </form>
        </div>

        {/* Danger zone */}
        <Card variant="danger" density="comfortable">
          <HStack gap="sm" align="center" className="mb-1">
            <AlertTriangle
              size={14}
              className="text-[var(--ember-glow)] shrink-0"
            />
            <p className="text-sm font-semibold text-[var(--ember-glow)]">
              Danger Zone
            </p>
          </HStack>
          <p className="text-xs text-[var(--stone-500)] mb-4">
            Permanently delete your account. This cannot be undone.
          </p>
          <Button
            variant="danger"
            size="md"
            onClick={() => {
              setDeleteConfirm(true);
              setDeleteTyped("");
              setDeleteError("");
            }}
          >
            Delete my account
          </Button>
        </Card>
      </VStack>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <Card
            variant="elevated"
            density="spacious"
            className="w-full max-w-md border-[var(--ember)]/60 shadow-2xl"
          >
            <HStack gap="sm" align="center" className="mb-4">
              <span className="w-8 h-8 rounded-full bg-[var(--ember)]/20 flex items-center justify-center text-[var(--ember-glow)] font-bold shrink-0">
                !
              </span>
              <h3 className="text-sm font-semibold text-[var(--ember-glow)] uppercase tracking-wide">
                Delete Account
              </h3>
            </HStack>
            <p className="text-[var(--stone-300)] text-sm mb-4">
              Type{" "}
              <span className="font-mono text-[var(--ember-glow)]">DELETE</span>{" "}
              to permanently delete your account.
            </p>
            <input
              type="text"
              value={deleteTyped}
              onChange={(e) => setDeleteTyped(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 rounded bg-[var(--ink-deep)] border border-[var(--sage-soft)] text-[var(--stone-100)] text-sm font-mono mb-4 focus:outline-none focus:border-[var(--ember)] transition-colors"
            />
            {deleteError && (
              <p className="text-[var(--ember-glow)] text-xs mb-3">
                {deleteError}
              </p>
            )}
            <HStack gap="sm" justify="end">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                loading={deleting}
                disabled={deleteTyped !== "DELETE"}
                onClick={deleteAccount}
              >
                Permanently delete
              </Button>
            </HStack>
          </Card>
        </div>
      )}
    </Card>
  );
}
