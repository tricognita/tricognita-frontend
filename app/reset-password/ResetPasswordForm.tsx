"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Update failed");
      }

      // Requirement: Redirect to dashboard.
      // NOTE: We logout then redirect to login to ensure a fresh session 
      // where mustReset is definitively false.
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
          Target Account
        </label>
        <div className="px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-400 font-mono">
          {email}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
            New Password
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            placeholder="min. 12 characters"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            placeholder="repeat new password"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 px-6 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Committing Updates..." : "Secure Account & Continue"}
      </button>

      <p className="text-[9px] text-zinc-600 leading-relaxed">
        By proceeding, you authorize the encryption of these credentials and the 
        revocation of all temporary bootstrap access tokens associated with this identity.
      </p>
    </form>
  );
}
