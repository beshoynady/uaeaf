import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import arMessages from "../../messages/ar.json";
import enMessages from "../../messages/en.json";
import type { AppLocale } from "@/i18n/routing";

const messagesByLocale: Record<AppLocale, typeof arMessages> = {
  ar: arMessages,
  en: enMessages,
};

/** Shared test helper: every component under `src/components` now depends on
 * next-intl's context, so every test needs this wrapper instead of a bare
 * `render()`. Defaults to `ar` so existing single-locale tests need no change
 * beyond the import. */
export function renderWithIntl(ui: ReactElement, locale: AppLocale = "ar") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}
