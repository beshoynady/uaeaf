import { getTranslations } from "next-intl/server";
import { PageHero, type BreadcrumbItem } from "@uaeaf/brand-ui";
import { breadcrumbTrail } from "@/components/pages/static-page-screen";
import { heroPhotoSlot } from "@/components/ui/hero-photo";
import { findPublicPage } from "@/lib/pages/public-pages";
import { BreadcrumbJsonLd, CollectionPageJsonLd } from "@/lib/seo/json-ld";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The hero of an editorial listing page (news, albums), drawn with the kit's
 * `PageHero`: the record's photograph on the first screen where it has one, and
 * the ink ground with its mesh where it has none (ADR-0098 D2).
 *
 * It replaces `StaticPageScreen` for these pages, so it also carries what that
 * screen emitted beside its hero and nothing else: the `CollectionPage` block
 * with the names actually rendered (Chapter 14 §4), and the breadcrumb block
 * wherever the page has a trail. The title and the sentence stay the page
 * record's own, read by `loadStaticPage` as before.
 *
 * The photograph is passed through `heroPhotoSlot`, which is also what decides
 * the composition: ADR-0098 D2 made this hero photograph-free and dropped the
 * picture these records carry, and the owner reversed that on 2026-09-25. A
 * record with no picture is unchanged from D2.
 *
 * ── The visible trail ──────────────────────────────────────────────────────
 *
 * `PageHero` always draws a breadcrumb, and IA §8.5 makes one mandatory only
 * from depth two. A top-level page therefore shows "Home › <page>", the
 * shortest trail that is still true. A trail step with no destination of its
 * own (the Media Centre has no landing page, IA §8.1) is left out of the
 * visible trail: the kit marks every step without a link as the current page,
 * and a second "current page" would be a false statement to a screen reader.
 */
export const EditorialHero = async ({
  pageKey,
  locale,
  title,
  subtitle,
  heroImage,
  itemNames,
}: {
  pageKey: string;
  locale: AppLocale;
  title: string;
  subtitle: string | null;
  /** From `loadStaticPage`. Its presence is what gives the hero the first
   *  screen and the photographic treatment (ADR-0067 D2). */
  heroImage?: MediaAssetPublic;
  /** The names the page is rendering, in order, for the `ItemList`. */
  itemNames?: readonly string[];
}) => {
  const page = findPublicPage(pageKey);
  if (!page) throw new Error(`No public page registered for "${pageKey}"`);

  const [t, nav] = await Promise.all([
    getTranslations({ locale, namespace: "Pages" }),
    getTranslations({ locale, namespace: "Nav" }),
  ]);

  const trail = breadcrumbTrail(page, (key) => t(key), (key) => nav(key));
  const href = (route: string) => (route === "/" ? `/${locale}` : `/${locale}${route}`);

  const visible: BreadcrumbItem[] =
    trail.length > 0
      ? trail
          .filter((crumb) => crumb.route !== null)
          .map((crumb, index, all) =>
            index === all.length - 1 ? { label: title } : { label: crumb.name, href: href(crumb.route!) },
          )
      : [{ label: nav("home"), href: href("/") }, { label: title }];

  return (
    <>
      <CollectionPageJsonLd
        locale={locale}
        route={page.route}
        name={title}
        description={subtitle ?? title}
        items={itemNames}
      />
      {trail.length > 0 ? (
        <BreadcrumbJsonLd
          locale={locale}
          trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
        />
      ) : null}

      <PageHero
        title={title}
        description={subtitle ?? undefined}
        media={heroPhotoSlot(heroImage, locale)}
        breadcrumb={visible}
        breadcrumbLabel={t("breadcrumbLabel")}
      />
    </>
  );
};
