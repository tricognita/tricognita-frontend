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
  changeUserRole,
  fetchUsers,
  inviteUser,
  removeUser,
  setTemporaryPassword,
  setUserStatus,
  type UserRow,
} from "@/lib/api/admin";
import { canDo } from "@/lib/rbac";
import { useSession } from "@/lib/use-session";

/**
 * Users: who can sign in to this organisation and what each may do.
 *
 * An administrator only ever sees and manages users of their own organisation; the
 * server enforces that, this page just shows what it is given. A new user has no
 * password until an administrator sets a temporary one here. It is generated in the
 * browser, shown once, and the user must replace it at first sign-in.
 */

const INPUT =
  "rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text-sm)] text-[var(--fg)] w-full";
const LABEL = "text-[10px] uppercase tracking-wide text-[var(--fg-subtle)]";
const ROLES = ["ADMIN", "SECOPS", "AUDITOR", "VIEWER", "CLIENT"] as const;
const ROLE_HELP: Record<string, string> = {
  ADMIN: "Everything in this organisation, including users and cloud accounts",
  SECOPS: "Run verifications, review and request fixes",
  AUDITOR: "Read-only, including the audit trail and evidence",
  VIEWER: "Read-only",
  CLIENT: "Customer read-only access",
};

function tempPassword(): string {
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  return "Tc!" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function UserCard({ user, selfEmail, onChanged }: { user: UserRow; selfEmail: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const self = user.email.toLowerCase() === selfEmail.toLowerCase();

  async function run(label: string, fn: () => Promise<string | void>) {
    setBusy(true);
    setMsg(null);
    try {
      const text = await fn();
      setMsg({ ok: true, text: text || `${label} done.` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
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
            <span className="text-[var(--text-sm)] font-medium text-[var(--fg)] break-words">
              {user.name}
              {self && <span className="ml-2 text-[var(--text-xs)] text-[var(--fg-muted)]">(you)</span>}
            </span>
            <span className="text-[var(--text-xs)] text-[var(--fg-muted)] break-all">{user.email}</span>
          </VStack>
          <HStack gap="xs" className="flex-wrap">
            <Badge intent={user.status === "active" ? "success" : "neutral"} size="xs">
              {user.status === "invite" ? "Invited" : user.status === "deactivated" ? "Disabled" : "Active"}
            </Badge>
            <Badge intent={user.mfaEnabled ? "success" : "neutral"} size="xs">
              {user.mfaEnabled ? "MFA on" : "MFA off"}
            </Badge>
          </HStack>
        </HStack>
        <p className="text-[var(--text-xs)] text-[var(--fg)]">
          {user.lastLoginAt ? (
            <>
              Last signed in <DateTime value={user.lastLoginAt} variant="both" />
            </>
          ) : (
            "Has not signed in"
          )}
          {user.mustReset ? " · must set a new password at next sign-in" : ""}
        </p>
        <HStack gap="sm" align="center" className="flex-wrap">
          <label className="flex items-center gap-2">
            <span className={LABEL}>Role</span>
            <select
              className={INPUT + " !w-auto"}
              value={user.role}
              disabled={busy || self}
              onChange={(e) => void run("Role change", async () => { await changeUserRole(user.id, e.target.value); return `Role is now ${e.target.value}.`; })}
            >
              {Array.from(new Set([user.role, ...ROLES])).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run("Temporary password", async () => {
                const pw = tempPassword();
                await setTemporaryPassword(user.id, pw);
                setShown(pw);
                return "Temporary password set. It is shown once below.";
              })
            }
          >
            Set temporary password
          </Button>
          {!self && (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(user.status === "deactivated" ? "Enable" : "Disable", async () => {
                  const next = user.status === "deactivated" ? "active" : "deactivated";
                  await setUserStatus(user.id, next);
                  return next === "active" ? "User enabled." : "User disabled; they can no longer sign in.";
                })
              }
            >
              {user.status === "deactivated" ? "Enable" : "Disable"}
            </Button>
          )}
          {!self && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(true)}>
              Remove
            </Button>
          )}
        </HStack>
        {shown && (
          <div role="status" className="rounded-[var(--radius)] border border-[var(--border)] p-2 text-[var(--text-xs)]">
            Temporary password (shown once, give it to {user.name} through a private channel):{" "}
            <code className="font-mono break-all select-all">{shown}</code>{" "}
            <Button size="sm" variant="ghost" onClick={() => setShown(null)}>
              I have copied it
            </Button>
          </div>
        )}
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className="text-[var(--text-xs)] text-[var(--fg)] break-words">
            {msg.text}
          </p>
        )}
        <ConfirmDangerous
          open={confirming}
          onClose={() => setConfirming(false)}
          title={`Remove ${user.name}`}
          description="They lose access immediately. This cannot be undone."
          confirmPhrase="REMOVE"
          confirmLabel="Remove user"
          onConfirm={async () => {
            setConfirming(false);
            await run("Remove", async () => { await removeUser(user.id); return "User removed."; });
          }}
        />
      </VStack>
    </Card>
  );
}

function InviteUser({ onInvited }: { onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && name.trim().length >= 2;

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      await inviteUser({ email: email.trim(), name: name.trim(), role });
      setMsg({ ok: true, text: "User created. Set a temporary password on their card so they can sign in." });
      setEmail("");
      setName("");
      onInvited();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <VStack gap="sm">
        <span className="text-[var(--text-sm)] font-medium text-[var(--fg)]">Invite a user</span>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Name</span>
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Email</span>
          <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1">
          <span className={LABEL}>Role</span>
          <select className={INPUT} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}: {ROLE_HELP[r]}
              </option>
            ))}
          </select>
        </label>
        <HStack>
          <Button size="sm" disabled={busy || !valid} onClick={() => void submit()}>
            {busy ? "Creating…" : "Create user"}
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

export function UsersScreen() {
  const { role, email, isLoading: sessionLoading } = useSession();
  const users = useSWR("admin:users", fetchUsers, { revalidateOnFocus: false, shouldRetryOnError: false });

  if (sessionLoading) return <AuthorizingState />;
  if (!canDo(role, "manageUsers")) {
    return <NotAuthorizedState subject="users and their roles" askWho="an administrator" />;
  }

  return (
    <VStack gap="lg">
      <Section
        eyebrow="Access"
        title="Users"
        description="Everyone who can sign in to your organisation, and what each of them may do."
        spacing="sm"
      >
        <VStack gap="sm">
          {users.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : users.error ? (
            <ErrorState
              title="We could not load your users"
              description="The request did not complete. Nothing was changed."
              detail={users.error instanceof Error ? users.error.message : String(users.error)}
              action={
                <Button variant="secondary" size="sm" onClick={() => void users.mutate()}>
                  Try again
                </Button>
              }
            />
          ) : (users.data ?? []).length === 0 ? (
            <EmptyState variant="bordered" title="No users yet" description="Invite the first person below." />
          ) : (
            <ul className="flex flex-col gap-2">
              {(users.data ?? []).map((u) => (
                <li key={u.id}>
                  <UserCard user={u} selfEmail={email ?? ""} onChanged={() => void users.mutate()} />
                </li>
              ))}
            </ul>
          )}
          <InviteUser onInvited={() => void users.mutate()} />
        </VStack>
      </Section>
    </VStack>
  );
}
