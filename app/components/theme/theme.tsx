"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface ThemeApi {
  theme: Theme;
  toggle: (e?: { clientX: number; clientY: number }) => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeApi>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
});

// The `data-theme` attribute on <html> IS the source of truth (set pre-hydration
// by ThemeScript). We subscribe to it as an external store — hydration-safe and
// free of synchronous setState-in-effect.
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const getSnapshot = (): Theme =>
  (document.documentElement.dataset.theme as Theme) === "light" ? "light" : "dark";
const getServerSnapshot = (): Theme => "dark";

/**
 * Drives an animated theme swap via the View Transitions API (circular reveal
 * from the toggle) with a graceful cross-fade fallback. A single `data-theme`
 * attribute + CSS variables mean zero duplicated styling across both themes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const apply = useCallback((t: Theme) => {
    const el = document.documentElement;
    el.dataset.theme = t; // → MutationObserver → useSyncExternalStore re-render
    el.style.colorScheme = t;
    try {
      localStorage.setItem("theme", t);
    } catch {
      /* private mode — persistence is best-effort */
    }
  }, []);

  const toggle = useCallback(
    (e?: { clientX: number; clientY: number }) => {
      const next: Theme =
        document.documentElement.dataset.theme === "light" ? "dark" : "light";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const startVT = (document as unknown as {
        startViewTransition?: (cb: () => void) => { ready: Promise<void> };
      }).startViewTransition;

      if (startVT && e && !reduced) {
        const { clientX: x, clientY: y } = e;
        const end = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y),
        );
        const vt = startVT.call(document, () => apply(next));
        vt.ready.then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${end}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 480,
              easing: "cubic-bezier(.22,1,.36,1)",
              pseudoElement: "::view-transition-new(root)",
            },
          );
        });
      } else {
        const el = document.documentElement;
        el.classList.add("theme-anim");
        apply(next);
        window.setTimeout(() => el.classList.remove("theme-anim"), 520);
      }
    },
    [apply],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

/**
 * Runs before hydration to set the theme from persisted preference or the OS
 * setting — prevents any flash of the wrong theme (FOUC). Rendered in <head>.
 */
export function ThemeScript() {
  const js =
    "(function(){try{var t=localStorage.getItem('theme');" +
    "if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}" +
    "var e=document.documentElement;e.dataset.theme=t;e.style.colorScheme=t;}" +
    "catch(_){document.documentElement.dataset.theme='dark';}})();";
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
