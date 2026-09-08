"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";

type Theme = "light" | "dark";
const STORAGE_KEY = "uaeaf-theme";

/**
 * The active theme is not React state — it is an attribute on `<html>` that
 * an inline script sets before React exists. Mirroring it into `useState`
 * inside an effect made React the second owner of one value, which is what
 * `react-hooks/set-state-in-effect` was reporting; reading it through
 * `useSyncExternalStore` leaves the DOM as the single owner and removes the
 * cascading render on mount.
 *
 * The observer also means the button stays correct if anything else changes
 * the attribute — a second toggle, a devtools edit, a future
 * high-contrast control — instead of only being right because it happens to
 * be the only writer today.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** The server cannot know the client's stored theme — that is the whole
 *  reason the bootstrap script is inline and synchronous. Light is the
 *  default the token build declares on bare `:root`. */
function serverTheme(): Theme {
  return "light";
}

/**
 * Real light/dark toggle (frontend build-out, 2026-09-07). Replaces the
 * inert `☾` button in `site-header.tsx` (deviation D12) — `layout.tsx`'s
 * inline bootstrap script only ever READS `localStorage[uaeaf-theme]` /
 * `matchMedia` and sets `data-theme`; nothing WROTE to it. This is the writer.
 *
 * Initializes from `document.documentElement`'s `data-theme` attribute
 * (already set, synchronously, by the bootstrap script before this component
 * mounts) rather than re-reading localStorage/matchMedia itself, so there is
 * exactly one place in the app that resolves the initial theme decision.
 *
 * The server can't know the client's stored theme (that's the whole reason
 * the bootstrap script is an inline synchronous script rather than a React
 * effect), so this button's rendered label/icon necessarily differs between
 * SSR and the client's first paint. `suppressHydrationWarning` here mirrors
 * the same escape hatch `layout.tsx` already uses on `<html>` for the exact
 * same reason — not a new pattern.
 *
 * Two states only (light/dark) — high-contrast (S12, kickoff doc) is a
 * separate, still-open Chapter 6 accessibility-compliance question, not
 * bundled in here.
 */
export function ThemeToggle() {
  const t = useTranslations("Header");
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    // Writing the attribute is the state change; the observer above turns it
    // back into a render. There is no second copy to keep in step.
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage-blocked contexts: same defensive swallow
      // as the bootstrap script's own try/catch. The toggle still works for
      // the current page load, it just won't persist across a reload.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={theme === "dark" ? t("switchToLightMode") : t("switchToDarkMode")}
      // `size-11` is the 44px touch target IA §12 states as a KPI for every
      // small screen; the glyph inside stays at its original size.
      className={`flex size-11 items-center justify-center rounded-xs text-body font-bold hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)] ${TRANSITION} ${FOCUS}`}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
