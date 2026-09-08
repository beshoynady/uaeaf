import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import arabic from "../../messages/ar.json";
import english from "../../messages/en.json";
import type { AppLocale } from "@/i18n/routing";

const MESSAGES = { ar: arabic, en: english };

/** Renders with the real message catalogue rather than stubs, so a test
 *  fails when a translation key is missing — which is the failure mode that
 *  actually ships (a key rendered verbatim in the UI). */
export function renderWithIntl(ui: ReactElement, locale: AppLocale = "ar") {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}
