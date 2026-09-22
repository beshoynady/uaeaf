import { fetchPublic } from "@/lib/api/public-client";
import { fetchPublicMedia } from "@/lib/api/media";
import { findPublicPage } from "@/lib/pages/public-pages";
import type { ContactSocialLink, ContactUsPage, LocalizedText, MediaAssetPublic, SiteSettingsFooterPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * Everything the footer shows that an editor controls (ADR-0092).
 *
 * The contact page's record is the one source for the place, the map, the
 * email, the office hours and the channels (owner decision 2026-09-22): the
 * footer keeps no copy of any of them, so the two cannot drift, as the
 * footer's remembered address and hours had. The site settings hold only the
 * footer's own words — the description, the copyright line, the headings.
 *
 * `null` wherever a record cannot be read. The footer then leaves a contact
 * fact out rather than showing a remembered one, and shows its built-in text
 * for its own words.
 */
export interface FooterContent {
  place: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  directionsUrl: string | null;
  email: string | null;
  officeHours: string | null;
  channels: readonly ContactSocialLink[];
  /** The published images the channels' `iconId`s resolved to, by id. */
  icons: ReadonlyMap<string, MediaAssetPublic>;
  aboutBlurb: string | null;
  copyright: string | null;
  headings: { quickLinks: string | null; location: string | null; contact: string | null };
}

const inLocale = (value: LocalizedText | null | undefined, locale: AppLocale) => value?.[locale] ?? null;

const coordinate = (value: unknown) => (typeof value === "number" ? value : null);

export const loadFooterContent = async (locale: AppLocale): Promise<FooterContent> => {
  // Read together: the layout waits on both, so one after the other would be
  // two round trips on every page.
  const [contact, settings] = await Promise.all([
    fetchPublic<ContactUsPage>(findPublicPage("contact-us")!.apiPath),
    fetchPublic<SiteSettingsFooterPublic>("/site-settings/public"),
  ]);
  const channels = contact?.socialLinks ?? [];

  return {
    place: inLocale(contact?.map?.pinTitle, locale),
    region: inLocale(contact?.map?.pinSubtitle, locale),
    latitude: coordinate(contact?.map?.latitude),
    longitude: coordinate(contact?.map?.longitude),
    directionsUrl: contact?.map?.directionsUrl ?? null,
    email: contact?.email ?? null,
    officeHours: inLocale(contact?.officeHours, locale),
    channels,
    // No request at all when no channel carries an icon.
    icons: await fetchPublicMedia(channels.map((link) => link.iconId)),
    aboutBlurb: inLocale(settings?.footerAboutBlurb, locale),
    copyright: inLocale(settings?.copyrightText, locale),
    headings: {
      quickLinks: inLocale(settings?.footerHeadings?.quickLinks, locale),
      location: inLocale(settings?.footerHeadings?.location, locale),
      contact: inLocale(settings?.footerHeadings?.contact, locale),
    },
  };
};
