// Shared className constants for the authentication pages (login + register).
// These are the EXACT strings previously duplicated inline in both ClientPage
// files — extracted verbatim so the rendered DOM is byte-identical (zero visual
// regression). The auth surface keeps its local zinc/violet treatment on
// purpose; re-theming it to the ink/matcha tokens would change appearance and
// is intentionally out of scope (see DESIGN_SYSTEM_REFACTOR_REPORT.md).
//
// Full string literals are kept intact so Tailwind v4's content scanner still
// detects every utility class.

export const AUTH_INPUT =
  "w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";

export const AUTH_INPUT_CENTER =
  "w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5 text-center text-xl tracking-widest text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";

export const AUTH_SUBMIT =
  "w-full px-4 py-2.5 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-60 disabled:cursor-not-allowed";
