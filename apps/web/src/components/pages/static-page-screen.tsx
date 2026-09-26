import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { fetchPublic } from "@/lib/api/public-client";
import { fetchPublicMedia } from "@/lib/api/media";
import type { HeroPage, LocalizedText, MediaAssetPublic } from "@/lib/api/types";
import { findPublicPage, type PublicPage } from "@/lib/pages/public-pages";
import { isServed } from "@/lib/pages/activation";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  AboutPageJsonLd,
  BreadcrumbJsonLd,
  CollectionPageJsonLd,
  ContactPageJsonLd,
} from "@/lib/seo/json-ld";
import { Breadcrumb, type Crumb } from "@/components/ui/breadcrumb";
import { PageHero } from "@/components/ui/page-hero";
import type { AppLocale } from "@/i18n/routing";

/**
 * The one implementation the twelve public listing pages share.
 *
 * Each route file is a thin adapter — Next.js needs a file per URL — and
 * everything they have in common lives here. The alternative was twelve
 * near-identical page components, which is exactly the shape that put the
 * same WCAG 2.4.7 failure into five copies of one search field on the
 * dashboard. One implementation, twelve callers.
 */

/** The IA hierarchy, as far as these twelve pages reach into it. A section
 *  with no landing page maps to `null` — IA §8.1 gives About and Media Centre
 *  children but neither parent is itself a destination. */
const SECTION_PARENT: Record<string, { messageKey: string; route: string | null }> = {
  about: { messageKey: "about", route: null },
  media: { messageKey: "media", route: null },
};

export async function loadStaticPage<T extends HeroPage = HeroPage>(
  key: string,
  locale: AppLocale,
): Promise<{
  page: PublicPage;
  record: T | null;
  title: string;
  subtitle: string | null;
  heroImage: MediaAssetPublic | undefined;
  /**
   * Whether this page is being served at all (ADR-0102 §D2).
   *
   * Resolved here rather than in each of the twelve routes for the reason the
   * rest of this module exists: twelve copies of one condition is twelve places
   * for one of them to be forgotten, and the one that was forgotten would be a
   * page still showing content the federation had switched off.
   *
   * Each route still has to act on it — a hook cannot return a component in
   * place of the caller's — but the reading is made once.
   */
  isActive: boolean;
}> {
  const page = findPublicPage(key);
  if (!page) throw new Error(`No public page registered for "${key}"`);

  const record = await fetchPublic<T>(page.apiPath);
  const t = await getTranslations({ locale, namespace: "Pages" });

  // Resolved here rather than in each of the eleven routes, because the hero
  // is the shared part of those pages and the image is now what decides its
  // height. `fetchPublicMedia` answers an empty map for an absent id without
  // making a request, so a page with no picture pays nothing for the lookup.
  const media = await fetchPublicMedia([record?.heroImageId]);

  return {
    page,
    record,
    isActive: isServed(record),
    heroImage: record?.heroImageId ? media.get(record.heroImageId) : undefined,
    // The record's own heading wins. Where the singleton has never been
    // saved — which is every one of the twelve on a fresh database — the
    // page still needs exactly one `<h1>` (Chapter 14 §2), and the name it
    // gets is the one the admin panel already uses for the same page rather
    // than a second name invented for the public side.
    title: text(record?.heroTitle, locale) ?? t(page.messageKey),
    subtitle: text(record?.heroSubtitle, locale),
  };
}

/** One half of a `LocalizedText`, or `null` for an absent record. Both halves
 *  are required upstream (`@MinLength(1)`), so a present record always has
 *  text — this only guards the record being absent entirely. */
export function text(value: LocalizedText | null | undefined, locale: AppLocale): string | null {
  return value ? value[locale] : null;
}

export async function buildStaticPageMetadata(
  key: string,
  locale: AppLocale,
  /** Chapter 14 §11: a page whose content the API cannot serve yet stays out
   *  of the index until it can. Passed in by the route because only the route
   *  knows whether its body rendered anything. */
  indexable: boolean,
): Promise<Metadata> {
  const { page, title, subtitle, isActive } = await loadStaticPage(key, locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return buildMetadata({
    locale,
    route: page.route,
    title: `${title} | ${t("title")}`,
    // §3 requires a description on every page. The record's subtitle is the
    // page's own summary and is the right one; the site description is the
    // fallback, not a generic string written for this purpose.
    description: subtitle ?? t("description"),
    // A withheld page shows a title and one status line, which Chapter 14 §11
    // puts below the threshold whatever the caller decided about its content.
    // `&&` rather than a second parameter: there is no page for which "switched
    // off but indexable" is a state worth expressing.
    indexable: indexable && isActive,
  });
}

export async function StaticPageScreen({
  pageKey,
  locale,
  title,
  subtitle,
  /** Names of the items the page is actually rendering, for the `ItemList` in
   *  §4's structured data. Chapter 14 §4 forbids describing content the page
   *  does not show, so this must come from what was rendered — never from
   *  what the page hopes to render later. */
  itemNames,
  contact,
  heroImage,
  children,
}: {
  pageKey: string;
  locale: AppLocale;
  title: string;
  subtitle: string | null;
  itemNames?: readonly string[];
  /** From `loadStaticPage`. Passed straight through: the hero decides its own
   *  height and colour treatment from whether this is present. */
  heroImage?: MediaAssetPublic;
  contact?: {
    email?: string;
    telephones?: readonly string[];
    address?: Record<string, string>;
  };
  children?: ReactNode;
}) {
  const page = findPublicPage(pageKey);
  if (!page) throw new Error(`No public page registered for "${pageKey}"`);

  const t = await getTranslations({ locale, namespace: "Pages" });
  const nav = await getTranslations({ locale, namespace: "Nav" });

  const trail = breadcrumbTrail(page, (key) => t(key), (key) => nav(key));
  const titleId = `page-title-${page.key}`;
  const description = subtitle ?? title;

  return (
    <>
      {page.schemaType === "CollectionPage" ? (
        <CollectionPageJsonLd
          locale={locale}
          route={page.route}
          name={title}
          description={description}
          items={itemNames}
        />
      ) : null}
      {page.schemaType === "AboutPage" ? (
        <AboutPageJsonLd
          locale={locale}
          route={page.route}
          name={title}
          description={description}
        />
      ) : null}
      {page.schemaType === "ContactPage" ? (
        <ContactPageJsonLd
          locale={locale}
          route={page.route}
          name={title}
          description={description}
          email={contact?.email}
          telephones={contact?.telephones}
          address={contact?.address}
        />
      ) : null}
      {/* Emitted wherever the page has a trail: beside the visible one elsewhere,
          and on its own on an institutional page (ADR-0072 D7). */}
      {trail.length > 0 ? (
        <BreadcrumbJsonLd
          locale={locale}
          trail={trail.filter((crumb): crumb is { name: string; route: string } => crumb.route !== null)}
        />
      ) : null}

      <PageHero
        register={page.register}
        title={title}
        subtitle={subtitle}
        titleId={titleId}
        heroImage={heroImage}
        locale={locale}
        breadcrumb={
          trail.length > 0 && !isInstitutional(page.route) ? (
            <Breadcrumb
              trail={trail}
              label={t("breadcrumbLabel")}
              // A photograph under the hero scrim is a dark ground whatever
              // the page's own register says, so the trail reads from the
              // black register there. Taking the page's register instead
              // would put `text-secondary` on a dark picture — the register
              // contrast guarantee is published per ground, not per page.
              register={heroImage ? "black" : page.register}
            />
          ) : null
        }
      />

      {children}
    </>
  );
}

/**
 * The institutional pages: About and every page under it. Their trail is not
 * shown in the hero (owner decision 2026-09-15, ADR-0072 D7): the site is
 * shallow and the header's About menu already carries the place. It stays in
 * the structured data. Deeper entity pages elsewhere keep a visible trail.
 */
export const isInstitutional = (route: string): boolean => route === "/about" || route.startsWith("/about/");

/** IA §8.5: mandatory from depth ≥ 2, so a top-level page gets none. */
export function breadcrumbTrail(
  page: Pick<PublicPage, "route" | "messageKey">,
  pageName: (key: string) => string,
  navName: (key: string) => string,
): Crumb[] {
  const segments = page.route.split("/").filter(Boolean);
  if (segments.length < 2) return [];

  const parent = SECTION_PARENT[segments[0]];
  return [
    { name: navName("home"), route: "/" },
    ...(parent ? [{ name: navName(parent.messageKey), route: parent.route }] : []),
    { name: pageName(page.messageKey), route: page.route },
  ];
}
