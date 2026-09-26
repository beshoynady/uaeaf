import { getTranslations } from "next-intl/server";
import { breadcrumbTrail, isInstitutional } from "@/components/pages/static-page-screen";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import { fetchPublic } from "@/lib/api/public-client";
import { isServed, withheldMessage } from "@/lib/pages/activation";
import { findPublicPage, type PublicPage } from "@/lib/pages/public-pages";
import { BreadcrumbJsonLd } from "@/lib/seo/json-ld";

/**
 * What a visitor sees while a page is switched off (ADR-0102 §D2).
 *
 * The same composition `PreparingPageScreen` draws, because to a visitor the two
 * situations are the same situation: the address works, the page is named, and
 * its content is not ready. What differs is only where the two get their page
 * from — that one resolves it out of `PREPARING_PAGES`, and these pages are
 * *built* public pages whose content is temporarily withheld, so they stay in
 * `PUBLIC_PAGES` where the sitemap and `findPublicPage` can keep telling the
 * truth about them.
 *
 * Written for About and generalised to every page with a switch. The one line of
 * copy is the federation's own `maintenanceMessage`, with the site's
 * in-preparation sentence as the fallback (§D5).
 *
 * The route's own `generateMetadata` marks this state `noindex`: a title and a
 * status line do not meet Chapter 14 §11's content threshold. The route answers
 * **200**, not 404 — the address is real.
 */
export const PageInactiveScreen = async ({
  page,
  locale,
}: {
  page: PublicPage;
  locale: AppLocale;
}) => {
  const t = await getTranslations({ locale });
  const title = t(`Pages.${page.messageKey}`);
  const message = await withheldMessage(locale);

  const trail = breadcrumbTrail(
    { route: page.route, messageKey: `Pages.${page.messageKey}` },
    (key) => t(key),
    (key) => t(`Nav.${key}`),
  );

  return (
    <>
      {trail.length > 0 ? (
        <BreadcrumbJsonLd
          locale={locale}
          trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
        />
      ) : null}

      <PageHero
        register={page.register}
        title={title}
        subtitle={null}
        titleId={`page-title-${page.key}`}
        locale={locale}
        breadcrumb={
          trail.length > 0 && !isInstitutional(page.route) ? (
            <Breadcrumb trail={trail} label={t("Pages.breadcrumbLabel")} register={page.register} />
          ) : null
        }
      />

      <Section className="py-12 md:py-16">
        <p className="max-w-[68ch] text-body-lg text-[color:var(--color-text-secondary)]">{message}</p>
      </Section>
    </>
  );
};

/**
 * The in-preparation page when this one is switched off, or `null` when it is
 * being served.
 *
 * One line at the top of each public route:
 *
 *   const withheld = await withheldPage(KEY, locale);
 *   if (withheld) return withheld;
 *
 * A helper rather than a condition written out per route, because there are
 * sixteen of them and the one that was forgotten would be a page still showing
 * content the federation had switched off. Returning the element rather than a
 * boolean is what makes the call one line: a hook cannot render in the caller's
 * place, so it hands back what to render instead.
 *
 * The record read here is the one the route reads anyway, and Next.js dedupes
 * identical requests within a render — so the gate costs no extra round trip.
 */
export const withheldPage = async (key: string, locale: AppLocale) => {
  const page = findPublicPage(key);
  if (!page) {
    throw new Error(`No public page registered for "${key}"`);
  }

  const record = await fetchPublic<{ isActive?: boolean }>(page.apiPath);
  if (isServed(record)) {
    return null;
  }

  return <PageInactiveScreen page={page} locale={locale} />;
};
