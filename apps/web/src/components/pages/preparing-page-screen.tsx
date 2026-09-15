import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { breadcrumbTrail, isInstitutional } from "@/components/pages/static-page-screen";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import type { AppLocale } from "@/i18n/routing";
import { findPreparingPage, type PreparingPage } from "@/lib/pages/public-pages";
import { BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * A page in preparation (`PREPARING_PAGES`): a destination the site already
 * links to, answered with a page instead of the 404 (batch brief 2026-09-15
 * §6.4).
 *
 * The listing pages' structure, `PageHero` then a band, carrying only what the
 * site already has for this destination: the label its link prints, as the
 * title; the trail; and the one `Preparing.status` line. No subtitle and no
 * other copy, because none has been written for it.
 *
 * About and every page under it keep the trail in structured data only, not in
 * the hero (owner decision 2026-09-15). Elsewhere the hero shows it, as on the
 * listing pages. Both follow IA §8.5's depth rule through `breadcrumbTrail`.
 */

const pageFor = (key: string): PreparingPage => {
  const page = findPreparingPage(key);
  if (!page) throw new Error(`No page in preparation registered for "${key}"`);
  return page;
};

export const buildPreparingPageMetadata = async (key: string, locale: AppLocale): Promise<Metadata> => {
  const page = pageFor(key);
  const t = await getTranslations({ locale });

  return buildMetadata({
    locale,
    route: page.route,
    title: `${t(page.titleKey)} | ${t("Metadata.title")}`,
    // The site's description: the fallback a listing page without a subtitle
    // takes, since this page has no summary of its own.
    description: t("Metadata.description"),
    // Chapter 14 §11: a title and a status line do not meet the threshold.
    indexable: false,
  });
};

export const PreparingPageScreen = async ({ pageKey, locale }: { pageKey: string; locale: AppLocale }) => {
  const page = pageFor(pageKey);
  const t = await getTranslations({ locale });

  const title = t(page.titleKey);
  const trail = breadcrumbTrail(
    { route: page.route, messageKey: page.titleKey },
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
        <p className="max-w-[68ch] text-body-lg text-[color:var(--color-text-secondary)]">{t("Preparing.status")}</p>
      </Section>
    </>
  );
};
