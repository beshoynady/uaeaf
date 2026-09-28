"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";

type Theme = "light" | "dark";
const STORAGE_KEY = "uaeaf-theme";

/**
 * The active theme is not React state — it is an attribute on `<html>` that
 * an inline script sets before React exists. Reading it through
 * `useSyncExternalStore` leaves the DOM as the single owner, and the button
 * stays correct if anything else changes the attribute — a devtools edit, or
 * the high-contrast bootstrap script overriding it on a media-query change.
 */
const subscribe = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

/** The stored preference, which is what the switch reports while the device's
 *  high-contrast setting is overriding the attribute (ADR-0121 D9). */
const readTheme = (): Theme => {
  const applied = document.documentElement.getAttribute("data-theme");
  if (applied === "dark" || applied === "light") return applied;
  try {
    return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

/** The server cannot know the client's stored theme — that is the whole
 *  reason the bootstrap script is inline and synchronous. Light is the
 *  default the token build declares on bare `:root`. */
const serverTheme = (): Theme => "light";

const SunIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <circle cx="10" cy="10" r="3.5" />
    <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M16 11.5A6.5 6.5 0 118.5 4a5 5 0 107.5 7.5z" />
  </svg>
);

/**
 * Light and dark. High contrast is not a third position here: it follows the
 * device (`prefers-contrast: more`, `forced-colors: active`) and outranks this
 * control, so a switch with a third state would offer a choice the platform
 * has already made (ADR-0121 D9).
 */
export const ThemeSwitch = () => {
  const t = useTranslations("Header");
  const theme = useSyncExternalStore(subscribe, readTheme, serverTheme);

  // Body copied verbatim from `ThemeToggle.toggle` (former theme-toggle.tsx,
  // lines 65-82): the double `requestAnimationFrame`, the write order, and the
  // try/catch around `localStorage`.
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.setAttribute("data-theme-switching", "");
    requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage-blocked contexts: same defensive swallow
      // as the bootstrap script's own try/catch.
    }
  };

  return (
    <button
      type="button"
      role="switch"
      data-tool="theme"
      aria-checked={theme === "dark"}
      aria-label={t("darkMode")}
      onClick={toggle}
      suppressHydrationWarning
      className={`theme-switch relative flex h-11 w-[var(--space-16)] items-center justify-between rounded-full px-2 ${TRANSITION} ${FOCUS}`}
    >
      <SunIcon className="theme-switch-icon size-[var(--icon-size-xs)]" />
      <MoonIcon className="theme-switch-icon size-[var(--icon-size-xs)]" />
      <span aria-hidden="true" className="theme-switch-knob" />
    </button>
  );
};
