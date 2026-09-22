import { fetchPublic } from "@/lib/api/public-client";
import { findPublicPage } from "@/lib/pages/public-pages";
import type { ContactUsPage } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * The place the footer names, read from the contact page's record (owner
 * decision 2026-09-22): the label written under the map on that page, which
 * is where the footer's card leads. One source, so the two cannot drift, as
 * the footer's own constant (Abu Dhabi) had from the map (Dubai).
 *
 * The record is bilingual here, while the eight-part postal `address` holds
 * one language only; this is the pair that reads in both. `null` when the
 * record cannot be read: the footer then names no place rather than an old one.
 */
export const loadFooterPlace = async (
  locale: AppLocale,
): Promise<{ place: string | null; region: string | null }> => {
  const record = await fetchPublic<ContactUsPage>(findPublicPage("contact-us")!.apiPath);
  return {
    place: record?.map?.pinTitle?.[locale] ?? null,
    region: record?.map?.pinSubtitle?.[locale] ?? null,
  };
};
