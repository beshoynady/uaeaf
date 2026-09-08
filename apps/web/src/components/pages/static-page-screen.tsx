import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { fetchPublic } from "@/lib/api/public-client";
import type { HeroPage, LocalizedText } from "@/lib/api/types";
import { findPublicPage, type PublicPage } from "@/lib/pages/public-pages";
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
): Promise<{ page: PublicPage; record: T | null; title: string; subtitle: string | null }> {
  const page = findPublicPage(key);
  if (!page) throw new Error(`No public page registered for "${key}"`);

  const record = await fetchPublic<T>(page.apiPath);
  const t = await getTranslations({ locale, namespace: "Pages" });

  return {
    page,
    record,
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
  const { page, title, subtitle } = await loadStaticPage(key, locale);
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return buildMetadata({
    locale,
    route: page.route,
    title: `${title} | ${t("title")}`,
    // §3 requires a description on every page. The record's subtitle is the
    // page's own summary and is the right one; the site description is the
    // fallback, not a generic string written for this purpose.
    description: subtitle ?? t("description"),
    indexable,
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
  children,
}: {
  pageKey: string;
  locale: AppLocale;
  title: string;
  subtitle: string | null;
  itemNames?: readonly string[];
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
      {/* Emitted only where the visible breadcrumb is — Chapter 14 §4. */}
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
        breadcrumb={
          trail.length > 0 ? (
            <Breadcrumb trail={trail} label={t("breadcrumbLabel")} register={page.register} />
          ) : null
        }
      />

      {children}
    </>
  );
}

/** IA §8.5: mandatory from depth ≥ 2, so a top-level page gets none. */
export function breadcrumbTrail(
  page: PublicPage,
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
