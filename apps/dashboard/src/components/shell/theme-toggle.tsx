"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Theme = "light" | "dark";

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
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Reads the attribute the server actually stamped, and nothing else.
  //
  // An earlier version fell back to `prefers-color-scheme` when no attribute
  // was present. That was wrong for this token system: the generated CSS has
  // no `prefers-color-scheme` rule, so a dark OS produced a light page and a
  // button offering to "switch to light" — a control describing a state the
  // user was not in. The layout now always stamps a value, so this only has
  // to agree with it.
  useEffect(() => {
    const attribute = document.documentElement.getAttribute("data-theme");
    if (attribute === "light" || attribute === "dark") {
      setTheme(attribute);
    }
  }, []);

  async function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
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
