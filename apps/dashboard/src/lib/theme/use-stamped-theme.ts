import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

/**
 * The active theme, read from where it actually lives.
 *
 * It is not React state: it is `data-theme` on <html>, which the root layout
 * stamps from the theme cookie and the toggle rewrites without refreshing the
 * server. Anything whose rendering depends on the theme — the toggle's own
 * label, the federation mark — reads it here, through `useSyncExternalStore`,
 * so the DOM stays its only owner. A component that chose from the cookie
 * instead would go on showing the cookie's answer after the page had moved on.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Only the two themes this app renders. There is deliberately no
 *  `prefers-color-scheme` fallback: the generated token CSS has no such rule,
 *  so a dark OS still gets a light page, and whatever reads this must describe
 *  the page. */
function readStampedTheme(): Theme | null {
  const attribute = document.documentElement.getAttribute("data-theme");
  return attribute === "light" || attribute === "dark" ? attribute : null;
}

/** The server renders from the same cookie it stamps on <html>, so its
 *  snapshot is `initialTheme` and hydration matches the page. */
export const useStampedTheme = (initialTheme: Theme): Theme =>
  useSyncExternalStore(
    subscribe,
    () => readStampedTheme() ?? initialTheme,
    () => initialTheme,
  );
