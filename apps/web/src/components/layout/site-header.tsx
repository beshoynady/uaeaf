import { HeaderShell } from "./header-shell";
import { getHeaderFeatures } from "@/lib/header/features";
import type { AppLocale } from "@/i18n/routing";

/**
 * Global site header.
 *
 * A server component: the panels' cards are read here, once per request and
 * cached for `PUBLIC_REVALIDATE_SECONDS`, so a panel already carries its card
 * in the server-rendered HTML when it opens — no client fetch follows.
 * `HeaderShell` below it owns everything that needs a browser.
 *
 * `locale` is an explicit prop, read by the caller from the route's own
 * `params`, rather than `next-intl/server`'s `getLocale()` — the same
 * convention every other server-rendered page in this app already follows,
 * and one that needs no request context to render in a test.
 */
export const SiteHeader = async ({
  locale,
  activePath,
}: {
  locale: AppLocale;
  activePath?: string;
}) => {
  const features = await getHeaderFeatures(locale);
  return <HeaderShell features={features} activePath={activePath} />;
};
