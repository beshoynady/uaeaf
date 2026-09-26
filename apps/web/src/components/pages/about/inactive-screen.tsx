import { PageInactiveScreen } from "@/components/pages/page-inactive-screen";
import type { AppLocale } from "@/i18n/routing";
import { findPublicPage } from "@/lib/pages/public-pages";

/**
 * What a visitor sees while the About page is switched off.
 *
 * A call to the shared screen since ADR-0102 §D2 generalised it: fifteen more
 * pages now have the same state, and the composition was already the right one.
 * This wrapper stays so the route reads as it did and the `"about"` registry
 * lookup fails loudly here rather than inside a shared component.
 */
export const AboutInactiveScreen = async ({ locale }: { locale: AppLocale }) => {
  const page = findPublicPage("about");
  if (!page) {
    throw new Error('The "about" page is not registered in PUBLIC_PAGES.');
  }

  return <PageInactiveScreen page={page} locale={locale} />;
};
