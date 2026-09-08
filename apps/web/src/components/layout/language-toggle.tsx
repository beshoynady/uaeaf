"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import type { AppLocale } from "@/i18n/routing";

const otherLocale: Record<AppLocale, AppLocale> = { ar: "en", en: "ar" };

/**
 * Real AR|EN toggle (i18n foundation, 2026-09-07). Deliberately a navigation
 * `Link` to the other locale rather than a client-side state toggle: switching
 * language changes the URL (`/ar/...` ↔ `/en/...`), so a link is the correct
 * semantic control (WAI-ARIA: links navigate, buttons act in place) —
 * previously a static, non-functional `<button>` (see deviation log D-i18n-1).
 */
export function LanguageToggle() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations("Header");

  return (
    <Link
      href={pathname}
      locale={otherLocale[locale]}
      aria-label={t("switchLanguage")}
      // 44px minimum touch target (IA §12 KPI). The label is two
      // characters wide, so without a floor the hit area is smaller than a
      // fingertip on the layer PR-006 calls mobile-priority.
      className={`inline-flex min-h-11 items-center rounded-xs px-2 text-label font-medium whitespace-nowrap hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-secondary)] ${TRANSITION} ${FOCUS}`}
    >
      AR | EN
    </Link>
  );
}
