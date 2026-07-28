"use client";

import { useTheme } from "./theme";

/**
 * Animated dark/light toggle. The sun/moon crossfade + rotate on switch; the
 * actual theme swap is a circular View-Transition reveal driven by the provider.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={(e) => toggle({ clientX: e.clientX, clientY: e.clientY })}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={
        "relative grid h-9 w-9 place-items-center rounded-lg border border-hair " +
        "text-fg/70 transition-colors hover:text-fg hover:border-[var(--hair-strong)] " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] " +
        className
      }
    >
      <span className="sr-only">Toggle theme</span>
      {/* Sun */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="absolute h-[18px] w-[18px] transition-all duration-500"
        style={{
          opacity: theme === "light" ? 1 : 0,
          transform: theme === "light" ? "rotate(0) scale(1)" : "rotate(-90deg) scale(.4)",
        }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      {/* Moon */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="absolute h-[18px] w-[18px] transition-all duration-500"
        style={{
          opacity: theme === "dark" ? 1 : 0,
          transform: theme === "dark" ? "rotate(0) scale(1)" : "rotate(90deg) scale(.4)",
        }}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    </button>
  );
}
