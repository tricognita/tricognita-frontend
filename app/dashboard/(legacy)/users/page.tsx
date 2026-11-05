"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useSession } from "@/lib/use-session";
import { canDo } from "@/lib/rbac";

type Role = "ADMIN"|"SECOPS"|"AUDITOR"|"VIEWER"|"DEVSECOPS"|"SOC_LEAD"|"RED_TEAMER"|"FINOPS_ANALYST"|"CLOUD_ENGINEER"|"CLIENT";
type Status = "active"|"invite"|"deactivated";
type Plan = "free"|"starter"|"professional"|"enterprise";

interface PublicUser {
  id: string; email: string; name: string; role: Role; plan: Plan;
  status: Status; lastLoginAt: string|null; createdAt: string;
  modules?: string[]; mustReset?: boolean;
}

const ROLES: Role[] = ["ADMIN","SECOPS","AUDITOR","VIEWER","DEVSECOPS","SOC_LEAD","RED_TEAMER","FINOPS_ANALYST","CLOUD_ENGINEER","CLIENT"];
const PLANS: Plan[] = ["free","starter","professional","enterprise"];
const ALL_MODULES = ["Overview","ARIA Console","ARIA Guard","Attack Graph","Incidents","Zero Trust","AI Security","FinOps","Threat Intel","Compliance","Services","Audit Trail","Settings","Users"];

const fetcher = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return r.json(); };

const PLAN_COLORS: Record<Plan, string> = {
  free:         "bg-stone-700/40 text-stone-300 ring-stone-600/40",
  starter:      "bg-matcha-500/15 text-matcha-300 ring-matcha-500/30",
  professional: "bg-matcha-300/15 text-matcha-200 ring-matcha-300/30",
  enterprise:   "bg-amber-400/15 text-amber-300 ring-amber-400/30",
};
const STATUS_COLORS: Record<Status, string> = {
  active:      "bg-matcha-300/10 text-matcha-300 ring-matcha-300/30",
  invite:      "bg-amber-400/10 text-amber-300 ring-amber-400/25",
  deactivated: "bg-stone-700/40 text-stone-500 ring-stone-600/30",
};

function Badge({ cls, label }: { cls: string; label: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ring-1 ${cls}`}>{label}</span>;
}

export default function UsersPage() {
  const { role: myRole, email: myEmail } = useSession();
  const isAdmin = canDo(myRole, "manageUsers");
  const url = isAdmin ? "/api/auth/users" : "/api/auth/me";
  const { data, error, isLoading, mutate } = useSWR<{users: PublicUser[]}|PublicUser>(url, fetcher);
  const users: PublicUser[] = isAdmin
    ? (data as {users: PublicUser[]})?.users ?? []
    : data ? [(data as PublicUser)] : [];

  const [toast, setToast] = useState<{msg: string; ok: boolean}|null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PublicUser|null>(null);
  const [resetTarget, setResetTarget] = useState<PublicUser|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicUser|null>(null);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);
  const ok  = (msg: string) => setToast({ msg, ok: true });
  const err = (msg: string) => setToast({ msg, ok: false });

  async function handleDelete(u: PublicUser) {
    const res = await fetch(`/api/auth/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) { const b = await res.json().catch(() => ({})); err(b?.error ?? "Delete failed"); return; }
    ok(`${u.email} deleted`); mutate(); setDeleteTarget(null);
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="rise-in flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="eyebrow mb-2 block">{isAdmin ? "Admin" : "Account"}</span>
            <h1 className="serif-display text-3xl text-leaf">{isAdmin ? "User Management" : "My Account"}</h1>
            <p className="text-sm text-stone-400 mt-2">
              {isAdmin ? "Invite employees, assign roles, plans, and module access." : "Your account details and assigned role."}
            </p>
          </div>
          {isAdmin && <button onClick={() => setCreateOpen(true)} className="btn-matcha cursor-dot">+ Create User</button>}
        </div>

        {isLoading && <p className="text-sm text-stone-400">Loading…</p>}
        {error && <p className="text-sm text-ember">Failed to load users.</p>}

        {!isLoading && !error && (
          <div className="glass overflow-x-auto rise-in-2">
            <table className="w-full text-sm min-w-[800px]">
              <thead style={{ background: "var(--moss)" }}>
                <tr>
                  {(isAdmin
                    ? ["Name","Email","Role","Plan","Status","Modules","Actions"]
                    : ["Name","Email","Role","Plan","Status"]
                  ).map((h, i) => (
                    <th key={h} className={`${isAdmin && i === 6 ? "text-right" : "text-left"} px-4 py-3`}>
                      <span className="eyebrow">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--sage-soft)" }}>
                {users.length === 0 && (
                  <tr><td colSpan={isAdmin ? 7 : 5} className="px-4 py-10 text-center text-sm text-stone-500">No users yet.</td></tr>
                )}
                {users.map(u => (
                  <tr key={u.id} className="transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--moss-rise)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td className="px-4 py-3 text-stone-50 font-medium">
                      {u.name}
                      {u.mustReset && <span className="ml-2 text-[9px] text-amber-400 font-mono">[must reset]</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-400 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3"><Badge cls="" label={u.role} /></td>
                    <td className="px-4 py-3"><Badge cls={PLAN_COLORS[u.plan ?? "free"]} label={u.plan ?? "free"} /></td>
                    <td className="px-4 py-3"><Badge cls={STATUS_COLORS[u.status]} label={u.status} /></td>
                    {isAdmin && (
                      <>
                        <td className="px-4 py-3">
                          <span className="text-xs text-stone-400">{u.modules?.length ? `${u.modules.length} assigned` : "Default"}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button onClick={() => setEditTarget(u)} className="px-2 py-1 text-xs rounded border border-sage-soft text-stone-300 hover:bg-matcha-300/10 hover:text-matcha-300 transition-colors cursor-dot">Edit</button>
                            <button onClick={() => setResetTarget(u)} className="px-2 py-1 text-xs rounded border border-sage-soft text-stone-300 hover:bg-amber-400/10 hover:text-amber-300 transition-colors cursor-dot">Reset PW</button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              disabled={u.email === myEmail}
                              title={u.email === myEmail ? "You cannot delete your own account" : undefined}
                              className="px-2 py-1 text-xs rounded border border-rose-800/40 text-rose-400 hover:bg-rose-900/20 transition-colors cursor-dot disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} onDone={(msg) => { ok(msg); mutate(); }} />}
      {editTarget && <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onDone={(msg) => { ok(msg); mutate(); }} />}
      {resetTarget && <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} onDone={(msg) => { ok(msg); }} />}
      {deleteTarget && (
        <ConfirmModal
          title="Delete User"
          body={<>Delete <span className="text-stone-200 font-medium">{deleteTarget.email}</span>? This cannot be undone.</>}
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}

      {toast && (
        <div role="status" aria-live="polite"
          className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm text-stone-50 shadow-2xl transition-all`}
          style={{ background: toast.ok ? "var(--moss-rise)" : "rgba(220,38,38,0.15)", border: `1px solid ${toast.ok ? "var(--matcha-300)" : "rgba(220,38,38,0.4)"}` }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ── Create User Modal ──────────────────────────────────────────────────────────

function CreateUserModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [plan, setPlan] = useState<Plan>("free");
  const [modules, setModules] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    const res = await fetch("/api/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role, plan, modules: modules.length ? modules : undefined }),
    });
    setBusy(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b?.error ?? "Failed"); return; }
    onDone(`Created ${email}`); onClose();
  }

  return (
    <Modal title="Create User" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name"><input id="cu-name" value={name} onChange={e => setName(e.target.value)} required className={INPUT} /></Field>
        <Field label="Email"><input id="cu-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className={INPUT} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select id="cu-role" value={role} onChange={e => setRole(e.target.value as Role)} className={INPUT}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Plan">
            <select id="cu-plan" value={plan} onChange={e => setPlan(e.target.value as Plan)} className={INPUT}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Modules (optional)">
          <ModuleSelector selected={modules} onChange={setModules} />
        </Field>
        {error && <ErrorBox>{error}</ErrorBox>}
        <ModalActions onCancel={onClose} submitLabel={busy ? "Creating…" : "Create User"} disabled={busy} />
      </form>
    </Modal>
  );
}

// ── Edit User Modal ────────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onDone }: { user: PublicUser; onClose: () => void; onDone: (msg: string) => void }) {
  const [role, setRole] = useState<Role>(user.role);
  const [plan, setPlan] = useState<Plan>(user.plan ?? "free");
  const [modules, setModules] = useState<string[]>(user.modules ?? []);
  const [status, setStatus] = useState<Status>(user.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    const res = await fetch(`/api/auth/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, plan, modules, status }),
    });
    setBusy(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b?.message ?? b?.error ?? "Failed"); return; }
    onDone(`Updated ${user.email}`); onClose();
  }

  return (
    <Modal title={`Edit — ${user.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <select id="eu-role" value={role} onChange={e => setRole(e.target.value as Role)} className={INPUT}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Plan">
            <select id="eu-plan" value={plan} onChange={e => setPlan(e.target.value as Plan)} className={INPUT}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Status">
          <select id="eu-status" value={status} onChange={e => setStatus(e.target.value as Status)} className={INPUT}>
            {["active","invite","deactivated"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Modules">
          <ModuleSelector selected={modules} onChange={setModules} />
        </Field>
        {error && <ErrorBox>{error}</ErrorBox>}
        <ModalActions onCancel={onClose} submitLabel={busy ? "Saving…" : "Save Changes"} disabled={busy} />
      </form>
    </Modal>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose, onDone }: { user: PublicUser; onClose: () => void; onDone: (msg: string) => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string|null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    const res = await fetch("/api/auth/admin-reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, tempPassword: pw }),
    });
    setBusy(false);
    if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b?.message ?? b?.error ?? "Failed"); return; }
    onDone(`Password reset for ${user.email} — user must change on next login`); onClose();
  }

  return (
    <Modal title={`Reset Password — ${user.email}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-stone-400">Set a temporary password. The user will be forced to change it on next login.</p>
        <Field label="Temporary password (min 12 chars)">
          <input id="rp-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} minLength={12} required className={INPUT} />
        </Field>
        {error && <ErrorBox>{error}</ErrorBox>}
        <ModalActions onCancel={onClose} submitLabel={busy ? "Resetting…" : "Reset Password"} disabled={busy || pw.length < 12} danger />
      </form>
    </Modal>
  );
}

// ── Module Selector ────────────────────────────────────────────────────────────

function ModuleSelector({ selected, onChange }: { selected: string[]; onChange: (m: string[]) => void }) {
  function toggle(m: string) {
    onChange(selected.includes(m) ? selected.filter(x => x !== m) : [...selected, m]);
  }
  return (
    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
      {ALL_MODULES.map(m => {
        const on = selected.includes(m);
        return (
          <label key={m} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-dot transition-colors ${on ? "bg-matcha-300/10 border border-matcha-300/30 text-matcha-200" : "bg-moss border border-sage-soft text-stone-400 hover:border-sage"}`}>
            <input type="checkbox" checked={on} onChange={() => toggle(m)} className="accent-matcha-300 w-3 h-3" />
            {m}
          </label>
        );
      })}
    </div>
  );
}

// ── Shared primitives ──────────────────────────────────────────────────────────

const INPUT = "w-full rounded-lg bg-ink border border-sage-soft px-3 py-2 text-sm text-stone-50 focus:outline-none focus:ring-2 focus:ring-matcha-300";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="eyebrow block mb-1.5">{label}</label>{children}</div>;
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-lg px-3 py-2 text-xs text-ember" style={{ background: "rgba(214,125,82,0.08)", border: "1px solid rgba(214,125,82,0.3)" }}>{children}</div>;
}

function ModalActions({ onCancel, submitLabel, disabled, danger }: { onCancel: () => void; submitLabel: string; disabled?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} className="btn-ghost cursor-dot">Cancel</button>
      <button type="submit" disabled={disabled} className={`cursor-dot disabled:opacity-60 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${danger ? "bg-rose-700 hover:bg-rose-600 text-white" : "btn-matcha"}`}>{submitLabel}</button>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-4" role="dialog" aria-modal="true">
      <div className="glass w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-stone-50 serif">{title}</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 text-xl leading-none cursor-dot">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, danger, onCancel, onConfirm }: { title: string; body: React.ReactNode; danger?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); onConfirm(); }}>
        <p className="text-sm text-stone-300 mb-6">{body}</p>
        <ModalActions onCancel={onCancel} submitLabel="Confirm" danger={danger} />
      </form>
    </Modal>
  );
}
