"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { LOCALE_ENDONYM, type AppLocale } from "@/i18n/routing";

const otherLocale: Record<AppLocale, AppLocale> = { ar: "en", en: "ar" };

/**
 * Real AR|EN toggle (i18n foundation, 2026-09-07). Deliberately a navigation
 * `Link` to the other locale rather than a client-side state toggle: switching
 * language changes the URL (`/ar/...` ↔ `/en/...`), so a link is the correct
 * semantic control (WAI-ARIA: links navigate, buttons act in place) —
 * previously a static, non-functional `<button>` (see deviation log D-i18n-1).
 *
 * ── The label (2026-09-08) ─────────────────────────────────────────────────
 *
 * It read `AR | EN` in both locales. That names the language you are already
 * in alongside the one you would get, so it reads as a status indicator, not
 * as an action, and it never says which half is current — the visible text
 * carried no state at all while `aria-label` did. Screen-reader users heard
 * "Switch to English" and sighted users saw both codes.
 *
 * A switcher names its DESTINATION, and names it in the destination's own
 * script: on the Arabic page it says "English", on the English page
 * "العربية". Written that way it is legible precisely to the reader who
 * cannot read the current page — the only reader who needs it.
 *
 * `lang` on the label is what makes that true rather than decorative: without
 * it a screen reader pronounces "العربية" with an English voice, and the
 * Arabic string renders in the Latin face (Chapter 4 §4.3 binds the family to
 * the language, not to the document).
 */
export function LanguageToggle() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations("Header");
  const target = otherLocale[locale];

  return (
    <Link
      href={pathname}
      locale={target}
      // The accessible name is the full action ("Switch to العربية"); the
      // visible text is its last word. WCAG 2.2 SC 2.5.3 Label in Name
      // requires the visible label to appear IN the accessible name, so the
      // message takes the endonym as a parameter rather than hardcoding the
      // other language's name in each translation — a fixed "Switch to
      // Arabic" against a visible "العربية" would fail 2.5.3 outright, and
      // would silently break the moment a third locale is added.
      aria-label={t("switchLanguage", { language: LOCALE_ENDONYM[target] })}
      // 44px minimum touch target (IA §12 KPI). The label is one short word,
      // so without a floor the hit area is smaller than a fingertip on the
      // layer PR-006 calls mobile-priority.
      className={`inline-flex min-h-11 items-center rounded-xs px-2 text-label font-medium whitespace-nowrap hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)] ${TRANSITION} ${FOCUS}`}
    >
      <span lang={target}>{LOCALE_ENDONYM[target]}</span>
    </Link>
  );
}
