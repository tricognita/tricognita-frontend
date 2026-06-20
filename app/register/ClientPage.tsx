"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Registration failed.");
        return;
      }
      setSuccess(true);
      // Auto-redirect to login after 2 seconds
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-xs font-bold text-white">T</span>
            <span className="text-sm font-semibold tracking-tight">TRICOGNITA</span>
          </Link>
          <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Already have an account? Sign in →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-950/40 text-violet-300 ring-1 ring-violet-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Free Trial — No credit card required
            </span>
          </div>

          <h1 className="text-3xl font-bold text-zinc-50 text-center mb-2">Create your account</h1>
          <p className="text-sm text-zinc-500 text-center mb-8">
            Start scanning your AWS environment in minutes.
          </p>

          {success ? (
            <div className="rounded-xl bg-emerald-950/40 border border-emerald-700/50 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-emerald-400 font-semibold mb-1">Account created!</h2>
              <p className="text-zinc-400 text-sm">Redirecting you to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Jane Smith"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700
                             text-zinc-100 placeholder-zinc-600 text-sm
                             focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40
                             transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="block text-xs font-medium text-zinc-400 mb-1.5">Work Email</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  placeholder="jane@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700
                             text-zinc-100 placeholder-zinc-600 text-sm
                             focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40
                             transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="reg-password" className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="Min. 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700
                             text-zinc-100 placeholder-zinc-600 text-sm
                             focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40
                             transition-colors"
                />
              </div>

              {/* Confirm password */}
              <div>
                <label htmlFor="reg-confirm" className="block text-xs font-medium text-zinc-400 mb-1.5">Confirm Password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.confirm}
                  onChange={set("confirm")}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700
                             text-zinc-100 placeholder-zinc-600 text-sm
                             focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40
                             transition-colors"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-950/50 border border-red-700/50 px-3.5 py-2.5 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500
                           disabled:opacity-50 disabled:cursor-not-allowed
                           text-white text-sm font-semibold transition-colors
                           focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : "Create Account"}
              </button>

              {/* Terms */}
              <p className="text-center text-[11px] text-zinc-600">
                By registering you agree to our{" "}
                <Link href="/terms" className="text-zinc-400 hover:text-zinc-200 underline">Terms</Link>
                {" & "}
                <Link href="/privacy" className="text-zinc-400 hover:text-zinc-200 underline">Privacy Policy</Link>.
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
