import { JsonLd } from "@/lib/seo/json-ld";
import { SITE_ORIGIN, absoluteUrl } from "@/lib/seo/metadata";
import { fetchPublic } from "@/lib/api/public-client";
import type { ContactUsPage } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The organisation itself, described on the page that is about it.
 *
 * ── Why here and not in the layout ────────────────────────────────────────
 *
 * Every page already points at `#organization` through `AboutPageJsonLd`'s
 * `about`, but nothing had ever emitted the node itself. This is the page that
 * can: the founding date, the two memberships and the address are the About
 * page's own subject, and asserting them from a layout would put them on
 * pages that do not show them — which Chapter 14 §4 forbids.
 *
 * ── Where the facts come from ─────────────────────────────────────────────
 *
 * The founding date is `1976-01-15`, the date of the Federation's own
 * proclamation, which the page states in two places. It is a constant here
 * rather than read from the record because it is a fact about the
 * organisation, not a field of the page: an editor rewriting the timeline's
 * wording must not be able to change what the site asserts the federation is.
 *
 * The address is read from the contact record, the same source the footer
 * uses, so the site never states two addresses. Absent or unreachable, the
 * `address` key is left out rather than emitted empty — a half-filled
 * `PostalAddress` is worse than none, because a consumer cannot tell a missing
 * part from a wrong one.
 */

/** The date of the Federation's proclamation. */
const FOUNDING_DATE = "1976-01-15";

/** The two bodies the Federation belongs to, both of which the page states. */
const MEMBER_OF = [
  { "@type": "SportsOrganization", name: "World Athletics", url: "https://worldathletics.org" },
  {
    "@type": "SportsOrganization",
    name: "Asian Athletics Association",
    url: "https://athleticsasia.org",
  },
] as const;

/** Only the parts the record actually holds. An empty object means no
 *  `address` key at all. */
const postalAddress = (record: ContactUsPage | null): Record<string, string> | null => {
  const address = record?.address;
  if (!address) {
    return null;
  }
  const parts: Record<string, string> = { "@type": "PostalAddress" };
  const street = [address.building, address.street, address.area].filter(Boolean).join(", ");
  if (street) parts.streetAddress = street;
  if (address.city) parts.addressLocality = address.city;
  if (address.emirate) parts.addressRegion = address.emirate;
  if (address.country) parts.addressCountry = address.country;
  if (address.postalCode) parts.postalCode = address.postalCode;
  if (address.poBox) parts.postOfficeBoxNumber = address.poBox;

  return Object.keys(parts).length > 1 ? parts : null;
};

export const AboutOrganizationJsonLd = async ({
  locale,
  name,
  description,
}: {
  locale: AppLocale;
  name: string;
  description: string;
}) => {
  const contact = await fetchPublic<ContactUsPage>("/contact-us-page");
  const address = postalAddress(contact);

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
        foundingDate: FOUNDING_DATE,
        memberOf: MEMBER_OF,
        ...(address ? { address } : {}),
        ...(contact?.email ? { email: contact.email } : {}),
        ...(contact?.socialLinks?.length
          ? { sameAs: contact.socialLinks.map((link) => link.url) }
          : {}),
      }}
    />
  );
};
