"use client";

import { useLayoutEffect } from "react";

/**
 * The product screens are built on the dark palette (cards, headings and tables use it directly) and the shell
 * has no theme switch. The root ThemeScript follows the visitor's OS preference, so on a light-mode OS every
 * heading and card in the product came out near-invisible. The product is therefore always dark: this sets it
 * for as long as a product screen is mounted and puts the visitor's own choice back for the marketing site.
 * Nothing is written to localStorage, so the visitor's stored preference is untouched. A direct load of a
 * /dashboard URL is handled before first paint by ThemeScript; this covers client-side navigation.
 */
export function ForceDarkTheme() {
  useLayoutEffect(() => {
    const el = document.documentElement;
    const prevTheme = el.dataset.theme;
    const prevScheme = el.style.colorScheme;
    el.dataset.theme = "dark";
    el.style.colorScheme = "dark";
    return () => {
      if (prevTheme) el.dataset.theme = prevTheme;
      el.style.colorScheme = prevScheme;
    };
  }, []);
  return null;
}
