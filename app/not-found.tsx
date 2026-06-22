import Link from "next/link";

/**
 * Custom 404 — rendered by Next.js for any route that doesn't match.
 * Must be a server component (no "use client") at app/not-found.tsx.
 * Uses CSS variables from globals.css and the shared design system.
 */
export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-[#05070A] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background: [
            "radial-gradient(ellipse 700px 500px at 50% 20%, rgba(124,58,237,0.1), transparent 60%)",
            "radial-gradient(ellipse 400px 300px at 80% 70%, rgba(124,58,237,0.05), transparent 60%)",
          ].join(","),
        }}
      />

      {/* Dot grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.022]"
        style={{
          backgroundImage: "radial-gradient(circle, #a1a1aa 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Card */}
      <div className="w-full max-w-lg text-center">

        {/* 404 large number */}
        <div className="relative mb-8 select-none">
          <span
            className="block font-black text-[9rem] lg:text-[11rem] leading-none tracking-tighter"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.05) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            404
          </span>
          {/* Overlay violet glow line */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-4 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)",
            }}
          />
        </div>

        {/* Label */}
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400 mb-4">
          Route not found
        </p>

        {/* Headline */}
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4 leading-snug">
          This page doesn&apos;t exist<span className="text-violet-400">.</span>
        </h1>

        {/* Sub */}
        <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto mb-10">
          The route you&apos;re looking for has been removed, renamed, or never existed. Head back and we&apos;ll get you where you need to go.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
              boxShadow: "0 0 24px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Back to Home
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-zinc-300 border border-zinc-800 hover:border-zinc-600 hover:text-white transition-colors"
          >
            Contact Support
          </Link>
        </div>

        {/* Status indicator */}
        <div className="mt-12 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-950/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Error 404 — Page not found</span>
        </div>
      </div>
    </main>
  );
}
