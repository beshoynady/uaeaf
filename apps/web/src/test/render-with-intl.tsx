import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { loadMessages } from "@/i18n/messages";
import type { AppLocale } from "@/i18n/routing";

const messagesByLocale: Record<AppLocale, ReturnType<typeof loadMessages>> = {
  ar: loadMessages("ar"),
  en: loadMessages("en"),
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
