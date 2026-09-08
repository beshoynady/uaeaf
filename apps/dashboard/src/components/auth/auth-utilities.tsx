"use client";

import { useTranslations } from "next-intl";
import { THEME_COOKIE } from "@/lib/auth/cookies";
import type { AppLocale } from "@/i18n/routing";

/**
 * Language and theme, for a visitor who has no session yet.
 *
 * The signed-in shell's toggles both persist through `PATCH /api/preferences`,
 * which requires a token — so on these screens they would 401 and do
 * nothing. Neither preference needs the server here: the locale lives in the
 * URL, and the theme lives in a cookie that is deliberately readable by
 * JavaScript (lib/auth/cookies.ts). After sign-in the user's stored
 * `preferredLanguage`/`preferredTheme` take over regardless of what was
 * chosen on this screen, so nothing is lost by not writing them now.
 *
 * This closes a real gap rather than adding decoration: the previous login
 * page carried no controls at all, so an English-speaking administrator who
 * landed on `/ar/login` had no way to read it.
 */
export function AuthUtilities({ locale, theme }: { locale: AppLocale; theme: "light" | "dark" }) {
  const t = useTranslations("Shell");
  const otherLocale: AppLocale = locale === "ar" ? "en" : "ar";

  function switchTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    // Mirrors preferenceCookieOptions: same name, path and 7-day life, so
    // the server renders the same theme on the next request.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
  }

  function switchLanguage() {
    // A full document load, not a router push: `lang`, `dir` and the body
    // font class are all rendered on <html> by the server.
    const { pathname, search } = window.location;
    window.location.assign(`/${otherLocale}${pathname.replace(/^\/[^/]+/, "")}${search}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={switchLanguage}
        aria-label={otherLocale === "en" ? t("switchToEnglish") : t("switchToArabic")}
        className="flex h-10 items-center rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-3 text-label font-medium text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
      >
        {otherLocale === "en" ? "EN" : "ع"}
      </button>
      <button
        type="button"
        onClick={switchTheme}
        aria-label={theme === "dark" ? t("switchToLightMode") : t("switchToDarkMode")}
        className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-fast)] hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
      >
        <span aria-hidden="true" className="text-body">
          {theme === "dark" ? "☀" : "☾"}
        </span>
      </button>
    </div>
  );
}
