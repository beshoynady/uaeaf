import { getTranslations } from "next-intl/server";
import { EmptyState, PageHero, SectionHeading, Surface } from "@uaeaf/brand-ui";

import { breadcrumbTrail, isInstitutional, loadStaticPage, text } from "@/components/pages/static-page-screen";
import { heroPhotoSlot } from "@/components/ui/hero-photo";
import { visibleTrail } from "@/components/ui/visible-trail";
import { CONTAINER } from "@/components/ui/section";
import type { CommitteesPage } from "@/lib/api/types";
import { AboutPageJsonLd, BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";

const KEY = "committees";

/**
 * Committees, on `@uaeaf/brand-ui`.
 *
 * The page's only body content is the editor's introduction, so it is the
 * one coloured section: the green identity ground, matching the page's green
 * register (ADR-0060 D1). No committee list is served yet, so there are no
 * cards; with no introduction either, the page says it is in preparation
 * rather than ending at the hero.
 */
export const CommitteesScreen = async ({ locale }: { locale: AppLocale }) => {
  const [{ page, record, title, subtitle, heroImage }, tPages, tNav, tPreparing] = await Promise.all([
    loadStaticPage<CommitteesPage>(KEY, locale),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Preparing" }),
  ]);
  const introHeading = text(record?.introHeading, locale);
  const introText = text(record?.introText, locale);

  const trail = breadcrumbTrail(page, (key) => tPages(key), (key) => tNav(key));
  // ADR-0072 D7: an `/about` page emits its trail to `BreadcrumbJsonLd` and
  // draws none. Drawn, this one also announced two current pages — the kit marks
  // every step without an `href` as the current one, and "About" has no landing
  // page of its own (IA §8.1).
  const breadcrumb = isInstitutional(page.route) ? undefined : visibleTrail(trail, locale);

  return (
    <>
      <AboutPageJsonLd locale={locale} route={page.route} name={title} description={subtitle ?? title} />
      <BreadcrumbJsonLd
        locale={locale}
        trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
      />

      <PageHero
        title={title}
        description={subtitle ?? undefined}
        media={heroPhotoSlot(heroImage, locale)}
        breadcrumb={breadcrumb}
        breadcrumbLabel={tPages("breadcrumbLabel")}
      />

      {introText ? (
        <Surface kind="brand-green" className="py-[var(--space-16)]">
          <div className={CONTAINER}>
            {introHeading ? <SectionHeading title={introHeading} /> : null}
            {/* `whitespace-pre-line` because the editor's field is a multiline
                textarea; collapsing its paragraphs would discard their
                structure. White only on this ground (ADR-0098 §8.2). */}
            <p className="max-w-[68ch] whitespace-pre-line text-body-lg text-[color:var(--surface-text)]">
              {introText}
            </p>
          </div>
        </Surface>
      ) : (
        <Surface kind="canvas" className="py-[var(--space-16)]">
          <div className={CONTAINER}>
            <EmptyState title={tPreparing("status")} />
          </div>
        </Surface>
      )}
    </>
  );
};
