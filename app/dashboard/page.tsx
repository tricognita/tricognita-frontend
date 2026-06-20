'use client'

import { memo, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { PostureScoreGauge } from "./components/PostureScoreGauge";
import { type UserRole, getRoleMetadata } from "@/lib/role-utils";
// @xyflow/react is ~150KB gzipped — dynamic-import so the dashboard initial
// paint doesn't carry the graph engine. ssr:false because xyflow uses
// window APIs at import time. The card showing the graph remains in the
// static layout; only the inner ReactFlow tree is deferred.
const SecurityGraph = dynamic(
  () => import("./components/SecurityGraph").then((m) => ({ default: m.SecurityGraph })),
  { ssr: false },
);
import { AlertFeed } from "./components/AlertFeed";
import { SystemHealthPanel } from "./components/SystemHealthPanel";
import { RestrictedPlaceholder } from "./components/RestrictedPlaceholder";
import { resilientFetch } from "@/lib/resilience";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey, isClientRole } from "@/lib/rbac";
import { emitAuditEvent } from "@/lib/audit-events";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  HStack,
  PageShell,
  StatusDot,
} from "@/lib/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Finding {
  resource: string;
  resource_type?: string;
  type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  detail?: string;
  arn?: string;
  signature: string;
  mitre?: string[];
  cis?: string;
}

interface Report {
  findings: Finding[];
  summary?: { total: number; critical: number; high: number; medium: number; low: number };
  services_scanned?: string[];
  attack_paths?: unknown[];
}

interface ScanResponse {
  script_output: string;
  report: Report;
}

interface HealthResponse {
  status: string;
  mode?: string;
  upstream?: string;
}

interface TermLine {
  id: number;
  text: string;
}

interface FinOpsSummary {
  estimated_savings_usd: number;
  zombie_count: number;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchHealth(): Promise<HealthResponse> {
  try {
    return await resilientFetch<HealthResponse>("/api/healthz", {}, "health");
  } catch {
    return { status: "unreachable" };
  }
}

async function runScan(): Promise<ScanResponse> {
  // Idempotency key — randomized per attempt, sent as a header. The BFF
  // propagates this to the Go API as Idempotency-Key so the backend can
  // dedupe accidental double-submits across retries, tabs, and network
  // hiccups. resilientFetch already provides client-side dedup within a
  // short window; this header is the server-side equivalent.
  const idempotencyKey =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `scan-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return resilientFetch<ScanResponse>(
    "/api/scan",
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    },
    "scan",
  );
}

async function runRemediate(_key: string, { arg }: { arg: { findings: Finding[] } }) {
  return resilientFetch<unknown>("/api/remediate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ findings: arg.findings }),
  }, "remediate");
}

// ─── Scan lifecycle labels ────────────────────────────────────────────────────

const SCAN_BUTTON_LABEL: Record<
  | "idle"
  | "queued"
  | "running"
  | "partial"
  | "completed"
  | "timeout"
  | "failed"
  | "cancelled",
  string
> = {
  idle: "Initiate fleet scan",
  queued: "Queued…",
  running: "Scanning…",
  partial: "Re-run scan",
  completed: "Run again",
  timeout: "Retry scan",
  failed: "Retry scan",
  cancelled: "Initiate fleet scan",
};

// ─── Perspective Widget ───────────────────────────────────────────────────────

const PerspectiveFocus = memo(function PerspectiveFocus({
  role,
  findings,
}: {
  role: UserRole;
  findings: Finding[];
}) {
  if (role === "DEVSECOPS") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="ghost" density="comfortable" className="bg-[var(--moss)] border-[var(--sage-soft)]">
          <h3 className="text-xs font-medium text-[var(--matcha-300)] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--matcha-300)]" />
            CI/CD pipeline security
          </h3>
          <div className="space-y-3">
            <HStack justify="between" align="center" className="text-xs text-[var(--stone-400)]">
              <span>Scan frequency</span>
              <span className="text-[var(--stone-50)] font-mono">On commit + scheduled</span>
            </HStack>
            <HStack justify="between" align="center" className="text-xs text-[var(--stone-400)]">
              <span>Artifacts scanned</span>
              <span className="text-[var(--stone-500)] font-mono">— (run a scan to populate)</span>
            </HStack>
            <p className="text-[10px] text-[var(--stone-500)] italic leading-snug">
              Connect a CI/CD runner via Settings → Integrations to start populating this view.
            </p>
          </div>
        </Card>
        <Card variant="ghost" density="comfortable" className="bg-[var(--moss)] border-[var(--sage-soft)]">
          <h3 className="text-xs font-medium text-[var(--matcha-300)] mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--matcha-400)]" />
            Software Bill of Materials
          </h3>
          <p className="text-xs text-[var(--stone-400)] mb-3 leading-relaxed">
            SBOM ingestion runs on every supplied artifact. The IaC scanner is in pre-production
            validation; connect a build to populate this view once your team is added to the IaC pilot.
          </p>
        </Card>
      </div>
    );
  }

  if (role === "SOC_LEAD") {
    const criticals = findings.filter((f) => f.severity === "CRITICAL").slice(0, 2);
    return (
      <Card variant="ghost" density="comfortable" className="bg-[var(--moss)] border-[var(--sage-soft)]">
        <HStack justify="between" align="center" className="mb-4">
          <h3 className="text-xs font-medium text-[var(--ember-glow)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--ember)] animate-pulse" />
            Live incident triage
          </h3>
          <span className="eyebrow">Monitoring us-east-1</span>
        </HStack>
        <div className="space-y-2">
          {criticals.map((f) => (
            <HStack
              key={f.resource}
              justify="between"
              align="center"
              className="p-2 rounded-lg bg-[var(--ember)]/5 border border-[var(--ember)]/10"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-[var(--ember-glow)] font-medium">{f.type}</span>
                <span className="text-[10px] text-[var(--stone-400)] truncate max-w-[200px]">
                  {f.resource}
                </span>
              </div>
              <Button variant="danger" size="xs">Isolate</Button>
            </HStack>
          ))}
          {criticals.length === 0 && (
            <EmptyState
              variant="compact"
              title="No critical incidents in window"
              description="Run a fleet scan to refresh."
            />
          )}
        </div>
      </Card>
    );
  }

  if (role === "CLIENT" || role === "VIEWER") {
    const open = findings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").length;
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Approval mode", value: "Recommend · JIT", hint: "Sensitive actions wait for human approval.", color: "text-[var(--matcha-200)]" },
          { label: "Last fleet scan", value: findings.length > 0 ? "Recent" : "—", hint: "Run by your security team.", color: "text-[var(--matcha-300)]" },
          { label: "Open critical/high", value: String(open), hint: "Findings awaiting remediation.", color: open > 0 ? "text-[var(--amber-clay)]" : "text-[var(--matcha-400)]" },
        ].map((m) => (
          <Card key={m.label} variant="ghost" density="comfortable" className="bg-[var(--moss)] border-[var(--sage-soft)] text-center" title={m.hint}>
            <div className="eyebrow mb-2">{m.label}</div>
            <div className={`text-xl font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-[var(--stone-500)] mt-1 leading-snug">{m.hint}</div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card variant="ghost" density="comfortable" className="bg-[var(--moss)] border-[var(--sage-soft)] text-center">
      <p className="text-xs text-[var(--stone-400)]">
        Select a specific focus area for deep-dive metrics.
      </p>
    </Card>
  );
});

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { role: actualRole } = useSession();
  const [activeRole, setActiveRole] = useState<UserRole>("ADMIN");

  // ScanState — explicit lifecycle so the UI can render the right affordance
  // and so audit events carry an unambiguous status. The Go API doesn't
  // expose real-time queue state yet, so the transitions queued → running →
  // completed / partial / timeout / failed are inferred from the BFF
  // response shape. cancelled is reserved for future cancellation support.
  const [scanState, setScanState] = useState<
    | "idle"
    | "queued"
    | "running"
    | "partial"
    | "completed"
    | "timeout"
    | "failed"
    | "cancelled"
  >("idle");
  const isScanning = scanState === "queued" || scanState === "running";
  const [visLines, setVisLines] = useState<TermLine[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const lineId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (actualRole) setActiveRole(actualRole as UserRole);
  }, [actualRole]);

  const { data: health } = useSWR("health", fetchHealth, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const scanMut = useSWRMutation("scan", runScan);
  const remMut = useSWRMutation("remediate", runRemediate);

  const [localFindings, setLocalFindings] = useState<Finding[] | null>(null);
  const report = scanMut.data?.report;
  const findings: Finding[] = useMemo(
    () => localFindings ?? report?.findings ?? [],
    [localFindings, report?.findings],
  );
  const isBusy = scanMut.isMutating || remMut.isMutating;

  // Memoize severity counts — re-derived from `findings` only, not on every
  // keystroke in unrelated state (perspective selector, scan terminal lines).
  const findingsStats = useMemo(() => {
    let critical = 0;
    let high = 0;
    for (const f of findings) {
      if (f.severity === "CRITICAL") critical++;
      else if (f.severity === "HIGH") high++;
    }
    return { critical, high, total: findings.length };
  }, [findings]);

  const { data: usersData } = useSWR(
    swrKey(canDo(actualRole, "manageUsers"), "/api/auth/users"),
    (url: string) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      }),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const liveTeam: Array<{ id: string; name: string; email: string; role: string }> =
    usersData?.users ?? [];

  const queueOutput = (header: string, ...chunks: string[]) => {
    const raw = chunks.join("\n").split("\n");
    setPending((prev) => [...prev, `[INIT] ${header}`, ...raw]);
  };

  useEffect(() => {
    if (pending.length === 0) return;
    const interval = setInterval(() => {
      setVisLines((prev) => {
        const nextLine = pending[0];
        if (!nextLine) return prev;
        lineId.current++;
        return [...prev.slice(-100), { id: lineId.current, text: nextLine }];
      });
      setPending((prev) => prev.slice(1));
    }, 40);
    return () => clearInterval(interval);
  }, [pending]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [visLines]);

  async function handleScan() {
    // Lifecycle: idle → queued → running → (completed | partial | timeout | failed)
    setScanState("queued");
    setVisLines([]);
    setLocalFindings(null);
    queueOutput(
      "STARTING FLEET SCAN",
      "[●] Initializing JIT token (AUTO tier)...",
      "[●] Connecting to AWS...",
      "[●] Running Sentinel scanner...",
    );
    // Audit event — operator triggered a manual fleet scan. Fire-and-forget;
    // never blocks the user flow.
    void emitAuditEvent({
      type: "scan.triggered",
      resource: "fleet",
      metadata: { trigger: "dashboard_button" },
    });
    setScanState("running");
    try {
      const res = await scanMut.trigger();
      const anyRes = res as {
        error?: string;
        message?: string;
        simulated?: boolean;
        report?: {
          findings?: Finding[];
          report_id?: string;
          mode?: string;
          fleet_status?: string;
        };
        script_output?: string;
      };

      if (anyRes?.error) {
        throw new Error(anyRes.message ?? anyRes.error);
      }
      if (anyRes?.simulated === true) {
        // Backend unreachable → /api/scan returned a simulated response. This
        // is a partial-success: scan workflow ran, but the upstream is degraded.
        queueOutput(
          "SCAN COMPLETE (DEGRADED)",
          "[!] Scan simulated — upstream backend unreachable.",
          `[!] ${anyRes.message ?? "No findings detected."}`,
        );
        setScanState("partial");
        void emitAuditEvent({
          type: "scan.completed",
          resource: "fleet",
          metadata: { simulated: true, mode: "degraded" },
        });
        return;
      }
      if (anyRes?.report) {
        const r = anyRes.report;
        const count = Array.isArray(r.findings) ? r.findings.length : 0;
        const crit = Array.isArray(r.findings)
          ? r.findings.filter((f) => f.severity === "CRITICAL").length
          : 0;
        const high = Array.isArray(r.findings)
          ? r.findings.filter((f) => f.severity === "HIGH").length
          : 0;
        queueOutput(
          "SCAN COMPLETE",
          `[✓] Scan ${r.report_id} (mode=${r.mode ?? "?"})`,
          `[✓] Fleet status: ${r.fleet_status ?? "?"}`,
          `[✓] ${count} findings (${crit} CRITICAL, ${high} HIGH)`,
          `[✓] Persisted to S3 dataset for ARIA fine-tuning.`,
        );
        setScanState("completed");
        void emitAuditEvent({
          type: "scan.completed",
          resource: r.report_id ?? "fleet",
          metadata: { count, critical: crit, high, mode: r.mode },
        });
        return;
      }
      queueOutput(
        "SCAN COMPLETE",
        anyRes.script_output ?? JSON.stringify(res).slice(0, 400),
      );
      setScanState("completed");
      void emitAuditEvent({ type: "scan.completed", resource: "fleet" });
    } catch (e) {
      const msg = String(e);
      // Distinguish timeout from generic failure. AbortError + 504/timeout
      // language in the message indicates the upstream took too long.
      const isTimeout =
        /timeout|abort|deadline|504/i.test(msg) || (e as Error)?.name === "AbortError";
      queueOutput(
        isTimeout ? "SCAN TIMED OUT" : "SCAN FAILED",
        `[✗] ${msg}`,
        "",
        "[!] Check: Go backend deployed and reachable?",
        "[!] Check: SENTINEL_JIT_SECRET env var set in Vercel?",
        "[!] Check: AWS credentials configured in backend?",
      );
      setScanState(isTimeout ? "timeout" : "failed");
      void emitAuditEvent({
        type: "scan.failed",
        resource: "fleet",
        metadata: { error: msg.slice(0, 240), reason: isTimeout ? "timeout" : "error" },
      });
    } finally {
      // setIsScanning replaced by the scanState transitions above. Nothing
      // to clean up — the next handleScan call resets via setScanState("queued").
      void 0;
    }
  }

  useSWR<FinOpsSummary>(
    swrKey(canDo(actualRole, "viewFinOps"), "/api/aria/finops/summary"),
    (u: string) =>
      fetch(u).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      }),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const { data: ariaStatus } = useSWR<HealthResponse>(
    swrKey(canDo(actualRole, "viewAriaStatus"), "/api/aria/status"),
    (u: string) =>
      fetch(u).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      }),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const [showOnboardingNudge, setShowOnboardingNudge] = useState(false);
  useEffect(() => {
    setShowOnboardingNudge(!localStorage.getItem("trico_onboarded"));
  }, []);

  const meta = getRoleMetadata(activeRole);
  const isOnline = health?.status === "healthy";
  // Demo-mode banner moved to the shared DegradedBanner in ClientLayout.

  // ── PageShell header slots ────────────────────────────────────────────────

  const isClient = isClientRole(actualRole);

  // Map ScanState → StatusDot intent + label so the dashboard header
  // surfaces lifecycle visibly. Hidden when idle (the button itself is
  // the cue) so the meta strip isn't cluttered for normal viewing.
  const scanIndicator =
    scanState === "idle"
      ? null
      : (
          <StatusDot
            intent={
              scanState === "completed"
                ? "success"
                : scanState === "queued" || scanState === "running"
                  ? "info"
                  : scanState === "partial"
                    ? "warning"
                    : scanState === "timeout"
                      ? "warning"
                      : scanState === "cancelled"
                        ? "neutral"
                        : "danger"
            }
            pulse={scanState === "queued" || scanState === "running"}
            size="sm"
            label={`Scan: ${scanState}`}
          />
        );

  const headerMeta = isClient ? null : (
    <HStack gap="md" align="center" wrap>
      <StatusDot
        intent={isOnline ? "success" : "warning"}
        pulse={!isOnline}
        size="sm"
        label={`Backend: ${isOnline ? "Online" : "Offline"}`}
      />
      <StatusDot
        intent={ariaStatus?.status === "healthy" ? "success" : "neutral"}
        size="sm"
        label={`Automation: ${ariaStatus?.status === "healthy" ? "Active" : "Standby"}`}
      />
      <StatusDot
        intent="info"
        size="sm"
        label={`Mode: ${health?.mode ?? "—"}`}
      />
      {scanIndicator}
    </HStack>
  );

  const headerActions = (
    <HStack gap="md" align="end" wrap>
      <div className="flex flex-col items-end gap-1">
        <span className="eyebrow">
          {actualRole === "ADMIN" ? "Perspective (admin debug)" : "Perspective"}
        </span>
        {actualRole === "ADMIN" ? (
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as UserRole)}
            className="bg-[var(--moss)] border border-[var(--sage-soft)] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--stone-200)] outline-none transition-all hover:border-[var(--matcha-400)]/40 focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/50"
            title="Render the dashboard as another role would see it. Admin-only debug control."
          >
            <option value="ADMIN">Admin perspective</option>
            <option value="DEVSECOPS">DevSecOps</option>
            <option value="SOC_LEAD">SOC / MDR</option>
            <option value="RED_TEAMER">Red team</option>
            <option value="FINOPS_ANALYST">FinOps</option>
            <option value="CLIENT">Client portal</option>
            <option value="VIEWER">Viewer portal</option>
          </select>
        ) : (
          <Badge intent="neutral" variant="subtle" size="sm">
            {actualRole} Portal
          </Badge>
        )}
      </div>
      {canDo(actualRole, "triggerScan") && (
        <Button
          variant="primary"
          size="md"
          loading={isBusy}
          icon={<ShieldCheck size={12} />}
          onClick={handleScan}
          disabled={isScanning}
        >
          {SCAN_BUTTON_LABEL[scanState]}
        </Button>
      )}
    </HStack>
  );

  return (
    <div className="min-h-screen selection:bg-[var(--matcha-300)]/20">
      {/* Onboarding nudge — full-width banner */}
      {showOnboardingNudge && (
        <div
          className="border-b px-6 py-2.5 flex items-center justify-between gap-3"
          style={{
            background: "color-mix(in oklch, var(--matcha-600) 8%, transparent)",
            borderColor: "color-mix(in oklch, var(--matcha-600) 22%, transparent)",
          }}
        >
          <span className="text-xs text-[var(--matcha-200)]">
            Connect your AWS account to start scanning real resources.
          </span>
          <HStack gap="sm" align="center">
            <a href="/onboarding">
              <Button variant="primary" size="xs">Start setup →</Button>
            </a>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                localStorage.setItem("trico_onboarded", "1");
                setShowOnboardingNudge(false);
              }}
            >
              Dismiss
            </Button>
          </HStack>
        </div>
      )}

      {/* Legacy per-route demo banner removed — the shared
          DegradedBanner in ClientLayout now renders the single canonical
          signal across every dashboard route. Closes the inconsistent-UX
          gap where two surfaces showed different posture for the same
          root cause. */}

      <PageShell
        eyebrow={isClient ? "Client portal" : "Operations · Command"}
        title={isClient ? "Security Overview" : "Defense Command"}
        description={
          isClient
            ? "Live posture, approval workflows, and findings awaiting remediation for your enterprise."
            : "Unified security operations for the Tricognita platform — posture, automation, and live incident triage."
        }
        meta={headerMeta}
        actions={headerActions}
        width="default"
        density="tight"
      >
        {/* ── Posture Index + Perspective Focus ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 h-full">
            <Card variant="elevated" density="comfortable" className="h-full flex flex-col">
              <CardHeader
                eyebrow="Posture index"
                title={findings.length > 0 ? "Fleet posture compromised" : "Fleet hardened"}
                description={
                  findings.length > 0
                    ? "Critical findings detected. Remediation queue is active."
                    : "No critical findings in the current scan window."
                }
              />
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-2">
                <PostureScoreGauge
                  score={findings.length > 0 ? 42 : 100}
                  label="Fleet Health"
                  size={120}
                />
                <Badge
                  intent={findings.length > 0 ? "danger" : "success"}
                  variant="subtle"
                  size="sm"
                  mono
                >
                  {findings.length > 0 ? "Compromised" : "Hardened"}
                </Badge>
              </div>
              {/* Micro-KPI row — fills prior dead space with operational
                  metrics. Each tile deep-links to the findings page with
                  the matching severity filter pre-applied. */}
              <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-[var(--sage-soft)]">
                {[
                  {
                    label: "Critical",
                    value: findingsStats.critical,
                    intent: "danger" as const,
                    href: "/dashboard/findings?severity=CRITICAL",
                  },
                  {
                    label: "High",
                    value: findingsStats.high,
                    intent: "warning" as const,
                    href: "/dashboard/findings?severity=HIGH",
                  },
                  {
                    label: "Findings",
                    value: findingsStats.total,
                    intent: "neutral" as const,
                    href: "/dashboard/findings",
                  },
                ].map((m) => (
                  <Link
                    key={m.label}
                    href={m.href}
                    className="text-center rounded-md py-1 transition-colors hover:bg-[var(--moss-hi)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--matcha-400)]/40"
                    aria-label={`${m.value} ${m.label.toLowerCase()} findings — open list`}
                  >
                    <div className="eyebrow text-[var(--stone-500)] mb-1">
                      {m.label}
                    </div>
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        m.intent === "danger"
                          ? "text-[var(--ember-glow)]"
                          : m.intent === "warning"
                            ? "text-[var(--amber-clay)]"
                            : "text-[var(--stone-100)]"
                      }`}
                    >
                      {m.value}
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <Card variant="elevated" density="comfortable">
              <CardHeader
                title={`Focus: ${meta.focus}`}
                actions={
                  <Badge intent="neutral" variant="subtle" size="sm" mono>
                    {meta.primaryMetric}
                  </Badge>
                }
              />
              <PerspectiveFocus role={activeRole} findings={findings} />
            </Card>

            {canDo(actualRole, "manageUsers") && (
              <Card variant="elevated" density="comfortable">
                <CardHeader
                  title="Team Members"
                  eyebrow={
                    <HStack gap="xs" align="center">
                      <Users size={10} />
                      <span>Workspace access</span>
                    </HStack>
                  }
                  actions={
                    <a href="/dashboard/users">
                      <Button variant="ghost" size="xs">
                        Manage → Users panel
                      </Button>
                    </a>
                  }
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {liveTeam.slice(0, 6).map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--moss)] border border-[var(--sage-soft)]"
                    >
                      <div className="w-7 h-7 rounded-full bg-[var(--matcha-600)]/15 border border-[var(--sage-soft)] flex items-center justify-center text-xs font-bold text-[var(--matcha-200)] shrink-0">
                        {(u.name || u.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--stone-50)] truncate">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-[var(--stone-400)] truncate">
                          {u.email}
                        </div>
                      </div>
                      <Badge intent="neutral" variant="subtle" size="xs">
                        {u.role}
                      </Badge>
                    </div>
                  ))}
                  {liveTeam.length === 0 && (
                    <div className="col-span-2">
                      <EmptyState
                        variant="compact"
                        title="No team members yet"
                        description="Add users via the Users panel."
                      />
                    </div>
                  )}
                </div>
              </Card>
            )}

            {canDo(actualRole, "viewSystemHealth") ? (
              <SystemHealthPanel />
            ) : (
              <RestrictedPlaceholder
                title="Platform Health"
                description="Live infrastructure diagnostics and subsystem status monitoring."
                roles={["ADMIN"]}
                size="sm"
              />
            )}
          </div>
        </div>

        {/* ── Security Graph & Critical Alert Feed ───────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-[520px]">
          <div className="xl:col-span-8 flex flex-col h-full">
            <HStack justify="between" align="center" className="mb-3">
              <h2 className="font-semibold text-sm text-[var(--stone-50)] flex items-center gap-2">
                Security Graph
              </h2>
              <Badge intent="neutral" variant="outline" size="xs" mono>
                Live attack path telemetry
              </Badge>
            </HStack>
            <Card variant="elevated" density="comfortable" className="flex-1 p-0 overflow-hidden">
              <SecurityGraph />
            </Card>
          </div>

          <div className="xl:col-span-4 flex flex-col h-full">
            <AlertFeed />
          </div>
        </div>
      </PageShell>
    </div>
  );
}
