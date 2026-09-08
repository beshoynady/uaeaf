import { notFound } from "next/navigation";
import { isAppLocale, type AppLocale } from "./routing";

/**
 * Narrows the `[locale]` route param from `string` to `AppLocale`.
 *
 * Next.js 16 generates a route-type validator that requires every page and
 * layout to declare `params` as `Promise<{ locale: string }>` — declaring
 * the narrower union directly fails the build, because a page must accept
 * whatever the router hands it. So the narrowing happens here instead, once,
 * with the same `notFound()` the root layout applies to an unknown locale.
 */
export async function resolveLocale(params: Promise<{ locale: string }>): Promise<AppLocale> {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }
  return locale;
}
