"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_ENDONYM, type AppLocale } from "@/i18n/routing";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";

const otherLocale: Record<AppLocale, AppLocale> = { ar: "en", en: "ar" };

/**
 * Names only the destination, in that destination's own script: the one
 * convention a reader who cannot read the current page can still follow.
 * The full name lives in the accessible name and the tooltip, built from
 * `LOCALE_ENDONYM` so it never needs a third locale added twice.
 */
export const LanguageSwitch = () => {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations("Header");
  const other = otherLocale[locale];
  const label = t("switchLanguageFull", { language: LOCALE_ENDONYM[other] });

  return (
    <Link
      href={pathname}
      locale={other}
      lang={other}
      hrefLang={other}
      data-tool="language"
      title={label}
      aria-label={label}
      className={`flex size-11 items-center justify-center rounded-full text-label font-medium ${TRANSITION} ${FOCUS}`}
    >
      {other === "en" ? "EN" : "ع"}
    </Link>
  );
};
