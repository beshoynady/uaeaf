import { getTranslations } from "next-intl/server";
import { EmptyState, PageHero, Surface, type BreadcrumbItem } from "@uaeaf/brand-ui";

import { breadcrumbTrail } from "@/components/pages/static-page-screen";
import { CONTAINER } from "@/components/ui/section";
import { findPreparingPage } from "@/lib/pages/public-pages";
import { BreadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";

const KEY = "championships";

/**
 * Championships, in preparation (`PREPARING_PAGES`), on `@uaeaf/brand-ui`.
 *
 * There is no public read for championships yet, so there is no next event to
 * feature on the red ground, no countdown for `StatHighlight` and no podium
 * for `AthleteResultBadge`. Inventing any of them would be federation data
 * nobody published.
 *
 * So the page carries only what the site already has for this destination:
 * the label its link prints as the title, the trail, and the one
 * `Preparing.status` line, now as the kit's empty state.
 */
export const ChampionshipsScreen = async ({ locale }: { locale: AppLocale }) => {
  const page = findPreparingPage(KEY);
  if (!page) throw new Error(`No page in preparation registered for "${KEY}"`);
  const t = await getTranslations({ locale });

  const title = t(page.titleKey);
  const trail = breadcrumbTrail(
    { route: page.route, messageKey: page.titleKey },
    (key) => t(key),
    (key) => t(`Nav.${key}`),
  );
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
      : [{ label: t("Nav.home"), href: `/${locale}` }, { label: title }];

  return (
    <>
      {trail.length > 0 ? (
        <BreadcrumbJsonLd
          locale={locale}
          trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
        />
      ) : null}

      <PageHero title={title} breadcrumb={breadcrumb} breadcrumbLabel={t("Pages.breadcrumbLabel")} />

      <Surface kind="canvas" className="py-[var(--space-16)]">
        <div className={CONTAINER}>
          <EmptyState title={t("Preparing.status")} />
        </div>
      </Surface>
    </>
  );
};
