"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

type Theme = "light" | "dark";

/**
 * The active theme is not React state: it is `data-theme` on <html>, which the
 * root layout stamps from the theme cookie and the toggle below rewrites.
 * Reading it through `useSyncExternalStore` keeps the DOM its only owner, so
 * the button is right on its first paint instead of rendering the prop and
 * correcting itself after mount. apps/web's toggle reads it the same way.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Only the two themes this app renders. There is deliberately no
 *  `prefers-color-scheme` fallback: the generated token CSS has no such rule,
 *  so a dark OS still gets a light page, and the button must describe the page. */
function readStampedTheme(): Theme | null {
  const attribute = document.documentElement.getAttribute("data-theme");
  return attribute === "light" || attribute === "dark" ? attribute : null;
}

/**
 * Writes the theme in three places, in this order:
 *   1. `data-theme` on <html> — the immediate visual change (Chapter 7 §7.4)
 *   2. the theme cookie, via the BFF — so the server renders it correctly
 *      on the next request and there is no flash
 *   3. `users.preferredTheme` — so it follows the administrator to their
 *      other devices
 *
 * The attribute is set first and not rolled back if the request fails: the
 * user asked for dark mode and is looking at dark mode. A failed write means
 * the preference does not persist, which the next page load reveals
 * honestly — far better than a switch that visibly flips back under them.
 */
export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const t = useTranslations("Shell");
  // The server renders from the same cookie it stamps on <html>, so its
  // snapshot is `initialTheme` and hydration matches the page.
  const theme = useSyncExternalStore(
    subscribe,
    () => readStampedTheme() ?? initialTheme,
    () => initialTheme,
  );

  async function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    // Writing the attribute is the state change; the observer turns it into a
    // render. There is no second copy to keep in step.
    document.documentElement.setAttribute("data-theme", next);

    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preferredTheme: next }),
    }).catch(() => {
      // Intentionally silent — see the note above.
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? t("switchToLightMode") : t("switchToDarkMode")}
      className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] text-[color:var(--color-text-secondary)] transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
    >
      <span aria-hidden="true" className="text-body">
        {theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
