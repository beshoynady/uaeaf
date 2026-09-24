import { getTranslations } from "next-intl/server";
import { EmptyState, PageHero, Surface, type BreadcrumbItem } from "@uaeaf/brand-ui";

import { breadcrumbTrail, loadStaticPage } from "@/components/pages/static-page-screen";
import { CONTAINER } from "@/components/ui/section";
import { BreadcrumbJsonLd, CollectionPageJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";

const KEY = "records";

/**
 * National records, on `@uaeaf/brand-ui`: the ink hero and an empty state.
 *
 * No public read for ratified records exists upstream, so there is no record
 * to feature on the red ground and no podium for `AthleteResultBadge`:
 * inventing either would be federation data nobody ratified. The empty state
 * says what the page is instead of letting it end at the hero.
 */
export const RecordsScreen = async ({ locale }: { locale: AppLocale }) => {
  const [{ page, title, subtitle }, tPages, tNav, tPreparing] = await Promise.all([
    loadStaticPage(KEY, locale),
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Preparing" }),
  ]);

  const trail = breadcrumbTrail(page, (key) => tPages(key), (key) => tNav(key));
  // IA §8.5 makes a trail mandatory only from depth 2; a top-level page has
  // none of its own, so the hero shows home and the page itself.
  const breadcrumb: BreadcrumbItem[] =
    trail.length > 0
      ? trail.map((crumb, index) => ({
          label: crumb.name,
          href:
            index === trail.length - 1 || crumb.route === null
              ? undefined
              : `/${locale}${crumb.route === "/" ? "" : crumb.route}`,
        }))
      : [{ label: tNav("home"), href: `/${locale}` }, { label: title }];

  return (
    <>
      {/* No `items`: Chapter 14 §4 forbids describing content the page does
          not show. */}
      <CollectionPageJsonLd locale={locale} route={page.route} name={title} description={subtitle ?? title} />
      {trail.length > 0 ? (
        <BreadcrumbJsonLd
          locale={locale}
          trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
        />
      ) : null}

      <PageHero
        title={title}
        description={subtitle ?? undefined}
        breadcrumb={breadcrumb}
        breadcrumbLabel={tPages("breadcrumbLabel")}
      />

      <Surface kind="canvas" className="py-[var(--space-16)]">
        <div className={CONTAINER}>
          <EmptyState title={tPreparing("status")} />
        </div>
      </Surface>
    </>
  );
};
