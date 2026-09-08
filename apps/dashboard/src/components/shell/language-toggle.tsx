"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/**
 * Switches language and persists the choice to `users.preferredLanguage`.
 *
 * The persist call is awaited before navigating, unlike the theme toggle:
 * the destination page is rendered by the server, and the server reads the
 * locale cookie this request sets. Navigating first would race the write and
 * could land the user back in the language they just left.
 */
export function LanguageToggle({ locale }: { locale: AppLocale }) {
  const t = useTranslations("Shell");
  const pathname = usePathname();
  const target: AppLocale = locale === "ar" ? "en" : "ar";

  async function switchLanguage() {
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preferredLanguage: target }),
    }).catch(() => {
      // A failed persist still lets the switch happen for this visit — the
      // navigation below carries the locale in the URL either way.
    });

    // A full document load: `lang`, `dir` and the body font class all live
    // on the server-rendered <html>, so a soft navigation would leave an
    // Arabic document showing English copy.
    window.location.assign(`/${target}${pathname === "/" ? "" : pathname}`);
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      aria-label={target === "en" ? t("switchToEnglish") : t("switchToArabic")}
      className="flex h-10 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] px-3 text-label font-medium text-[color:var(--color-text-secondary)] transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-focus-default)] active:bg-[color:var(--color-surface-skeleton)]"
    >
      {target === "en" ? "EN" : "ع"}
    </button>
  );
}
