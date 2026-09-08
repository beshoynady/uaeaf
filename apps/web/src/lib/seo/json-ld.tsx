import type { AppLocale } from "@/i18n/routing";
import { absoluteUrl, SITE_ORIGIN } from "./metadata";

/**
 * Structured data, Chapter 14 §4.
 *
 * The chapter's constraint is the one that shapes this file: structured data
 * "MUST NOT describe information that is not visibly represented in the
 * corresponding page content". So there is no generic "emit a nice-looking
 * graph" helper here. Each builder takes only values the page is actually
 * rendering, and a page with nothing to describe emits nothing — which is why
 * `CollectionPage` carries an `ItemList` only when items exist.
 */

/** `<script type="application/ld+json">`. React escapes `<` and `&` inside a
 *  string child, which corrupts JSON, so the payload goes through
 *  `dangerouslySetInnerHTML` — the standard approach, and safe here because
 *  every value originates in our own API rather than in user input. `<` is
 *  still escaped to `<` so a string value can never close the tag. */
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * The federation itself.
 *
 * Chapter 14 §4 maps Club → `SportsOrganization`; the federation is the
 * governing body of the same kind, so it takes the same type. Emitted once,
 * from the root layout, because the organisation is a site-wide fact rather
 * than a page-level one.
 *
 * Every value below is visible somewhere on every page: the name and the
 * logo are in the header, the address and social profiles are in the footer.
 * Nothing here is asserted that a reader cannot see.
 */
export function OrganizationJsonLd({
  locale,
  name,
  description,
  socialUrls,
}: {
  locale: AppLocale;
  name: string;
  description: string;
  socialUrls: readonly string[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SportsOrganization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name,
        description,
        sport: "Athletics",
        url: absoluteUrl(locale, "/"),
        logo: `${SITE_ORIGIN}/brand/uaeaf-logo.svg`,
        sameAs: socialUrls,
      }}
    />
  );
}

/**
 * A listing page.
 *
 * `ItemList` is attached only when the page renders items. Nine of the twelve
 * listing pages have no public list endpoint upstream, so they show a hero
 * and nothing else; claiming a collection there would describe content that
 * is not on the page, which §4 forbids and which search engines penalise.
 */
export function CollectionPageJsonLd({
  locale,
  route,
  name,
  description,
  items,
}: {
  locale: AppLocale;
  route: string;
  name: string;
  description: string;
  /** Names in the order they are rendered. Empty means no `ItemList`. */
  items?: readonly string[];
}) {
  const url = absoluteUrl(locale, route);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        description,
        url,
        inLanguage: locale,
        isPartOf: { "@id": `${SITE_ORIGIN}/#organization` },
        ...(items && items.length > 0
          ? {
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: items.length,
                itemListElement: items.map((item, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: item,
                })),
              },
            }
          : {}),
      }}
    />
  );
}

export function AboutPageJsonLd({
  locale,
  route,
  name,
  description,
}: {
  locale: AppLocale;
  route: string;
  name: string;
  description: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name,
        description,
        url: absoluteUrl(locale, route),
        inLanguage: locale,
        about: { "@id": `${SITE_ORIGIN}/#organization` },
      }}
    />
  );
}

/**
 * The contact page.
 *
 * The only one of the twelve whose API record carries enough to describe
 * — email, telephone, postal address and opening hours are all rendered on
 * the page, so all four may be asserted. Anything absent from the record is
 * absent here too rather than being emitted empty.
 */
export function ContactPageJsonLd({
  locale,
  route,
  name,
  description,
  email,
  telephones,
  address,
}: {
  locale: AppLocale;
  route: string;
  name: string;
  description: string;
  email?: string;
  telephones?: readonly string[];
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postOfficeBoxNumber?: string;
    postalCode?: string;
    addressCountry?: string;
  };
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name,
        description,
        url: absoluteUrl(locale, route),
        inLanguage: locale,
        mainEntity: {
          "@id": `${SITE_ORIGIN}/#organization`,
          "@type": "SportsOrganization",
          ...(email ? { email } : {}),
          ...(telephones && telephones.length > 0 ? { telephone: telephones } : {}),
          ...(address && Object.keys(address).length > 0
            ? { address: { "@type": "PostalAddress", ...address } }
            : {}),
        },
      }}
    />
  );
}

/**
 * Breadcrumbs.
 *
 * IA §8.5 makes a breadcrumb mandatory from depth ≥ 2, and Chapter 14 §1
 * notes that the same hierarchy generates it. Emitted only where the visible
 * breadcrumb is rendered — §4's rule again.
 */
export function BreadcrumbJsonLd({
  locale,
  trail,
}: {
  locale: AppLocale;
  trail: readonly { name: string; route: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: absoluteUrl(locale, crumb.route),
        })),
      }}
    />
  );
}
