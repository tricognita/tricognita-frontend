"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { AUTH_INPUT, AUTH_INPUT_CENTER, AUTH_SUBMIT } from "@/app/components/ui/authStyles";

// Allow only same-origin absolute paths. Blocks "//evil.com", "/\evil.com",
// "http://…", and any other attempt to break out of the app origin.
function safeNext(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/")) return "/dashboard";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/dashboard";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const expired = params.get("expired") === "1";
  const deleted = params.get("deleted") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState<string | null>(
    expired
      ? "Your session expired. Please sign in again."
      : deleted
        ? "Your account has been deleted."
        : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(showMfa ? { email, password, mfaCode } : { email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error || "Invalid credentials");
        setLoading(false);
        return;
      }
      if (body.mfa_required) {
        setShowMfa(true);
        setError(null);
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (showMfa) {
    return (
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="mfaCode" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Authenticator Code
          </label>
          <input
            id="mfaCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className={AUTH_INPUT_CENTER}
            placeholder="000000"
          />
        </div>
        {error && (
          <div role="alert" className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || mfaCode.length !== 6}
          className={AUTH_SUBMIT}
        >
          {loading ? "Verifying…" : "Verify"}
        </button>
        <button
          type="button"
          onClick={() => setShowMfa(false)}
          className="w-full text-xs text-zinc-500 hover:text-zinc-400 mt-2"
        >
          Back to login
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Work Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={AUTH_INPUT}
          placeholder="you@company.com"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Password
          </label>
          <Link href="/contact" className="text-xs text-violet-400 hover:text-violet-300">
            Forgot?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={AUTH_INPUT}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={AUTH_SUBMIT}
      >
        {loading ? "Authenticating…" : "Sign in to Tricognita"}
      </button>

      <p className="text-xs text-zinc-500 text-center pt-2">
        New to Tricognita?{" "}
        <Link href="/register" className="text-violet-400 hover:text-violet-300 font-semibold">
          Request an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-violet-500 rounded">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img src="/brand/tricognita-mark.png" alt="Tricognita" width={24} height={24} style={{ width: 24, height: 24 }} />
            <span className="text-sm font-semibold tracking-tight">TRICOGNITA</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
            <img
              src="/brand/tricognita-mark.png"
              alt="Tricognita"
              width={64}
              height={64}
              className="mx-auto mb-5"
              style={{ width: 64, height: 64 }}
            />
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/40 text-violet-300 ring-1 ring-violet-800/60 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Secure Customer Portal
            </span>
            <h1 className="text-2xl font-bold text-zinc-50">Welcome back</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Sign in to access the ARIA control plane.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur">
            <Suspense fallback={<div className="text-sm text-zinc-500">Loading…</div>}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="mt-6 text-center text-[11px] text-zinc-600">
            Protected by JIT-signed sessions · SOC 2 Type II · ISO 27001
          </p>
        </div>
      </main>
    </div>
  );
}
