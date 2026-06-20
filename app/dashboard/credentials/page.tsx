"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/lib/use-session";
import { canDo, swrKey } from "@/lib/rbac";
import { PageRestrictedGuard } from "../components/PageRestrictedGuard";

const AWS_REGIONS = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1",
  "eu-west-1", "eu-west-2", "eu-central-1", "ca-central-1",
];

interface Credential {
  id: string;
  provider: string;
  label: string;
  account_id: string;
  role_arn: string;
  regions: string[];
  status: "active" | "error" | "untested";
  last_scan_at: string | null;
  created_at: string;
}

const STATUS_CHIP: Record<string, string> = {
  active:   "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40",
  error:    "bg-red-500/15 text-red-400 ring-1 ring-red-500/40",
  untested: "bg-zinc-700/40 text-zinc-400 ring-1 ring-zinc-600/40",
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

const EMPTY_FORM = {
  provider: "aws",
  label: "",
  account_id: "",
  role_arn: "",
  external_id: "",
  regions: ["us-east-1", "ap-south-1"],
};

export default function CredentialsPage() {
  const { role } = useSession();
  const hasAccess = canDo(role, "viewCredentials");

  // /api/credentials — SECOPS-tier only. null key = no fetch for restricted roles.
  const { data, mutate } = useSWR<{ credentials: Credential[] }>(
    swrKey(hasAccess, "/api/credentials"),
    fetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const creds = data?.credentials ?? [];

  function toggleRegion(r: string) {
    setForm(f => ({
      ...f,
      regions: f.regions.includes(r) ? f.regions.filter(x => x !== r) : [...f.regions, r],
    }));
  }

  async function save() {
    if (!form.label || !form.role_arn) {
      setError("Label and Role ARN are required.");
      return;
    }
    setSaving(true); setError(null); setSuccess(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Save failed");
      }
      setSuccess("Account connected successfully.");
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await fetch("/api/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await mutate();
    } finally {
      setDeleting(null);
    }
  }

  // ── RBAC gate: unauthorized roles see an intentional restricted page ──────
  if (!hasAccess) {
    return (
      <PageRestrictedGuard
        capability="viewCredentials"
        title="Cloud Account Credentials"
        description="Manage AWS cross-account IAM roles for resource scanning."
        allowedRoles={["ADMIN", "SECOPS", "CLOUD_ENGINEER", "DEVSECOPS"]}
        subtitle="Cloud Accounts"
      >
        {null}
      </PageRestrictedGuard>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50 tracking-tight">Cloud Accounts</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Connect AWS accounts via cross-account IAM roles. ARIA uses read-only access to
              scan resources, findings, and compliance posture.
            </p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setError(null); setSuccess(null); }}
            className="px-4 py-2 text-sm font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "+ Connect Account"}
          </button>
        </div>

        {success && (
          <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {/* Add form */}
        {showForm && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-6 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Connect AWS Account
            </p>

            {/* Trust policy helper */}
            <div className="rounded-lg bg-zinc-800/60 border border-zinc-700 p-4 space-y-2">
              <p className="text-[11px] font-semibold text-zinc-300">Setup guide</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                1. In your AWS account, create an IAM role with <code className="text-violet-400">ReadOnlyAccess</code> + <code className="text-violet-400">SecurityAudit</code> policies.<br />
                2. Set the trust relationship to allow <code className="text-violet-400 font-mono">arn:aws:iam::123456789012:root</code> to assume the role.<br />
                3. Add an external ID condition (recommended) and paste the values below.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Label *</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Production — us-east-1"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">AWS Account ID</label>
                <input
                  value={form.account_id}
                  onChange={e => setForm(f => ({ ...f, account_id: e.target.value }))}
                  placeholder="123456789012"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">IAM Role ARN *</label>
                <input
                  value={form.role_arn}
                  onChange={e => setForm(f => ({ ...f, role_arn: e.target.value }))}
                  placeholder="arn:aws:iam::123456789012:role/TricognitaReadOnly"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">External ID (optional)</label>
                <input
                  value={form.external_id}
                  onChange={e => setForm(f => ({ ...f, external_id: e.target.value }))}
                  placeholder="tricognita-external-id"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Regions to scan</label>
              <div className="flex flex-wrap gap-2">
                {AWS_REGIONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRegion(r)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono transition-colors ${
                      form.regions.includes(r)
                        ? "bg-violet-700/60 text-violet-200 ring-1 ring-violet-600"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-5 py-2 text-sm font-semibold bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white rounded-lg transition-colors"
              >
                {saving ? "Connecting…" : "Connect Account"}
              </button>
            </div>
          </div>
        )}

        {/* Credentials table */}
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          {creds.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-4xl">☁️</p>
              <p className="text-sm text-zinc-400 font-semibold">No cloud accounts connected</p>
              <p className="text-xs text-zinc-600">
                Connect your first AWS account to start scanning resources and detecting misconfigurations.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 px-5 py-2 text-sm font-semibold bg-violet-700 hover:bg-violet-600 text-white rounded-lg transition-colors"
              >
                Connect AWS Account
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800 bg-zinc-900/60">
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Role ARN</th>
                  <th className="px-5 py-3 hidden md:table-cell">Regions</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Last Scan</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950">
                {creds.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-zinc-200">{c.label}</p>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5">{c.account_id || "—"}</p>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell max-w-[220px]">
                      <span className="block truncate text-xs font-mono text-zinc-400" title={c.role_arn}>
                        {c.role_arn.length > 40 ? `…${c.role_arn.slice(-37)}` : c.role_arn}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(c.regions ?? []).slice(0, 3).map(r => (
                          <span key={r} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">{r}</span>
                        ))}
                        {(c.regions ?? []).length > 3 && (
                          <span className="text-[10px] text-zinc-600">+{c.regions.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CHIP[c.status] ?? STATUS_CHIP.untested}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-xs text-zinc-500">
                      {c.last_scan_at ? new Date(c.last_scan_at).toLocaleString() : "Never"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => remove(c.id)}
                        disabled={deleting === c.id}
                        className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
                      >
                        {deleting === c.id ? "…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* IAM trust policy template */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">IAM Trust Policy Template</p>
          <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-800/60 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
{`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::123456789012:root" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "sts:ExternalId": "YOUR_EXTERNAL_ID" }
    }
  }]
}`}
          </pre>
          <p className="text-[10px] text-zinc-600">
            Attach <code className="text-violet-400">ReadOnlyAccess</code> and <code className="text-violet-400">SecurityAudit</code> managed policies to the role.
          </p>
        </div>
      </main>
    </div>
  );
}
